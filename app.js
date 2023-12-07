const express = require("express");
const morgan = require("morgan");
const cors = require("cors");
const helmet = require("helmet");
const mongoSanitize = require("express-mongo-sanitize");
const hpp = require("hpp");
const rateLimit = require("express-rate-limit");

const homeRoutes = require("./routes/homeRouter");
const bagasiRoutes = require("./routes/bagasiRouter");
const orderRoutes = require("./routes/orderRouter");
const userRoutes = require("./routes/userRouter");
// const oauthRouter = require('./routes/oauthRouter');
const authRouter = require("./routes/authRouter");
const adminRoutes = require("./routes/adminRouter");
const uploadRoutes = require("./routes/uploadRouter");

const AppError = require("./utility/appError");
const globalErrorHandler = require("./controller/errorController");

const session = require("express-session");
const MongoStore = require("connect-mongo");
const mongoose = require("mongoose");
const passport = require("passport");
require("./utility/passport-setup")(passport);

const app = express();

const updateNotifier = require("simple-update-notifier");
const packageJson = require("./package.json", { type: "json" });

updateNotifier({ pkg: packageJson });

//! Middlewares Security --start
//Enable when deployment OR when not using localhost
// app.set("trust proxy", 1);

//CORS
app.use(
  cors({
    origin: process.env.CLIENT_URL,
    methods: ["GET", "POST", "DELETE", "UPDATE", "PUT", "PATCH"],
    credentials: true,
  })
);

//Helmet helps secure Express apps by setting HTTP response headers.
app.use(helmet());

//built-in middleware dr express utk membaca dan memproses incoming input data dari body/client
app.use(express.json({ limit: "10kb" }));

//Express 4.x middleware which sanitizes user-supplied data to prevent MongoDB Operator Injection.
app.use(mongoSanitize());

//Express middleware to protect against HTTP Parameter Pollution attacks
app.use(hpp());

// Limit requests API from same IP
const limiter = rateLimit({
  limit: 500,
  windosMs: 1 * 60 * 60 * 1000,
  message: "Coba lagi setelah 1 jam ya kak",
  // validate: { trustProxy: true }, //I enable this because when deployment, the passportJS strategy need to enable {proxy: true}
});
app.use(limiter);
//! Middlewares Security --end

//! Middlewares Operational --start
app.use((req, res, next) => {
  //Developer time midwares
  req.time = new Date().toISOString();
  next();
});

if (process.env.NODE_ENV === "development") app.use(morgan("dev")); //3rd party logger
//! Middlewares Operational --end

//! Session Middlewares --start
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false, //we dont want to save a session if nothing is modified
    saveUninitialized: false, //dont create a session until something is stored
    cookie: {
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      // secure: true, //Enable when deployment OR when not using localhost, this wont work without https
      // sameSite: "none", //Enable when deployment OR when not using localhost, We're not on the same site, we're using different site so the cookie need to effectively transfer from Backend to Frontend
    },

    // store: MongoStore.create({ //* LOCAL database
    //     mongoUrl: process.env.DATABASE_LOCAL,
    //     ttl: 14 * 24 * 60 * 60, // = time to leave 14 days. Default

    // }),

    store: MongoStore.create({
      //* REMOTE database
      mongoUrl: process.env.DATABASE.replace(
        "<PASSWORD>",
        process.env.DATABASE_PASSWORD
      ),
      ttl: 14 * 24 * 60 * 60, // = time to leave 14 days. Default
    }),
  })
);
//! Session Middlewares --end

//! Passport Middlewares --start
app.use(passport.initialize());
app.use(passport.session());
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
app.use("/", homeRoutes);

//* www.nama.com/bagasi
app.use("/bagasi", bagasiRoutes);

//* www.nama.com/order
app.use("/order", orderRoutes);

//* www.nama.com/user
app.use("/user", userRoutes);

//* www.nama.com/oauth
// app.use('/oauth', oauthRouter);

//* www.nama.com/auth
app.use("/auth", authRouter);

//* www.nama.com/upload
app.use("/upload", uploadRoutes);

//* www.nama.com/admin
app.use("/admin", adminRoutes);
//! Router --end

//! Undefined route handler
app.all("*", (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this site`, 404)); //If we pass an argument into the .next(),
  //express will automatically know that this is an error. It will skip any middlewares after it and will jump to
  //global error handling
});

//! Global error handler
app.use(globalErrorHandler);

module.exports = app;
