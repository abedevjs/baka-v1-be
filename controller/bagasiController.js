const Bagasi = require("./../model/bagasiModel");
const User = require("./../model/userModel");
const UserAuth = require("./../model/userAuthModel");
const catchAsync = require("./../utility/catchAsync");
const AppError = require("./../utility/appError");

exports.getAllBagasi = catchAsync(async (req, res, next) => {
  let query = Bagasi.find();

  if (req.query) query = Bagasi.find(req.query);
  if (req.query.sort) query = query.sort(req.query.sort);
  if (req.query.fields) query = query.select(req.query.fields);
  if (req.query.page) {
    const page = req.query.page * 1 || 1;
    const limit = req.query.limit * 1 || 100;
    const skip = (page - 1) * limit;
    query = query.skip(skip).limit(limit);
  }

  const bagasi = await query;

  if (!bagasi)
    return next(new AppError("Hasil pencarian bagasi tidak tersedia", 404));

  res.status(200).json({
    status: "done",
    result: bagasi.length,
    data: {
      bagasi,
    },
  });
});

exports.getOneBagasi = catchAsync(async (req, res, next) => {
  const bagasi = await Bagasi.findById(req.params.id).populate({
    path: "order",
    select: "-tanggalDibuat -isi -biayaRp -owner -bagasi -__v",
  });

  if (!bagasi)
    return next(new AppError("Bagasi yang Kakak minta tidak tersedia 😢", 404));

  res.status(200).json({
    status: "done",
    data: {
      bagasi,
    },
  });
});

exports.createBagasi = catchAsync(async (req, res, next) => {
  // console.log(req.user);
  //todo 2. Preventing create more than 3 bagasi
  if (req.user.bagasi.length >= process.env.MAX_BAGASI_ACTIVE)
    return next(
      new AppError(
        `Kakak hanya boleh memiliki maks. ${process.env.MAX_BAGASI_ACTIVE} bagasi aktif. Mohon hapus dulu bagasi yang lain 🙏.`,
        403
      )
    );

  //todo 3. If User does not have telpon and he wont update (karena di model UserAuth telpon initially 0), return error. --start
  //* Code lines dibawah ini sudah dihapus karena calling update user.telpon sudah di handle di front end
  // const user = await UserAuth.findById(req.user.id);

  // if (!user.telpon) {
  //   const addTelponToUser = await UserAuth.findByIdAndUpdate(
  //     user,
  //     {
  //       telpon: req.body.telpon,
  //     },
  //     {
  //       new: true,
  //       runValidators: true,
  //     }
  //   );

  //   if (!addTelponToUser.telpon)
  //     return next(
  //       new AppError(
  //         "Sertakan nomor WhatsApp kak, agar mudah dihubungi 😢",
  //         400
  //       )
  //     );
  //   if (!addTelponToUser)
  //     return next(
  //       new AppError("Kesalahan dalam menambahkan nomor telpon Kakak 😢", 400)
  //     );
  // }
  //todo 3. If User does not have telpon and he wont update (karena di model UserAuth telpon initially 0), return error. --end

  //todo 5. If all those conditions above is fulfilled, create new Bagasi.
  const bagasi = await Bagasi.create({
    dari: req.body.dari,
    tujuan: req.body.tujuan,
    waktuBerangkat: req.body.waktuBerangkat,
    waktuTiba: req.body.waktuTiba,
    availableKg: req.body.availableKg,
    hargaRp: req.body.hargaRp,
    catatan: req.body.catatan,
    owner: await UserAuth.findById(req.user.id),
  });

  if (!bagasi)
    return next(
      new AppError("Terjadi kesalahan dalam mendaftarkan bagasi Kakak 😢", 400)
    );

  res.status(201).json({
    status: "Success",
    message:
      "Bagasi berhasil dibuat. Selanjutnya, User upload dokumen keberangkatan.",
    data: {
      bagasi,
    },
  });
});

exports.updateBagasi = catchAsync(async (req, res, next) => {
  //todo 2. Check Bagasi
  const bagasi = await Bagasi.findById(req.params.id);
  if (!bagasi)
    return next(new AppError("Bagasi yang kakak minta tidak tersedia 😢", 404));

  //todo 3. Check Owner.
  if (bagasi.owner._id.toString() !== req.user.id)
    return next(
      new AppError(
        "Kakak bukan pemilik bagasi ini 🙁. Akses di tolak ya Kak",
        401
      )
    );

  //todo 4. Check if the updatedKg is bigger than process.env.MAX_BAGASI_KG, request denied.
  if (req.body.availableKg > process.env.MAX_BAGASI_KG)
    return next(
      new AppError(
        `Jumlah Bagasi yang dijual (${req.body.availableKg}Kg) melebihi batas maks. yang sudah ditentukan (${process.env.MAX_BAGASI_KG}Kg) 🙁.`,
        401
      )
    );

  //todo 5. Check if the updatedKg is lower than its alread bookedKg, request denied.
  if (req.body.availableKg < bagasi.bookedKg)
    return next(
      new AppError(
        `Bagasi yang telah dipesan (${bagasi.bookedKg}Kg) lebih besar dari yang ingin kakak jual (${req.body.availableKg}Kg).`,
        401
      )
    );

  //todo 6. If all conditions above are fulfilled, update Bagasi
  const updatedBagasi = await Bagasi.findByIdAndUpdate(
    bagasi,
    {
      waktuBerangkat: req.body.waktuBerangkat,
      waktuTiba: req.body.waktuTiba,
      availableKg: req.body.availableKg,
      hargaRp: req.body.hargaRp,
      catatan: req.body.catatan,
    },
    {
      new: true,
      runValidators: true,
    }
  );

  //todo 7. Update the quantities (InitialKg, availableKg) inside the updatedBagasi
  // console.log('🙃', `availableKg: ${Math.abs((bagasi.bookedKg - req.body.availableKg))}, InitialKg: ${bagasi.bookedKg + Math.abs((bagasi.bookedKg - req.body.availableKg))}`);
  const updateIncrement = await Bagasi.findByIdAndUpdate(
    updatedBagasi,
    {
      availableKg: Math.abs(bagasi.bookedKg - req.body.availableKg),
      initialKg:
        bagasi.bookedKg + Math.abs(bagasi.bookedKg - req.body.availableKg),
    },
    {
      new: true,
      runValidators: true,
    }
  );

  if (!updatedBagasi || !updateIncrement)
    return next(
      new AppError("Terjadi kesalahan dalam proses update bagasi Kakak 😢", 400)
    );

  res.status(200).json({
    status: "Success",
    message:
      "Bagasi berhasil di update. Selanjutnya, User upload dokumen keberangkatan.",
    data: {
      updatedBagasi,
    },
  });
});

exports.deleteBagasi = catchAsync(async (req, res, next) => {
  //todo 1. Check Bagasi Id
  const id = await Bagasi.findById(req.params.id);
  if (!id)
    return next(
      new AppError("Bagasi yang Kakak minta tidak ditemukan 🙁.", 404)
    );

  // todo 2. Check if he is the owner
  if (id.owner._id.toString() !== req.user.id)
    return next(
      new AppError("Kakak bukan pemilik bagasi ini 🙁. Akses di tolak ⛔.", 401)
    );

  // todo 3. Check if bagasi has been ordered, request denied
  if (id.bookedKg > 0)
    return next(
      new AppError(
        "Bagasi yang sudah di beli tidak dapat di cancel ya Kak 🙁. Hubungi Admin.",
        401
      )
    );

  //todo 4. Delete bagasiId from User.bagasi and Update the new document
  const user = await UserAuth.findById(req.user.id);
  const userBagasi = await UserAuth.findByIdAndUpdate(
    user,
    {
      $pull: {
        bagasi: {
          $in: [req.params.id],
        },
      },
    },
    {
      new: true,
      runValidators: true,
    }
  );

  //todo 4. Update Bagasi.status to 'false', and update the new document.
  const bagasiActive = await Bagasi.findByIdAndUpdate(
    id,
    { active: false },
    { new: true, runValidators: true }
  );
  if (!userBagasi || !bagasiActive)
    return next(
      new AppError("Terjadi kesalahan dalam menghapus bagasi Kakak 😢", 400)
    );

  res.status(200).json({
    status: "Success",
    message: "Bagasi berhasil dihapus",
    bagasiActive: bagasiActive.active,
  });
});
