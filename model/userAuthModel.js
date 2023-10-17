const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  timeCreated: {
    type: Date,
    default: Date.now,
  },
  nama: {
    type: String,
  },
  googleID: {
    type: String,
    // required: true
  },
  facebookID: {
    type: String,
    // required: true
  },
  email: {
    type: String,
  },
  provider: {
    type: String,
  },
  telpon: {
    type: String,
    default: "",
  },
  image: {
    type: String,
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
  active: {
    type: Boolean,
    // select: true,
    // default: true,
  },
});

//! Document Middleware --start
userSchema.pre("save", async function (next) {
  this.active = true;

  next();
});
//! Document Middleware --end

const UserAuth = mongoose.model("UserAuth", userSchema);
module.exports = UserAuth;
