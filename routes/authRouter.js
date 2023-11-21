const express = require("express");
const authController = require("../controller/authController");
const passport = require("passport");

const authRouter = express.Router();

//* www.nama.com/auth/google
authRouter.route("/google").get(authController.authGoogleHandler);
// authRouter.get('/google', passport.authenticate('google', {scope: ['profile']}));

//* callback route for google to redirect to www.nama.com/auth/google/redirect ATAU http://localhost:27017/auth/google/redirect
// authRouter.route('/google/redirect').get(authController.authGoogleHandlerRedirect);
authRouter.get(
  "/google/redirect",
  passport.authenticate("google", {
    // failureRedirect: `${process.env.CLIENT_URL}/login`,
    failureRedirect: `/login`,
    // successRedirect: `${process.env.CLIENT_URL}/list-bagasi`,
    successRedirect: `/list-bagasi`,
  }),
  (err, req, res, next) => {
    if (err.name === "TokenError") res.redirect("/auth/google");
  },
  (req, res) => {
    res.redirect("/order");
  }
);

//* www.nama.com/auth/facebook
authRouter.route("/facebook").get(authController.authFacebookHandler);

//* callback route for facebook to redirect to www.nama.com/auth/facebook/redirect ATAU http://localhost:27017/auth/facebook/redirect
//* To get client's email on facebook: https://stackoverflow.com/questions/22880876/passport-facebook-authentication-is-not-providing-email-for-all-facebook-account
// authRouter.route('/facebook/redirect').get(authController.authFacebookHandlerRedirect);
authRouter.get(
  "/facebook/redirect",
  passport.authenticate("facebook", {
    failureRedirect: `${process.env.CLIENT_URL}/login`,
    successRedirect: `${process.env.CLIENT_URL}/list-bagasi`,
  }),
  (req, res) => {
    res.redirect("/order");
  }
);

//* www.nama.com/auth/logout
authRouter.get("/logout", (req, res) => {
  req.logOut();
  res.redirect(process.env.CLIENT_URL);
});

module.exports = authRouter;
