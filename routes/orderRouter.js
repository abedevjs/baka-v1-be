const express = require('express');
const orderController = require('../controller/orderController');
const authController = require('./../controller/authController')

const orderRouter = express.Router({ mergeParams: true });



//* www.nama.com/order
//* www.nama.com/bagasi/:bagasiId/order
orderRouter.route('/')
    .get(authController.protect, orderController.getAllOrder)
    .post(authController.protect, orderController.createOrder)

//* www.nama.com/order/:id
orderRouter.route('/:id')
    .get(authController.protect, orderController.getOneOrder)
    .patch(authController.protect, orderController.updateOrder)
    .delete(authController.protect, orderController.deleteOrder)


module.exports = orderRouter;