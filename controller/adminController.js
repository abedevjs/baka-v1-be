const Bagasi = require("./../model/bagasiModel");
const Order = require("./../model/orderModel");
const User = require("./../model/userModel");
const UserAuth = require("./../model/userAuthModel");

const catchAsync = require("./../utility/catchAsync");
const AppError = require("./../utility/appError");

// const calculate = async (bagasiOrderArr, orderModel, orderField) => {

//     let valueArr = [];
//     let valueTotal = 0;
//     const bagOrderIds = Object.values(bagasiOrderArr).map(id => id);// '4f5sa', '87f5f'

//     await Promise.all(bagOrderIds.map(async (el) => {
//         let field = orderField
//         const val = (await orderModel.findById(el)).field;
//         valueArr.push(val);

//     }));

//     valueTotal = jumlah.reduce((acc, el) => acc + el, 0);

//     return valueTotal
// }

exports.updateBagasiStatus = catchAsync(async (req, res, next) => {
  //todo 1. Check Bagasi
  const bagasiID = await Bagasi.findById(req.params.id);
  if (!bagasiID)
    return next(new AppError("Bagasi yang Admin minta tidak tersedia 😢", 404));

  //todo 2. Pastikan dulu Bagasi.status yg mw di update 'Scheduled'. Krn status yg lain ('Closed' dan 'Canceled sdh di handle nodeScheduler)?

  if (bagasiID.status !== "Scheduled") {
    return next(
      new AppError(
        `Tidak bs update bagasi status. Krn status bagasi yg skrg adalah ${bagasiID.status}`,
        400
      )
    );
  }

  //todo 3. Jika Bagasi tdk ada dokumen, berarti dokumen yang di upload User tersimpan di User.dokumen (upload dokumen tanpa bagasiID). Memindahkan secara manual nama dokumen dari User.dokumen ke Bagasi.dokumen dengan cara copy paste nama dokumen ke req.body.dokumen
  const ownerID = bagasiID.owner._id;
  const currentOwner = await UserAuth.findById(ownerID);
  const mergedArr = currentOwner.bagasi.concat(currentOwner.order);

  //*cek jika bagasi.dokumen = empty DAN user.bagasi dan user.order = tdk empty.
  if (!bagasiID.dokumen && !!mergedArr) {
    //* Cek jika nama dokumen berbeda / Admin salah copas
    // if (req.body.dokumen != currentOwner.dokumen)
    if (!currentOwner.dokumen.includes(req.body.dokumen))
      //req.body.dokumen != currentOwner.dokumen
      return next(
        new AppError(
          "Nama dokumennya beda! req.body.dokumen != currentOwner.dokumen",
          401
        )
      );

    //* Renaming Bagasi.dokumen dari req.body.dokumen (Admin yang isi manual)
    const updateBagasiDokumen = await Bagasi.findByIdAndUpdate(
      bagasiID,
      {
        dokumen: req.body.dokumen,
      },
      {
        new: true,
        runValidators: true,
      }
    );
    if (!updateBagasiDokumen)
      return next(
        new AppError("Kesalahan dalam mengupdate Bagasi.dokumen 😀", 401)
      );

    //* Delete nama dokumen dari User.dokumen array
    const updateUserDokumen = await UserAuth.findByIdAndUpdate(
      ownerID,
      {
        $pull: {
          dokumen: {
            $in: [req.body.dokumen],
          },
        },
      },
      {
        new: true,
        runValidators: true,
      }
    );
    if (!updateUserDokumen)
      return next(
        new AppError("Kesalahan dalam menghapus User.dokumen array 😢", 401)
      );
  }

  //todo 4. Update Bagasi.status
  const updateBagasiStatusDanPesawat = await Bagasi.findByIdAndUpdate(
    bagasiID,
    {
      status: req.body.status,
      pesawat: req.body.pesawat,
    },
    {
      new: true,
      runValidators: true,
    }
  );
  if (!updateBagasiStatusDanPesawat)
    return next(new AppError("Update status bagasi gagal", 400));

  res.status(200).json({
    status: "Success",
    message:
      "Dokumen penerbangan telah di verifikasi. Bagasi sudah bisa di order",
    statusBagasi: updateBagasiStatusDanPesawat.status,
    pesawatBagasi: updateBagasiStatusDanPesawat.pesawat,
  });
});

exports.activateOrder = catchAsync(async (req, res, next) => {
  //todo 1. Check Order
  const order = await Order.findById(req.params.id);
  if (!order)
    return next(new AppError("Order yang Admin minta tidak tersedia 😢", 404));

  //todo 2. Check Bagasi
  const bagasiID = order.bagasi._id;
  if (!bagasiID)
    return next(
      new AppError("BagasiID yang Admin minta tidak tersedia 😢", 404)
    );

  //todo 3. Check Status. Only executed if Order.status = 'Preparing'. To prevent double calculation in Bagasi data.
  if (order.status !== "Preparing")
    return next(
      new AppError(
        "Order.status must be: Preparing, pak Admin!. Order ini sudah pernah di activate 🙂",
        401
      )
    );

  //todo 4. Check no duplicate orderID in Bagasi.order array
  const bagasiOrderArray = await Bagasi.findById(bagasiID);
  if (bagasiOrderArray.order.includes(req.params.id)) {
    await Bagasi.findByIdAndUpdate(
      bagasiID,
      {
        $pull: {
          order: req.params.id,
        },
      },
      {
        new: true,
        runValidators: true,
      }
    );
  }

  //todo 5. Insert orderID ke Bagasi.order
  const currentBagasi = await Bagasi.findByIdAndUpdate(
    bagasiID,
    {
      $push: {
        order: req.params.id,
      },
    },
    {
      new: true,
      runValidators: true,
    }
  );

  //todo 6. Calculate Kg and Rp di Bagasi.order.id (loop)
  const bagasiOrderIds = Object.values(currentBagasi.order).map((id) => id); // '4f5sa', '87f5f'

  //todo 6a. Calculate Kg in Bagasi.availableKg
  let jumlahKgArray = [];
  await Promise.all(
    bagasiOrderIds.map(async (el) => {
      const value = (await Order.findById(el)).jumlahKg;
      jumlahKgArray.push(value);
    })
  );
  const totalJumlahKg = jumlahKgArray.reduce((acc, el) => acc + el, 0);

  //todo 6b. Calculate Rp in Bagasi.balanceRp
  let biayaRpArray = [];
  await Promise.all(
    bagasiOrderIds.map(async (el) => {
      const value = (await Order.findById(el)).biayaRp;
      biayaRpArray.push(value);
    })
  );
  const totalBiayaRp = biayaRpArray.reduce((acc, el) => acc + el, 0);

  //todo 7. Update the newly Kg to Bagasi
  const updatedKgBagasi = await Bagasi.findByIdAndUpdate(
    bagasiID,
    {
      availableKg: currentBagasi.initialKg - totalJumlahKg,
      bookedKg: totalJumlahKg,
      balanceRp: totalBiayaRp,
    },
    {
      new: true,
      runValidators: true,
    }
  );

  //todo 8. Calculate Rp in Bagasi.adminFeeRp (balanceRp * tax)
  const totalAdminFeeRp = updatedKgBagasi.balanceRp * process.env.BAGASI_TAX;

  //todo 9. Calculate Rp in Bagasi.netRp (totalBalanceRp - totalAdminFeeRp)
  const totalNetRp = updatedKgBagasi.balanceRp - totalAdminFeeRp;

  // console.log(`🫠, totalBalanceRp: ${updatedKgBagasi.balanceRp}, totalAdminFeeRp: ${totalAdminFeeRp}, totalNetRp: ${totalNetRp}`);

  //todo 10. Update the newly Rp to Bagasi
  const updatedRpBagasi = await Bagasi.findByIdAndUpdate(
    bagasiID,
    {
      adminFeeRp: totalAdminFeeRp,
      netRp: totalNetRp,
    },
    {
      new: true,
      runValidators: true,
    }
  );

  //todo 12. Check and Update updatedKgBagasi.active to Bagasi
  if (updatedKgBagasi.availableKg == 0) {
    const updateBagasiStatus = await Bagasi.findByIdAndUpdate(
      bagasiID,
      { status: "Closed" },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!updateBagasiStatus)
      return next(
        new AppError("Kesalahan dalam mengupdate status Bagasi", 500)
      );
  }

  //todo 3. Jika Bagasi tdk ada dokumen. Memindahkan secara manual nama dokumen dari User.dokumen ke Bagasi.dokumen dengan cara copy paste nama dokumen ke req.body.dokumen
  const ownerID = order.owner._id;
  const currentOwner = await UserAuth.findById(ownerID);
  const mergedArr = currentOwner.bagasi.concat(currentOwner.order);

  //*cek jika bagasi.dokumen = empty DAN user.bagasi dan user.order = tdk empty. Klo tidak masuk blok if-else ini, berarti user uploadDocs di url yg ada id nya. Makanya dy langsung tersimpan di order.dokumen bukan di user.dokumen.
  if (!order.dokumen && !!mergedArr) {
    //* Cek jika nama dokumen berbeda / Admin salah copas
    if (!currentOwner.dokumen.includes(req.body.dokumen))
      //req.body.dokumen != currentOwner.dokumen
      return next(
        new AppError(
          "Nama dokumennya beda! req.body.dokumen != currentOwner.dokumen",
          401
        )
      );

    //* Renaming Order.dokumen dari req.body.dokumen (Admin yang isi manual)
    const updateOrderDokumen = await Order.findByIdAndUpdate(
      order,
      {
        dokumen: req.body.dokumen,
      },
      {
        new: true,
        runValidators: true,
      }
    );
    if (!updateOrderDokumen)
      return next(
        new AppError("Kesalahan dalam mengupdate Bagasi.dokumen 😀", 401)
      );

    //* Delete nama dokumen dari User.dokumen array
    const updateUserDokumen = await UserAuth.findByIdAndUpdate(
      ownerID,
      {
        $pull: {
          dokumen: {
            $in: [req.body.dokumen],
          },
        },
      },
      {
        new: true,
        runValidators: true,
      }
    );
    if (!updateUserDokumen)
      return next(
        new AppError("Kesalahan dalam menghapus User.dokumen array 😢", 401)
      );
  }

  //todo 9. Update Order.status
  const updateOrderStatus = await Order.findByIdAndUpdate(
    order,
    {
      status: req.body.status,
    },
    {
      new: true,
      runValidators: true,
    }
  );
  if (!updatedKgBagasi || !updatedRpBagasi || !updateOrderStatus)
    return next(
      new AppError("Update Bagasi tidak berhasil pak Admin! 😢", 404)
    );

  res.status(200).json({
    status: "Success",
    message: "Pembayaran valid. Order berhasil di aktifkan",
    updatedAvailableKgBagasi: updatedKgBagasi.availableKg,
    updateOrderStatus: updateOrderStatus.status,
  });
});
