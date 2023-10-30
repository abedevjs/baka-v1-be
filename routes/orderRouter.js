const express = require("express");
const orderController = require("../controller/orderController");
const authController = require("./../controller/authController");
const uploadRoutes = require("./uploadRouter");

const orderRouter = express.Router({ mergeParams: true });

//* www.nama.com/order
//* www.nama.com/bagasi/:bagasiId/order
orderRouter
  .route("/")
  .get(authController.authenticate, orderController.getAllOrder)
  .post(
    authController.authenticate,
    orderController.uploadMiddleware,
    orderController.createOrder
  );

//* www.nama.com/order/:id
orderRouter
  .route("/:id")
  .get(authController.authenticate, orderController.getOneOrder)
  .patch(
    authController.authenticate,
    orderController.uploadMiddleware,
    orderController.updateOrder
  )
  .delete(authController.authenticate, orderController.deleteOrder);

//* www.nama.com/order/:id/delivered
//* Desc: Di eksekusi oleh user dan nodeschedule (jika user lupa). Akan set orderStatus dari 'Ready' ke 'Delivered'
orderRouter
  .route("/:id/delivered")
  .patch(authController.authenticate, orderController.deliveredOrder);

//* www.nama.com/order/:orderId/upload
// orderRouter.use('/:orderId?/upload', uploadRoutes);

module.exports = orderRouter;
