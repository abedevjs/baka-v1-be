const express = require('express');
const morgan = require('morgan')

const homeRoutes = require('./routes/homeRouter');
const bagasiRoutes = require('./routes/bagasiRouter');
const orderRoutes = require('./routes/orderRouter');
const userRoutes = require('./routes/userRouter');
const AppError = require('./utility/appError');
const globalErrorHandler = require('./controller/errorController');

const app = express();

//! Middlewares Security --start
app.use(express.json({ limit: '10kb' }));//built-in middleware dr express utk membaca dan memproses incoming input data dari body/client
//! Middlewares Security --end

//! Middlewares Operational --start
app.use((req, res, next) => {//Developer time midwares
    req.time = new Date().toISOString();
    next();
})

if (process.env.NODE_ENV === 'development') app.use(morgan('dev'));//3rd party logger
//! Middlewares Operational --end


//! My thought process from controller to router --start
// const getHomePage = (req, res, next) => {
//     res.status(200).json({
//         status: 'done',
//         message: 'This is the main page'
//     });
// };
// app.get('/', getHomePage);//Stand Alone
// app.route('/').get(getHomePage);//Stand Alone
// const homeRouter = express.Router();//1. Calling Router function
// app.use('/', homeRouter);//2. Define the router
// homeRouter.route('/').get(getHomePage)//3. Connect the Router and the Controller
//! My thought process from controller to router --end

//! Router --start
//* www.nama.com
app.use('/', homeRoutes);

//* www.nama.com/bagasi
app.use('/bagasi', bagasiRoutes);

//* www.nama.com/order
app.use('/order', orderRoutes);

//* www.nama.com/user
app.use('/user', userRoutes);
//! Router --end

//! Undefined route handler
app.all('*', (req, res, next) => {

    next(new AppError(`Can't find ${req.originalUrl} on this site`, 404)); //If we pass an argument into the .next(),
    //express will automatically know that this is an error. It will skip any middlewares after it and will jump to
    //global error handling
});

//! Global error handler
app.use(globalErrorHandler);

module.exports = app;