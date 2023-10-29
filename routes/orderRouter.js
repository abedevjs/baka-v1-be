const express = require("express");
const orderController = require("../controller/orderController");
const authController = require("./../controller/authController");
const uploadRoutes = require("./uploadRouter");

const orderRouter = express.Router({ mergeParams: true });

//* www.nama.com/order
//* www.nama.com/bagasi/:bagasiId/order
orderRouter
  .route("/")
  .get(authController.protect, orderController.getAllOrder)
  .post(
    authController.protect,
    orderController.uploadMiddleware,
    orderController.createOrder
  );

//* www.nama.com/order/:id
orderRouter
  .route("/:id")
  .get(authController.protect, orderController.getOneOrder)
  .patch(
    authController.protect,
    orderController.uploadMiddleware,
    orderController.updateOrder
  )
  .delete(authController.protect, orderController.deleteOrder);

orderRouter
  .route("/:id/delivered")
  .patch(authController.protect, orderController.deliveredOrder);

//* www.nama.com/order/:orderId/upload
// orderRouter.use('/:orderId?/upload', uploadRoutes);

module.exports = orderRouter;
