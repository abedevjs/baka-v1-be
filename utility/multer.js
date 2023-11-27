const multer = require("multer");
const AppError = require("./appError");

const multerStorage = multer.diskStorage({
  //How we want to store our file.
  destination: (req, file, callback) => {
    //this is here to define the destination. this property name from multer
    //takes 3 argument current request, currently uploaded file, callback function
    //this callback function is like next in express

    callback(null, "upload/dokumen");
    //first argument is error if error, and if valid is null
    //second argument is the location where u want the file to be stored
  },

  filename: (req, file, callback) => {
    //this is here to define the filename. this property name from multer
    //user-userId-currenttimestamp.jpeg
    //user-564ssg12-120211.jpeg
    //mimetype: 'image/jpeg'; ini isi dari req.file
    const ext = file.mimetype.split("/")[1]; //jpeg
    // callback(null, `${req.user.nama}-${file.originalname}.${ext}`);
    callback(
      null,
      `${req.user.email ? req.user.email : req.user.nama}-${Date.now()}-${
        file.originalname
      }`
    );
    //first argument is error if error, and if valid is null
    //second argument is the how you name your file
    //${req.user-id} is logged in user id
  },
});

const multerFilter = (req, file, callback) => {
  //How to filter the upload file
  //Todo File type must be pdf, png, jpg, jpeg and not exceed
  const mimeTypes = ["application/pdf", "image/png", "image/jpg", "image/jpeg"];
  if (mimeTypes.includes(file.mimetype)) {
    callback(null, true);
  } else {
    callback(
      new AppError(
        "Tipe file yang boleh di upload adalah .pdf, .png, .jpeg, dan .jpg dengan maksimum 5mb saja Kak 😢",
        403
      )
    );
  }
};

const multerUpload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
  limits: {
    files: 1,
    fileSize: process.env.MULTER_MAX_UPLOAD,
  },
});

module.exports = multerUpload;
