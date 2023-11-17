const mongoose = require("mongoose");
const crypto = require("crypto"); //NodeJS built-in password hasher
const validator = require("validator");
const bcrypt = require("bcryptjs");
const { reset } = require("nodemon");

const userSchema = new mongoose.Schema({
  tanggalDibuat: {
    type: Date,
    default: Date.now(),
  },
  nama: {
    type: String,
    required: [true, "Pelanggan wajib memberikan nama lengkap"],
  },
  email: {
    type: String,
    required: [true, "Mohon berikan email yang valid"],
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, "Mohon berikan email yang valid"],
    // select: false //Jika ini di aktifkan, route /lupaPassword tidak berfungsi
  },
  telpon: {
    type: String,
    // required: [true, 'Demi mudahnya komunikasi, mohon sertakan nomor Telepon/WhatsApp Kakak'],
    minLength: [8, "Nomor telpon minimal 8 digit ya Kak 😃"],
    maxLength: [17, "Nomor telpon maximal 17 digit ya Kak 😃"],
    // unique: true,
    // select: false,
  },
  password: {
    type: String,
    required: [true, "Password minimal 6 karakter"],
    minLength: [8, "Panjang password antara 8 - 20 karakter ya Kak 😃"],
    maxLength: [20, "Panjang password antara 8 - 20 karakter ya Kak 😃"],
    select: false,
  },
  passwordConfirm: {
    type: String,
    required: [true, "Mohon konfirmasi Password terlebih dahulu"], //ini maksudnya required input, bukan required persisted/tersimpan di database, karena nnti akan di hapus di pre hook  document middleware
    validate: {
      //This only works on CREATE and SAVE !!! not UPDATE (POST) or findByIdAndUpdate
      validator: function (el) {
        return el === this.password; //This.password refers to this document that currently being created or saved
      },
      message: "Konfirmasi password berbeda Kak 😢, mohon konfirmasi ulang.",
    },
    select: false, //biar ga show up in any output
  },
  dokumen: Array,
  bagasi: [
    //* Child Referencing. One to Few
    {
      type: mongoose.Schema.ObjectId,
      ref: "Bagasi",
    },
  ],
  order: [
    //* Child Referencing. One to Few
    {
      type: mongoose.Schema.ObjectId,
      ref: "Order",
    },
  ],
  orderBagasiId: Array,
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  active: {
    type: Boolean,
    select: true,
    default: true,
  },
});

userSchema.pre("save", async function (next) {
  //* The 'pre' on 'save' do get access on next(). The 'post' on 'save' does NOT get access on next().
  if (!this.isModified("password")) return next(); //Only run if password is modified

  this.password = await bcrypt.hash(this.password, 12);
  this.passwordConfirm = undefined;

  next();
});

userSchema.pre("save", function (next) {
  if (!this.isModified("password") || this.isNew) return next();

  this.passwordChangedAt = Date.now() - 1000; //! Inserting docs into db is slower than issuing a token

  next();
});

userSchema.methods.checkPassword = async function (
  candidatePassword,
  userPassword
) {
  //* Methods yg di create di schema/blueprint, bisa di pake oleh instances, di userController login
  return await bcrypt.compare(candidatePassword, userPassword);
};

userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    //Format date nya YYYY/MM/DD thn/bln/tgl
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );

    return JWTTimestamp < changedTimestamp;
  }

  return false;
};

userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString("hex"); //* Random token sederhana di create utk dikirim ke email client
  this.passwordResetToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex"); //* Random hashed token di simpan di db utk nanti di compare
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000; //Expires in 10 minutes

  return resetToken;
};

const User = mongoose.model("User", userSchema);
module.exports = User;
