// const passport = require('passport');
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const FacebookStrategy = require("passport-facebook").Strategy;
const UserAuth = require("../model/userAuthModel");
const createSendToken = require("../controller/authController");

//! Using PASSPORT -- start ----------------------------------

module.exports = function (passport) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        // scope: ["profile", "email"],
        callbackURL: "/auth/google/redirect",
        // callbackURL: "https://baka-v1-be.vercel.app/auth/google/redirect",
        // proxy: true,
      },
      async (access_token, refresh_token, profile, done) => {
        // console.log(profile);
        const newUser = {
          nama: profile.displayName,
          googleID: profile.id,
          email: profile.emails[0].value,
          provider: profile.provider,
          image: profile.photos[0].value,
        };

        try {
          //todo Check if User is in the Blacklist? reject
          if (process.env.BLACKLIST_GMAIL.split(" ").includes(newUser.email)) {
            return done(null, false, {
              message:
                "Banned. BTW I cant find how to display this message to the User",
            });
          }

          //todo Check if User has already been registered before
          let user = await UserAuth.findOne({ googleID: profile.id });

          if (user) {
            //todo if yes, next
            done(null, user);
          } else {
            //todo if not yet, create new User
            user = await UserAuth.create(newUser);
            done(null, user);
          }
        } catch (error) {
          console.error("🔴 PassportJS Error: ", error);
        }
      }
    )
  );

  passport.use(
    new FacebookStrategy(
      {
        clientID: process.env.FACEBOOK_CLIENT_ID,
        clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
        callbackURL: "/auth/facebook/redirect",
        // callbackURL: "https://baka-v1-be.vercel.app/auth/facebook/redirect",
        // proxy: true,
        scope: ["public_profile", "email"],
      },
      async (access_token, refresh_token, profile, done) => {
        // console.log(profile);
        const newUser = {
          nama: profile.displayName,
          facebookID: profile.id,
          provider: profile.provider,
        };

        try {
          //todo Check if User is in the Blacklist? reject
          if (
            process.env.BLACKLIST_FB_ID.split(" ").includes(newUser.facebookID)
          ) {
            return done(null, false, {
              message:
                "Banned. BTW I cant find how to display this message to the User",
            });
          }

          //todo Check if User has already been registered before
          let user = await UserAuth.findOne({ facebookID: profile.id });

          if (user) {
            //todo if yes, next
            done(null, user);
          } else {
            //todo if not, create new User
            user = await UserAuth.create(newUser);
            done(null, user);
          }
        } catch (error) {
          console.error("🔴 PassportJS Error: ", error);
        }
      }
    )
  );

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser((id, done) => {
    UserAuth.findById(id, (err, user) => {
      done(err, user);
    });
  });
};

//! Using PASSPORT -- end ----------------------------------
