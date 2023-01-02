const express = require('express');
const authController = require('./../controller/authController');

const oauthRouter = express.Router();

//* www.nama.com/oauth/google
oauthRouter.route('/google').get(authController.googleOauthHandler);







module.exports = oauthRouter;