const Order = require("./../model/orderModel");
const User = require("./../model/userModel");
const Bagasi = require("./../model/bagasiModel");
const catchAsync = require("./../utility/catchAsync");
const AppError = require("./../utility/appError");
const multerUpload = require("../utility/multer");

exports.uploadMiddleware = multerUpload.single("dokumen");

exports.getAllOrder = catchAsync(async (req, res, next) => {
  let query = Order.find();

  if (req.query) query = Order.find(req.query);
  if (req.query.sort) query = query.sort(req.query.sort);
  if (req.query.fields) query = query.select(req.query.fields);
  if (req.query.page) {
    const page = req.query.page * 1 || 1;
    const limit = req.query.limit * 1 || 100;
    const skip = (page - 1) * limit;
    query = query.skip(skip).limit(limit);
  }

  const order = await query;

  if (!order)
    return next(
      new AppError("Hasil pencarian order Kakak tidak tersedia 😢", 404)
    );

  res.status(200).json({
    status: "done",
    result: order.length,
    data: {
      order,
    },
  });
});

exports.getOneOrder = catchAsync(async (req, res, next) => {
  const order = await Order.findById(req.params.id);

  if (!order)
    return next(new AppError("Order yang Kakak minta tidak tersedia 😢", 404));

  res.status(200).json({
    status: "done",
    result: order.length,
    data: {
      order,
    },
  });
});

exports.createOrder = catchAsync(async (req, res, next) => {
  //* www.nama.com/bagasi/:bagasiId/order

  //todo 2. Cek if the bagasi still exists
  const bagId = await Bagasi.findById(req.params.bagasiId);
  if (!bagId)
    return next(
      new AppError("Bagasi yang ingin Kakak order tidak tersedia 😢", 404)
    );

  //todo 3. Cek owner bagasi tidak boleh order bagasi sendiri
  if (bagId.owner._id.toString() === req.user.id)
    return next(
      new AppError("Kakak tidak boleh membeli bagasi sendiri 😢", 403)
    );

  //todo 3. Cek Bagasi.status. Hanya boleh order jika status bagasi sudah di verifikasi Admin (status: 'Opened')
  if (bagId.status != "Opened")
    return next(
      new AppError("Bagasi ini masih dalam tahap verifikasi kak 😢", 403)
    );

  //todo 4. Cek user tdk punya lebih dari 10 aktif order di bagasi yang berbeda2.
  if (req.user.order.length >= process.env.MAX_ORDER)
    return next(
      new AppError("Kakak hanya boleh memiliki 10 order aktif 😢", 403)
    );

  //todo 5.PREVENTING USER TO ORDER THE SAME BAGASI TWICE. IN THE FUTURE, THIS COULD BE LIMITED TO 2-3 ORDERS PER 1 BAGASI
  //todo 5.User could create multiple Order on same Bagasi, if all these orders on the same Bagasi are paid (status: Ready)
  if (req.user.orderBagasiId.includes(req.params.bagasiId)) {
    //* Cek Brp bnyak order di bagasi yg sama.
    const count = req.user.orderBagasiId.filter(
      (el) => el == req.params.bagasiId
    );

    //* Check if all those orders are paid (status: Ready)
    const check = req.user.order.filter((el) => bagId.order.includes(el));

    if (count.length != check.length)
      return next(
        new AppError(
          "Kakak sudah memesan bagasi ini, ingin mengupdate pesanan kak? 😃",
          403
        )
      );
  }

  //todo 6. Cek if bagasi is overloaded, request denied
  if (bagId.availableKg < req.body.jumlahKg)
    return next(
      new AppError(
        "Bagasi yang Kakak pesan telah memenuhi kapasitas 😢, koreksi jumlah pesanan nya ya Kak",
        401
      )
    );

  //todo 7. If User does not have telpon and he wont update (karena di model UserAuth telpon initially 0), return error.
  const user = await User.findById(req.user.id);

  if (!user.telpon) {
    const addTelponToUser = await User.findByIdAndUpdate(
      user,
      {
        telpon: req.body.telpon,
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!addTelponToUser.telpon)
      return next(
        new AppError(
          "Sertakan nomor WhatsApp kak, agar mudah dihubungi 😢",
          400
        )
      );
    if (!addTelponToUser)
      return next(
        new AppError("Kesalahan dalam menambahkan nomor telpon Kakak 😢", 400)
      );
  }

  //todo 9. Calculate Rp. biayaRp (jumlahKg * Bagasi.harga) , adminFeeRp (biayaRp * tax) , netRp (biayaRp + adminFeeRp)
  const totalBiayaRp = Number(req.body.jumlahKg) * bagId.hargaRp;
  const totalAdminFeeRp = totalBiayaRp * process.env.ORDER_TAX;
  const totalNetRp = totalBiayaRp + totalAdminFeeRp;
  // console.log(`🫠, totalBiayaRp: ${totalBiayaRp}, totalAdminFeeRp: ${totalAdminFeeRp}, totalNetRp: ${totalNetRp}`);

  //todo 10. Jika semua kondisi diatas terpenuhi, create order
  const order = await Order.create({
    jumlahKg: req.body.jumlahKg,
    isi: req.body.isi,
    biayaRp: totalBiayaRp,
    adminFeeRp: totalAdminFeeRp,
    netRp: totalNetRp,
    catatan: req.body.catatan,
    owner: await User.findById(req.user.id), //* Embedding
    bagasi: { _id: req.params.bagasiId }, //* Referencing
    // bagasi: await Bagasi.findById(bagId), //* Embedding
  });

  if (!order) return next(new AppError("Kesalahan dalam membuat order", 400));

  res.status(201).json({
    status: "Success",
    message: "Order berhasil dibuat. User mohon upload bukti pembayaran",
    requestedAt: req.time,
    data: {
      order,
    },
  });
});

exports.updateOrder = catchAsync(async (req, res, next) => {
  //* {{URL}}/order/634a9ae426fc2de08774ae4a

  //todo 2. Check if Order is exist
  const order = await Order.findById(req.params.id);
  if (!order)
    return next(new AppError("Order yang Kakak minta tidak tersedia 😢", 404));

  //todo 3. Check if Bagasi is exist
  const bagasi = order.bagasi;
  const currentBagasi = await Bagasi.findById(bagasi._id);
  if (!currentBagasi)
    return next(new AppError("Bagasi yang kakak minta tidak tersedia 😢", 404));

  //todo 4. Check if User is owner
  if (order.owner._id.toString() !== req.user.id)
    return next(
      new AppError(
        "Kakak bukan pemilik order ini 😢. Akses di tolak ya Kak",
        401
      )
    );

  //todo 5. Check Order.status. Hanya boleh update jika order blm dibayar (status: 'Preparing')
  // 'Preparing' yes edit yes delete. 'Ready' no edit no delete. 'Delivered' no edit yes delete
  if (order.status !== "Preparing")
    return next(
      new AppError(
        "Order kakak sudah terbayar. Jika ingin mengupdate, silahkan buat order baru lagi 🙂",
        401
      )
    );

  //todo 6. Cek if bagasi is overloaded, request denied
  // console.log(((order.jumlahKg + Number(req.body.jumlahKg)) > currentBagasi.availableKg));//* Jika (oldOrderKg + newOrderKg) > Bagasi.availableKg
  // console.log((Number(req.body.jumlahKg) > (order.jumlahKg + currentBagasi.availableKg)));//* Jika newOrderKg > (oldOrderKg + Bagasi.availableKg)
  // console.log(Number(req.body.jumlahKg) > currentBagasi.availableKg);
  if (Number(req.body.jumlahKg) > currentBagasi.availableKg)
    return next(
      new AppError(
        "Bagasi yang Kakak pesan telah melebih kapasitas 😢, koreksi lagi jumlah pesanan nya ya Kak",
        401
      )
    );
  // if (((order.jumlahKg + Number(req.body.jumlahKg)) > currentBagasi.availableKg) && (Number(req.body.jumlahKg) > (order.jumlahKg + currentBagasi.availableKg))) return next(new AppError('Bagasi yang Kakak pesan telah melebih kapasitas 😢, koreksi lagi jumlah pesanan nya ya Kak', 401))

  //todo 8. Calculate Rp. biayaRp (jumlahKg * Bagasi.harga) , adminFeeRp (biayaRp * tax) , netRp (biayaRp + adminFeeRp)
  const totalBiayaRp = Number(req.body.jumlahKg) * currentBagasi.hargaRp;
  const totalAdminFeeRp = totalBiayaRp * process.env.ORDER_TAX;
  const totalNetRp = totalBiayaRp + totalAdminFeeRp;
  // console.log(`🫠, totalBiayaRp: ${totalBiayaRp}, totalAdminFeeRp: ${totalAdminFeeRp}, totalNetRp: ${totalNetRp}`);

  //todo 9. Update Order
  const updatedOrder = await Order.findByIdAndUpdate(
    order,
    {
      jumlahKg: req.body.jumlahKg,
      isi: req.body.isi,
      biayaRp: totalBiayaRp,
      adminFeeRp: totalAdminFeeRp,
      netRp: totalNetRp,
      catatan: req.body.catatan,
    },
    {
      new: true,
      runValidators: true,
    }
  );

  if (!updatedOrder)
    return next(new AppError("Kesalahan dalam memperbaharui order", 400));

  res.status(200).json({
    status: "Success",
    message: "Order berhasil di update. User mohon upload bukti pembayaran",
    requestedAt: req.time,
    data: {
      updatedOrder,
    },
  });
});

exports.deleteOrder = catchAsync(async (req, res, next) => {
  //* {{URL}}/order/634d1e13fc881dd5c6208968

  //todo 1. Check Order Id
  const order = await Order.findById(req.params.id);
  if (!order)
    return next(new AppError("Order yang Kakak minta tidak ditemukan 😢", 404));

  //todo 2. check if user is the owner
  if (order.owner._id.toString() !== req.user.id)
    return next(
      new AppError(
        "Kakak bukan pemesan/pembeli order ini 😢. Akses di tolak ya Kak",
        401
      )
    );

  //todo 3. Check Order.status. Hanya boleh delete jika order blm dibayar (status: 'Preparing')
  // 'Preparing' yes edit yes delete. 'Ready' no edit no delete. 'Delivered' no edit yes delete
  if (order.status !== "Preparing")
    return next(
      new AppError(
        "Order kakak sudah Ready. Order tidak dapat dihapus atau dibatalkan, kecuali jika Traveler membatalkan keberangkatan 🙂",
        401
      )
    );

  //todo 4. update jumlahKg bagasi di Bagasi dan hapus order dari Bagasi.order[id].
  //* Reason this code is deleted: orderID yg masuk di Bagasi.order[arr] hanyalah Order yg sdh 'Ready', jika blm, orderID tsb tdk ada.
  // const bagasiId = order.bagasi._id;
  // const bagasi = await Bagasi.findById(bagasiId)
  // const bagasiOrder = await Bagasi.updateOne(bagasi, { //*hapus order dari Bagasi.order[id]
  //     $pull: {
  //         order: {
  //             $in: [req.params.id]
  //         }
  //     }
  // });

  //todo 4. Check how many IDs of same bagasi on user.orderBagasiId, if has more than one, delete it, and add it back to user.orderBagasiId (step 6)
  const user = await User.findById(req.user.id);
  const sameIDs = user.orderBagasiId.filter((el) => el == order.bagasi._id);

  //todo 5. hapus order dari User.order[id] dan Hapus bagasiId dari User.orderBagasiId[id]
  const userOrder = await User.findByIdAndUpdate(
    user,
    {
      $pull: {
        order: {
          $in: [req.params.id],
        },
        orderBagasiId: {
          //* Disini mongodb delete semua id yg sm :(
          $in: [order.bagasi._id],
        },
      },
    },
    {
      new: true,
      runValidators: true,
    }
  );

  //todo 6. add it back. Ini semua dilakukan karena mongodb blm ada cara utk hnya mendelete 1 element dlm array
  if (sameIDs.length > 1) {
    sameIDs.pop();
    const id = [...sameIDs];

    const sameIDsBack = await User.findByIdAndUpdate(
      user,
      {
        $push: {
          orderBagasiId: { $each: [...id] }, //* This is how we push multiple elements to an array in mongodb
        },
      },
      {
        new: true,
        runValidators: true,
      }
    );
    if (!sameIDsBack)
      return next(new AppError("Add sameIDs back is error", 401));
  }

  //todo 7. Update Order dari Order collection ke active: false (liat Document Middleware di Order Model)
  //* Bnyak line code dibwh krn wktu itu sy ingin cari pre document middleware yg available sesuai dgn method.
  // const deleteOrder = await Order.findByIdAndDelete(req.params.id);
  // const deleteOrder = await Order.findOneAndUpdate(req.params.id);
  // const deleteOrder = await Order.deleteOne({ _id: req.params.id });
  // const deleteOrder = await Order.updateOne(order, { active: false });//* Line ini dipake jika kita ingin aktifkan pre document middleware di Order Model
  const deleteOrder = await Order.findByIdAndUpdate(
    req.params.id,
    { active: false },
    {
      new: true,
      runValidators: true,
    }
  );

  if (!userOrder || !deleteOrder)
    return next(new AppError("Kesalahan dalam menghapus order", 400));

  res.status(200).json({
    status: "Success",
    message: "Order berhasil di hapus",
    active: deleteOrder.active,
  });
});

exports.deliveredOrder = catchAsync(async (req, res, next) => {
  console.log(req.isAuthenticated());

  // if (!req.isAuthenticated()) return next(new AppError("talaso", 403));
  console.log("Allah");

  res.status(200).json({
    status: "Success",
    message: "Order Delivered",
    requestedAt: req.time,
    // data: {
    //   updatedOrder,
    // },
  });
});
