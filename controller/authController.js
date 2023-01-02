const crypto = require('crypto');//NodeJS built-in password hasher
const { promisify } = require('util');//Express built-in asyncronous function
const jwt = require('jsonwebtoken');
const User = require('./../model/userModel');
const UserGoogle = require('./../model/userGoogleModel');
const catchAsync = require('./../utility/catchAsync');
const AppError = require('./../utility/appError');
const sendEmail = require('./../utility/email');
const { token } = require('morgan');
const { findById } = require('../model/bagasiModel');

const signToken = id => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN
    });
};

const createSendToken = (user, statusCode, res) => {
    const token = signToken(user._id);
    const cookieOptions = {
        expires: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000),
        httpOnly: true
    };
    if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;

    User.password = undefined;//removing the password from output to client

    res.cookie('jwt', token, cookieOptions);

    res.status(statusCode).json({
        status: 'success',
        token,
        data: {
            user
        }
    });
};

exports.daftar = catchAsync(async (req, res, next) => {
    const newUser = await User.create({
        nama: req.body.nama,
        email: req.body.email,
        password: req.body.password,
        passwordConfirm: req.body.passwordConfirm,
        telpon: req.body.telpon,

    });

    if (!newUser) return next(new AppError('Kesalahan dalam mendaftar', 400));

    createSendToken(newUser, 201, res);
});

exports.masuk = catchAsync(async (req, res, next) => {
    const { email, password } = req.body;

    if (!email || !password) return next(new AppError('Masuk/Login dengan Email dan Password', 400));

    const user = await User.findOne({ email }).select('+password');

    if (!user || !await user.checkPassword(password, user.password)) return next(new AppError('Email atau Password Anda salah', 401));//* user.checkPassword adalah method yang sy buat sendiri di userModel

    createSendToken(user, 200, res);
});

exports.keluar = catchAsync(async (req, res, next) => {
    req.user = undefined;
    console.log(req.user);
    res.status(200).json({
        status: 'done',
        message: 'Anda telah keluar'
    });

});

exports.protect = catchAsync(async (req, res, next) => {
    let token;

    //todo 1. Get token and check if it's in there.
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer'))
        token = req.headers.authorization.split(' ')[1];//"Bearer eyJhbGci" to "eyJhbGci"

    //todo 2. Verification token.
    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

    //todo 3. Check if user still exits
    const currentUser = await User.findById(decoded.id);
    if (!currentUser) return next(new AppError('Mohon login kembali', 401));

    //todo 4. Check if user change password after token was issued. CODE INI INACTIVE KARENA PAKAI USERGOOGLEMODEL
    if (!currentUser.password) { //* Jika user dari userGoogle
        req.user = currentUser;

        next();
    };

    if (currentUser.changedPasswordAfter(decoded.iat)) return next(new AppError('Password has recently changed, please log in again', 401));

    //todo 5. If all 4 verify steps above is passed, grant access to protected route.
    //! Put/create the entire data of this verified user on the request. So this req.user will travel inside our app while holding passport/jwtToken as his visa/credential
    req.user = currentUser;

    next();
});

exports.updatePassword = catchAsync(async (req, res, next) => {
    //todo 1. Get user from collection
    const user = await User.findById(req.user.id).select('+password');

    //todo 2. Check if posted current password is correct
    if (!await user.checkPassword(req.body.passwordLama, user.password)) return next(new AppError('Password lama Anda salah', 401));

    //todo 3. If current password is correct, update password
    user.password = req.body.password;
    user.passwordConfirm = req.body.passwordConfirm;
    await user.save();

    //todo 4. log user in, send JWT
    createSendToken(user, 200, res);
});

exports.lupaPassword = catchAsync(async (req, res, next) => {
    //todo 1. Find user email
    const user = await User.findOne({ email: req.body.email });
    if (!user) return next(new AppError('Email belum ada dalam database kami', 404));

    //todo 2. Generate the reset random token
    const resetToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });//! Important little line of code. If involving password, never use .findAndUpdate(), always use .save(). validateBeforeSave: false, this will save without complying to userModel that we set.

    //todo 3. Send reset token to user email
    const resetURL = `${req.protocol}://${req.get('host')}/user/resetPassword/${resetToken}`;
    const message = `Kirim permintaan ini ke ${resetURL}.\n Jika Anda tidak lupa password, abaikan pesan ini.`;

    try {
        await sendEmail({
            email: user.email,
            subject: 'Reset token (valid 10 min)',
            message
        });

        res.status(200).json({
            status: 'success',
            resetToken
        });

    } catch (error) {
        user.passwordResetToken = user.passwordResetExpires = undefined;
        await user.save({ validateBeforeSave: false });

        console.log(`ERRORR NYA: ${error.message} 🤣`);
        return next(new AppError('Internal Error, hubungi admin kami melalui email atau WhatsApp', 500));
    }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
    //todo 1. Get user based on token
    const resetToken = req.params.token;
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex'); //! Random token dr client di hashed kemudian di compare dlm db

    const user = await User.findOne({ passwordResetToken: hashedToken, passwordResetExpires: { $gt: Date.now() } });

    if (!user) return next(new AppError('Invalid Token, hubungi admin kami', 400));

    //todo 2. If token has not expired, and there is user, set new password
    user.password = req.body.password;
    user.passwordConfirm = req.body.passwordConfirm;
    user.passwordResetToken = user.passwordResetExpires = undefined;

    await user.save();//! If involving password, never use .findAndUpdate(), always use .save().

    //todo 3. Update changedPasswordAt property for the user
    //This function is done in the userModel pre save middleware

    //todo 4. Log the user in, send JWT
    createSendToken(user, 200, res);
});

exports.restrictTo = (...roles) => {

    return (req, res, next) => {
        console.log(roles, req.user);
        if (!roles.includes(req.user.role)) {
            return next(new AppError('You do not have permission to access', 403));
        };

        next();
    }
};

//* ---------------------------------------------------------------------------------------------

const service = require('../utility/service');

//* dari tombol 'Login with Google' UI masuk kesini
exports.googleOauthHandler = catchAsync(async (req, res, next) => {//* This fn handle this callback url www.nama.com/oauth/google


    //todo 1. Client klik login yg menuju ke callback ini:
    //* www.nama.com/oauth/google

    //todo 2. Get code from the query string that sended back by Google
    const code = req.query.code;

    //todo 3. Get the id_token and access token with the code using Axios
    const data = await service.getGoogleOauthTokens(code)
    const { id_token, access_token, expires_in, refresh_token, scope, token_type } = data;
    // console.log('🥰' `😁id_token: ${id_token}, 😆access_token: ${access_token}, 😆expires_in: ${expires_in}, 😆refresh_token: ${refresh_token},`);

    //todo 4. Get Google User with tokens
    //* Cara 1, melalui jsonwebtoken yg sdh di signed oleh Google
    const googleUser = jwt.decode(id_token);
    console.log(googleUser);

    //* Cara 2, melalui Google API
    // const googleUser = await service.getGoogleUser(id_token, access_token);

    //todo 5. Upsert(update) the User in the database
    if (!googleUser.email_verified) return next(new AppError('Email kakak belum di verifikasi oleh Google. Verifikasi dulu ya kak 🙂', 401))

    const newUser = await UserGoogle.create({
        name: googleUser.name,
        email: googleUser.email,
        image: googleUser.picture,
    })

    //todo 6. Create a session


    //todo 7. Create access and refresh token


    //todo 8. Set cookies


    //todo 9. Redirect back to client



    if (!newUser) return next(new AppError('Kesalahan dalam mendaftar', 400));

    createSendToken(newUser, 201, res);
});