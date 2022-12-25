class AppError extends Error { //Class App Error untuk mempermudah penulisan ketika ada error. 
    constructor(message, statusCode) {
        super(message);

        this.statusCode = statusCode;
        this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
        this.isOperational = true;//sent to the client, in production, untraceable error, external error. not programming error. invalid input data

        Error.captureStackTrace(this, this.constructor);

    };
};

module.exports = AppError;