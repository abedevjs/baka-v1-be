const express = require('express');
const userController = require('./../controller/userController');
const authController = require('./../controller/authController');

const userRouter = express.Router();

//! Global routes
//* www.nama.com/user/daftar
userRouter.route('/daftar').post(authController.daftar);

//* www.nama.com/user/masuk
userRouter.route('/masuk').post(authController.masuk);

//* www.nama.com/user/lupaPassword
userRouter.route('/lupaPassword').post(authController.lupaPassword);

//* www.nama.com/user/resetPassword/f4d6746s4g5sd4g
userRouter.route('/resetPassword/:token').patch(authController.resetPassword);

//! Protected Routes
//* www.nama.com/gantiPassword
userRouter.route('/gantiPassword').patch(authController.protect, authController.updatePassword);

//* www.nama.com/keluar
userRouter.route('/keluar').get(authController.protect, authController.keluar);

//* www.nama.com/updateUser
userRouter.route('/updateUser').patch(authController.protect, userController.updateUser);

//* www.nama.com/profilSaya
userRouter.route('/profilSaya').get(authController.protect, userController.profilSaya);

//* www.nama.com/hapusUser
userRouter.route('/hapusUser').delete(authController.protect, userController.hapusUser)




module.exports = userRouter;