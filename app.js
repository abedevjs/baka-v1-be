const express = require('express');
const morgan = require('morgan')

const homeRoutes = require('./routes/homeRouter');
const bagasiRoutes = require('./routes/bagasiRouter');
const orderRoutes = require('./routes/orderRouter');
const userRoutes = require('./routes/userRouter');
// const oauthRouter = require('./routes/oauthRouter');
const authRouter = require('./routes/authRouter');
const AppError = require('./utility/appError');
const globalErrorHandler = require('./controller/errorController');

const session = require('express-session');
const MongoStore = require('connect-mongo');
const mongoose = require('mongoose');
const passport = require('passport');
require('./utility/passport-setup')(passport);

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

//! Session Middlewares --start
app.use(session({
    secret: 'keyboard cat',
    resave: false,//we dont want to save a session if nothing is modified
    saveUninitialized: false,//dont create a session until something is stored

    // store: MongoStore.create({ //* LOCAL database
    //     mongoUrl: process.env.DATABASE_LOCAL,
    //     ttl: 14 * 24 * 60 * 60, // = time to leave 14 days. Default

    // }),
    store: MongoStore.create({ //* REMOTE database
        mongoUrl: process.env.DATABASE.replace('<PASSWORD>', process.env.DATABASE_PASSWORD),
        ttl: 14 * 24 * 60 * 60, // = time to leave 14 days. Default
    }),

    // cookie: { secure: true } //this wont work without https
  }))
//! Session Middlewares --end

//! Passport Middlewares --start
app.use(passport.initialize())
app.use(passport.session())
//! Passport Middlewares --end


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

//* www.nama.com/oauth
// app.use('/oauth', oauthRouter);

//* www.nama.com/auth
app.use('/auth', authRouter);
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