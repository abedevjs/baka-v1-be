const express = require("express");
const authController = require("./../controller/authController");
const uploadController = require("./../controller/uploadController");

const uploadRouter = express.Router({ mergeParams: true });

//* www.nama.com/upload/:id?
uploadRouter
  .route("/:id?")
  .post(
    authController.authenticate,
    uploadController.uploadMiddleware,
    uploadController.updateUploadDokumen
  );

//* www.nama.com/bagasi/:bagasiId?/upload
// uploadRouter.route('/').post(authController.protect, uploadController.uploadMiddleware, uploadController.uploadBagasiDocument);

// //* www.nama.com/order/:orderId?/upload
// uploadRouter.route('/').post(authController.protect, uploadController.uploadMiddleware, uploadController.uploadOrderDocument)

module.exports = uploadRouter;
