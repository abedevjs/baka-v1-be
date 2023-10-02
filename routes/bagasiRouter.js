const express = require("express");
const orderRoutes = require("./orderRouter");
const uploadRoutes = require("./uploadRouter");
const bagasiController = require("./../controller/bagasiController");
const authController = require("./../controller/authController");

const bagasiRouter = express.Router();

//* www.nama.com/bagasi
bagasiRouter
  .route("/")
  .get(bagasiController.getAllBagasi)
  .post(authController.protect, bagasiController.createBagasi);

//* www.nama.com/bagasi/:id
bagasiRouter
  .route("/:id")
  .get(authController.protect, bagasiController.getOneBagasi)
  .patch(authController.protect, bagasiController.updateBagasi)
  .delete(authController.protect, bagasiController.deleteBagasi);

//* www.nama.com/bagasi/:bagasiId/order
bagasiRouter.use("/:bagasiId/order", orderRoutes);

//* www.nama.com/bagasi/:bagasiId/upload
// bagasiRouter.use('/:bagasiId?/upload', uploadRoutes);

module.exports = bagasiRouter;
