const User = require("./../model/userModel");
const UserAuth = require("./../model/userAuthModel");
const catchAsync = require("./../utility/catchAsync");
const AppError = require("./../utility/appError");
const Bagasi = require("../model/bagasiModel");
const Order = require("../model/orderModel");

const filterBody = (obj, ...allowedFields) => {
  const newObj = {};
  Object.keys(obj).forEach((el) => {
    if (allowedFields.includes(el)) newObj[el] = obj[el];
  });

  return newObj;
};

exports.all = catchAsync(async (req, res) => {
  const data = await UserAuth.find();

  res.status(200).json({
    status: "done",
    results: data.length,
    data: {
      data,
    },
  });
});

exports.profil = catchAsync(async (req, res, next) => {
  // console.log(req.user);
  const user = await UserAuth.findById(req.user.id).populate({
    path: "bagasi order",
  });

  res.status(200).json({
    status: "done",
    data: {
      user,
    },
  });
});

exports.update = catchAsync(async (req, res, next) => {
  //* Hanya bisa update nomor telpon karena pakai UserAuth
  //todo 1. Create error if user POSTs password data. Code dibawah dihapus krn UserAuth tdk pake password.
  // if (req.body.password || req.body.passwordConfirm)
  //   return next(
  //     new AppError("Updating for password on route /updatePassword", 401)
  //   );

  //todo 2. Filter hanya object yang di inginkan
  // filterBody(req.body, 'nama', 'email', 'telpon');

  //todo 3. Update user document. Hanya bisa update nomor telpon karena pakai UserAuth
  const updatedUser = await UserAuth.findByIdAndUpdate(
    req.user.id,
    {
      telpon: req.body.telpon,
    },
    {
      new: true,
      runValidators: true,
    }
  );

  res.status(201).json({
    status: "done",
    data: {
      updatedUser,
    },
  });
});

exports.hapus = catchAsync(async (req, res, next) => {
  //todo 1. Check user
  const user = await UserAuth.findById(req.user.id);
  if (!user) return next(new AppError("User ini tidak ditemukan", 404));

  //todo 2. Check if theres any active Bagasi. Tidak ada bagasi yg sudah di booking (bookedKg == 0)
  if (user.bagasi.length > 0) {
    // ambil id nya
    const bagasiIds = user.bagasi.map((el) => el);

    //buat array kosong
    let isBookedKg = [];

    //looping tiap Bagasi berdasarkan id nya, terus diambil property .bookedKg yang value nya di masukin ke array isBookedKg
    await Promise.all(
      bagasiIds.map(async (el) => {
        isBookedKg.unshift((await Bagasi.findById(el)).bookedKg);
      })
    );

    //Cek jika dalam array isBookedKg ada salah satu elemen yang > 0 maka pasti bagasi tersebut sdh ready dan terbooking, jd ga bisa di delete
    if (isBookedKg.some((el) => el > 0))
      return next(
        new AppError(
          "Kakak masih memiliki Bagasi aktif. Permohonan ditolak untuk sementara"
        )
      );
  }

  //todo 3. Check if there's any active Order. Tidak ada order yg ready (status !== ready)
  if (user.order.length > 0) {
    // ambil id nya
    const orderIds = user.order.map((el) => el);

    //buat array kosong
    let orderStatus = [];

    //looping tiap Order berdasarkan id nya, terus diambil property status yang value nya di masukin ke array orderStatus
    await Promise.all(
      orderIds.map(async (el) => {
        orderStatus.unshift((await Order.findById(el)).status);
      })
    );

    //Cek jika dalam array orderStatus ada salah satu elemen yg status nya 'Ready', ga bisa di delete
    if (orderStatus.some((el) => el == "Ready")) {
      return next(
        new AppError(
          "Kakak masih memiliki Order aktif. Permohonan ditolak untuk sementara 🙁"
        )
      );
    }
  }

  //todo 3. If passed, delete disactivate user
  await UserAuth.findByIdAndUpdate(req.user.id, { active: false });

  res.status(200).json({
    status: "done",
    message: "Selamat jalan 👋",
  });
});
