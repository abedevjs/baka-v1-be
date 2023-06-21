const express = require('express');
const authController = require('../controller/authController');
const passport = require('passport');


const authRouter = express.Router();

//* www.nama.com/auth/google
authRouter.route('/google').get(authController.authGoogleHandler);
// authRouter.get('/google', passport.authenticate('google', {scope: ['profile']}));

//* callback route for google to redirect to www.nama.com/auth/google/redirect ATAU http://localhost:27017/auth/google/redirect
// authRouter.route('/google/redirect').get(authController.authGoogleHandlerRedirect);
authRouter.get('/google/redirect', passport.authenticate('google', { failureRedirect: '/' }), (req, res) => {
    res.redirect('/order')
});

//* www.nama.com/auth/facebook
authRouter.route('/facebook').get(authController.authFacebookHandler);

//* callback route for facebook to redirect to www.nama.com/auth/facebook/redirect ATAU http://localhost:27017/auth/facebook/redirect
// authRouter.route('/facebook/redirect').get(authController.authFacebookHandlerRedirect);
authRouter.get('/facebook/redirect', passport.authenticate('facebook', { failureRedirect: '/' }), (req, res) => {
    res.redirect('/order')
});

//* www.nama.com/auth/logout
authRouter.get('/logout', (req, res) => {
    req.logOut();
    res.redirect('/')
})

module.exports = authRouter;