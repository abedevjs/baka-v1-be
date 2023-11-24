const Bagasi = require("./../model/bagasiModel");
const Order = require("../model/orderModel");
const User = require("./../model/userModel");
const UserAuth = require("./../model/userAuthModel");
const catchAsync = require("./../utility/catchAsync");
const AppError = require("./../utility/appError");
const multerUpload = require("../utility/multer");
const Dokumen = require("../model/dokumenModel");

exports.uploadMiddleware = multerUpload.single("dokumen");

exports.updateUploadDokumen = catchAsync(async (req, res, next) => {
  //* www.nama.com/upload/:id?

  //todo Check if the upload file not exceed than 5mb
  //* Sengaja di buatkan variable baru karena ada uploadMidware yg memblok proses jika user tdk upload dokumen,
  //* upload dokumen tetap wajib, tp di validate oleh mongoose.
  let updateDokumen = req.body.dokumen;
  if (req.file) {
    updateDokumen = req.file.filename;
    if (req.file.size > process.env.MULTER_MAX_UPLOAD)
      return next(
        new AppError(
          "Ukuran maksimal dokumen yang di upload hanya sampai 5mb saja Kakak 😢",
          403
        )
      );
  } else return next(new AppError("Tidak ada file yang di upload Kak 😢", 401));

  //todo 1. Grab UserID
  const currentUser = await UserAuth.findById(req.user.id);

  //todo 2. Cek User.bagasi dan User.order
  if (currentUser.bagasi.length == 0 && currentUser.order.length == 0)
    return next(
      new AppError(
        "Kk belum buat Bagasi atau Order. Upload Dokumen tidak diterima",
        403
      )
    );

  //! WITHOUT req.params.id. Jika user upload saat createBagasi atau createOrder?
  if (!req.params.id) {
    //todo 1. Upload new Dokumen ke User.dokumen
    const newDokumen = await UserAuth.findByIdAndUpdate(
      currentUser,
      {
        $push: {
          dokumen: updateDokumen, //naming dokumen using the uploaded original file name
        },
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!newDokumen)
      return next(
        new AppError(
          "Kesalahan dalam upload Dokumen kak, mohon coba beberapa saat lagi 😢",
          401
        )
      );
  } else {
    //! WITH req.params.id. Jika user upload saat updateBagasi atau updateOrder?
    //todo 1. Grab req.params.id. Document masih unknown karena belum tau Bagasi dokumen atau Order dokumen
    const docID = req.params.id;

    //todo 2. Cek if User owns this Doc
    if (!currentUser.bagasi.concat(currentUser.order).some((el) => el == docID))
      return next(
        new AppError(
          "Dokumen tidak tersedia atau Kakak bukan pemilik dokumen ini 😢",
          403
        )
      );

    //todo 3. Find the id Model
    const doc = await Promise.all([
      Bagasi.findById(docID),
      Order.findById(docID),
    ]);

    if (doc.every((el) => el == null))
      return next(new AppError("Dokumen yang dicari tidak tersedia 😢", 401));

    //todo 3. Determine whether the dokumen belongs to Bagasi or Order model
    const Model = doc[0] ? Bagasi : Order;

    //todo 4. Update the doc to the model
    const newDokumen = await Model.findByIdAndUpdate(
      docID,
      {
        dokumen: updateDokumen,
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!newDokumen)
      return next(new AppError("Update Dokumen tidak berhasil 😢", 401));
  }

  //todo Create dokumen ke Dokumen db
  const newDoc = await Dokumen.create({ nama: updateDokumen });
  if (!newDoc)
    return next(
      new AppError("Menambahkan Dokumen baru ke DB tidak berhasil 🙁", 401)
    );

  res.status(200).json({
    status: "Success",
    message:
      "Dokumen berhasil di upload. Admin akan memeriksa validitas dokumen",
  });
});

// exports.uploadBagasiDocument = catchAsync(async(req, res, next) => {
//     console.log('uploadBagasiDocument');
//     console.log(req.params);

//     res.status(200).json({
//         status: 'Success',
//         message: 'Document uploaded'
//     });
// });

// exports.uploadOrderDocument = catchAsync(async(req, res, next) => {
//     console.log('uploadOrderDocument');
//     console.log(req.params);

//     res.status(200).json({
//         status: 'Success',
//         message: 'Document uploaded'
//     });
// });
