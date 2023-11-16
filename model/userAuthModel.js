const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  tanggalDibuat: {
    type: Date,
    default: Date.now(),
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
  rekeningNomor: {
    type: String,
    default: "",
  },
  rekeningBank: {
    type: String,
    default: "",
  },
  dokumen: Array, //* We push documentNames into this array via uploadController.updateUploadDokumen
  bagasi: [
    //* Child Referencing. One to Few
    //* We push bagasiIDs into this array via BagasiModel pre save document middleware
    {
      type: mongoose.Schema.ObjectId,
      ref: "Bagasi",
    },
  ],
  order: [
    //* Child Referencing. One to Few
    //* We push orderIDs into this array via OrderModel post save document middleware
    {
      type: mongoose.Schema.ObjectId,
      ref: "Order",
    },
  ],
  orderBagasiId: Array, //* We push orderIDs into this array via OrderModel post save document middleware
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
