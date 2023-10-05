const User = require("./../model/userModel");
const UserAuth = require("./../model/userAuthModel");
const catchAsync = require("./../utility/catchAsync");
const AppError = require("./../utility/appError");

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

  //todo 2. Check if theres any active Bagasi/Order
  if (user.bagasi.length > 0 || user.order.length > 0)
    return next(
      new AppError(
        "User yang masih memiliki bagasi/order aktif belum bisa di hapus kakak 😢",
        401
      )
    );

  //todo 3. If passed, delete disactivate user
  await UserAuth.findByIdAndUpdate(req.user.id, { active: false });

  res.status(200).json({
    status: "done",
    message: "Selamat jalan 👋",
  });
});
