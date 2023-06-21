// const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy
const UserAuth = require('../model/userAuthModel');
const createSendToken = require('../controller/authController')

//! Using PASSPORT -- start ----------------------------------

module.exports = function(passport) {
    passport.use(
        new GoogleStrategy({
                clientID: process.env.GOOGLE_CLIENT_ID,
                clientSecret: process.env.GOOGLE_CLIENT_SECRET,
                callbackURL: '/auth/google/redirect',
    
            }, async (access_token, refresh_token, profile, done) => {
                // console.log(profile);
                const newUser = {
                    nama: profile.displayName,
                    googleID: profile.id,
                    email: profile.emails[0].value,
                    provider: profile.provider,
                    image: profile.photos[0].value,

                };

                try {
                    let user = await UserAuth.findOne({googleID: profile.id});

                    if(user) {
                        done(null, user);
                    } else {
                        user = await UserAuth.create(newUser);
                        done(null, user);
                    };


                } catch (error) {
                    console.error('🔴', error);
                };
            }
        )
    );

    passport.use(
        new FacebookStrategy({
                clientID: process.env.FACEBOOK_CLIENT_ID,
                clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
                callbackURL: '/auth/facebook/redirect',
    
            }, async (access_token, refresh_token, profile, done) => {
                console.log(profile);
                const newUser = {
                    nama: profile.displayName,
                    facebookID: profile.id,
                    provider: profile.provider,

                };

                try {
                    let user = await UserAuth.findOne({facebookID: profile.id});

                    if(user) {
                        done(null, user);
                    } else {
                        user = await UserAuth.create(newUser);
                        done(null, user);
                    };


                } catch (error) {
                    console.error('🔴', error);
                };
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
}





//! Using PASSPORT -- end ----------------------------------