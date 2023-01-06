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

//* www.nama.com/user/all
userRouter.route('/all').get(authController.protect, userController.all)

//* www.nama.com/user/update
userRouter.route('/update').patch(authController.protect, userController.update);

//* www.nama.com/user/profil
userRouter.route('/profil').get(authController.protect, userController.profil);

//* www.nama.com/user/hapus
userRouter.route('/hapus').delete(authController.protect, userController.hapus)




module.exports = userRouter;