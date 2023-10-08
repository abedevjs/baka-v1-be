const express = require("express");
const orderRoutes = require("./orderRouter");
const uploadRoutes = require("./uploadRouter");
const bagasiController = require("./../controller/bagasiController");
const authController = require("./../controller/authController");

const bagasiRouter = express.Router();

//* www.nama.com/bagasi
bagasiRouter
  .route("/")
  .get(authController.authenticate, bagasiController.getAllBagasi)
  .post(authController.authenticate, bagasiController.createBagasi);

//* www.nama.com/bagasi/:id
bagasiRouter
  .route("/:id")
  .get(authController.authenticate, bagasiController.getOneBagasi)
  .patch(authController.authenticate, bagasiController.updateBagasi)
  .delete(authController.authenticate, bagasiController.deleteBagasi);

//* www.nama.com/bagasi/:bagasiId/order
bagasiRouter.use("/:bagasiId/order", orderRoutes);

//* www.nama.com/bagasi/:bagasiId/upload
// bagasiRouter.use('/:bagasiId?/upload', uploadRoutes);

module.exports = bagasiRouter;
