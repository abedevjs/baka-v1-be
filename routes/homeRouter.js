const express = require('express');
const homeController = require('./../controller/homeController')

const homeRouter = express.Router();

//www.caribagasi.com
homeRouter.route('/').get(homeController.getHome);

module.exports = homeRouter;