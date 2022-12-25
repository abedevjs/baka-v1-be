//* How our Error handlers are travels around the app:
// 1. If for example error happend on database/client input, Mongoose will throw error from validation error (tour Model Schema) then this error travels to...
// 2. ..catchAsync function or our controllers in the try catch block, which this error is edited/defined by us in the...
// 3. ...AppError class, then this error travels to...
// 4. ...Global Error Handlers (the function with 4 argument) by express (errorControllers). The respond/output is constructed/defined/written in this file (errorController)

const AppError = require('./../utility/appError');

const handleCastErrorDB = err => {//127.0.0.1:3000/api/v1/tours/www
    const message = `Invalid ${err.path}: ${err.value}.`
    return new AppError(message, 400);
};

const handleDuplicateFieldsDB = err => {//127.0.0.1:3000/api/v1/tours/ > update kasi nama tour yang sama
    const value = err.errmsg.match(/(["'])(\\?.)*?\1/)[0];
    const message = `Duplicate value: ${value}. Please use another value!`;

    return new AppError(message, 400);
};

const handleValidationErrorDB = err => {//127.0.0.1:3000/api/v1/tours/5fceaffd82006222e45d5a0c
    //misalnya kalo kita update tour tapi nama, rating, durasi asal2an

    const errors = Object.values(err.errors).map(el => el.message)

    const message = `Invalid input data. ${errors.join('. ')}`;

    return new AppError(message, 400);
};

const handleJWTError = () => new AppError('Invalid token please login again', 401);
const handleJWTExpiredError = () => new AppError('This token has expired, please login again', 401);

const sendErrorDev = (err, res,) => {//untraceable error, introduced by the programmer
    console.log('❤️‍🔥', err.stack);
    console.error('Development', err);

    res.status(err.statusCode).json({
        status: err.status,
        error: err,
        message: err.message,
        stack: err.stack
    });
};

const sendErrorProd = (err, res) => {

    //Sent to the client, in production, traceable error, external error.
    if (err.isOperational) {
        console.error('Production A, is Operational', err);
        res.status(err.statusCode).json({
            status: err.status,
            message: err.message
        });

        //Unknown/untraceable error. Send client the generic error message.
    } else {
        console.error('Production B, User error', err);
        console.log('❤️‍🔥', err.stack);

        res.status(500).json({
            status: 'error',
            message: 'Internal server error'
        });
    }
};


//! Global error handler, built-in/out-of-the-box error handler from Express

module.exports = (err, req, res, next) => {//IF we pass four argument, Express will automatically know that this is their Error Handler

    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'Error';

    if (process.env.NODE_ENV === 'development') {

        sendErrorDev(err, res);
    } else {

        let error = Object.create(err);

        if (error.name === 'CastError') error = handleCastErrorDB(error);
        if (error.code === 11000) error = handleDuplicateFieldsDB(error);
        if (error.name === 'ValidationError') error = handleValidationErrorDB(error);
        if (error.name === 'JsonWebTokenError') error = handleJWTError();
        if (error.name === 'TokenExpiredError') error = handleJWTExpiredError();

        sendErrorProd(error, res);
    };
};