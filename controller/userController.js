const User = require("./../model/userModel");
const UserAuth = require("./../model/userAuthModel");
const catchAsync = require("./../utility/catchAsync");
const AppError = require("./../utility/appError");
const Bagasi = require("../model/bagasiModel");
const Order = require("../model/orderModel");
const { encode } = require("../utility/cryptoJS");

const filterBody = (obj, ...allowedFields) => {
  const newObj = {};
  Object.keys(obj).forEach((el) => {
    if (allowedFields.includes(el)) newObj[el] = obj[el];
  });

  return newObj;
};

exports.all = catchAsync(async (req, res) => {
  const allUser = await UserAuth.find();

  const encryptedData = encode(allUser);

  res.status(200).json({
    status: "done",
    // results: data.length,
    data: {
      // allUser,
      encryptedData,
    },
  });
});

exports.profil = catchAsync(async (req, res, next) => {
  // console.log(req.user);
  const user = await UserAuth.findById(req.user.id).populate({
    path: "bagasi order",
  });

  const encryptedData = encode(user);

  res.status(200).json({
    status: "done",
    data: {
      // user,
      encryptedData,
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
      nama: req.body.nama,
      telpon: req.body.telpon,
      rekeningNomor: req.body.rekeningNomor,
      rekeningBank: req.body.rekeningBank,
    },
    {
      new: true,
      runValidators: true,
    }
  );
  if (!updatedUser)
    return next(new AppError("Maaf ya kak, ada kesalahan sistem dalam update User", 500));

  res.status(201).json({
    status: "done",
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

    //Check if Array is not empty because: ATTENTION! ARRAY.some() always returns false for empty arrays
    //* https://humanwhocodes.com/blog/2023/09/javascript-wtf-why-does-every-return-true-for-empty-array/
    //Cek jika dalam array isBookedKg ada salah satu elemen yang > 0 maka pasti bagasi tersebut sdh ready dan terbooking, jd ga bisa di delete
    if (isBookedKg.length > 0 && isBookedKg.some((el) => el > 0))
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

    //Disini sudah pasti array nya tdk kosong maka tdk perlu di cek empty atau tdk sebelum perform Array.some()
    //Cek jika dalam array orderStatus ada salah satu elemen yg status nya 'Ready', ga bisa di delete
    if (orderStatus.some((el) => el == "Ready")) {
      return next(
        new AppError(
          "Kakak masih memiliki Order aktif. Permohonan ditolak untuk sementara",
          400
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
