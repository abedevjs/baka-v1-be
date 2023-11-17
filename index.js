const schedule = require("./utility/node-schedule");

//! Environment configuration --start
const dotenv = require("dotenv");
dotenv.config({ path: "./config.env" });
// console.log(process.env);

process.on("uncaughtException", (err) => {
  //! Handling bugs/error in any asyncronous code. Declared before we start our Express app
  console.log(err.name, err.message);
  process.exit(2);
});

const app = require("./app");
console.log(`App running on: ${app.get("env")}`);
//! Environment configuration --end

//! Database setup --start
const mongoose = require("mongoose");
const DB = process.env.DATABASE.replace(
  "<PASSWORD>",
  process.env.DATABASE_PASSWORD
);
mongoose
  // .connect(process.env.DATABASE_LOCAL, {
  //* Line ini enable klo aktif kan LOCAL database jgn lupa aktifkan jg session nya di app.js
  // mongoose
  .connect(DB, {
    //* Line ini enable klo aktifkan REMOTE database jgn lupa aktifkan jg session nya di app.js
    // useNewUrlParser: true, //tdk usah krn sdh pake mongoose v6
    // useCreateIndex: true, //tdk usah krn sdh pake mongoose v6
    // useFindAndModify: false //tdk usah krn sdh pake mongoose v6
  })
  .then((data) => {
    console.log(`Database is connected to: ${data.connection.host}`);
    schedule.startJob();
  });
//! Database setup --end

//! Server --start
const port = process.env.PORT || 8000;
server = app.listen(port, () => {
  console.log(`port ${port}`);
});
//! Server --start

process.on("unhandledRejection", (err) => {
  //! Handling any uncaught promise.
  console.log(err.name, err.message);
  server.close(() => {
    process.exit(2);
  });
});
