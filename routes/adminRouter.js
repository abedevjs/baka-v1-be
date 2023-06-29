const express = require('express');
const adminController = require('../controller/adminController');
const authController = require('../controller/authController');

const adminRouter = express.Router();

//! All routes are restricted to LoggedIn User
adminRouter.use(authController.protect);
adminRouter.use(authController.authenticate);

//! All routes are restricted to ADMIN
adminRouter.use(authController.restrictTo('abe@test.com', 'bonsoir.abe@gmail.com'));

//* www.nama.com/admin/status-bagasi/:id
//* desc: Mengganti status bagasi setelah admin cek dokumen penerbangan
adminRouter.route('/status-bagasi/:id').patch(adminController.updateBagasiStatus);

//* www.nama.com/admin/activate-order/:id
//* desc: Activating order status and manipulate bagasi detail
adminRouter.route('/activate-order/:id').patch(adminController.activateOrder);











module.exports = adminRouter;

