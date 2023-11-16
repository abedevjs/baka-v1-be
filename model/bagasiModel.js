const mongoose = require("mongoose");
const User = require("./userModel");
const UserAuth = require("./userAuthModel");

const bagasiSchema = new mongoose.Schema({
  tanggalDibuat: {
    type: Date,
    default: Date.now(),
  },
  dari: {
    type: String,
    required: [true, "Bagasi ini berangkat dari mana?"],
  },
  alamatDari: {
    type: String,
    required: [true, "Tulis alamat dimana pembeli bagasi mengirim titipannya"],
    minLength: [
      process.env.MIN_LENGTH_ALAMAT,
      `Minimal panjang alamat kota asal yang diperbolehkan hanya ${process.env.MIN_LENGTH_ALAMAT} karakter kak `,
    ],
    maxLength: [
      process.env.MAX_LENGTH_ALAMAT,
      `Maksimal panjang alamat kota asal yang diperbolehkan hanya ${process.env.MAX_LENGTH_ALAMAT} karakter kak`,
    ],
  },
  tujuan: {
    type: String,
    required: [true, "Bagasi ini berangkat kemana?"],
  },
  alamatTujuan: {
    type: String,
    required: [true, "Tulis alamat dimana pembeli bagasi mengambil titipannya"],
    minLength: [
      process.env.MIN_LENGTH_ALAMAT,
      `Minimal panjang alamat kota tujuan yang diperbolehkan hanya ${process.env.MIN_LENGTH_ALAMAT} karakter kak `,
    ],
    maxLength: [
      process.env.MAX_LENGTH_ALAMAT,
      `Maksimal panjang alamat kota tujuan yang diperbolehkan hanya ${process.env.MAX_LENGTH_ALAMAT} karakter kak`,
    ],
  },
  waktuBerangkat: {
    // YYYY-MM-DD
    type: Date,
    required: [true, "Isi waktu keberangkatan"],
  },
  waktuTiba: {
    // YYYY-MM-DD
    type: Date,
    required: [true, "Isi waktu tiba"],
  },
  initialKg: {
    type: Number,
    default: 0,
  },
  availableKg: {
    type: Number,
    required: [true, "Pastikan jumlah bagasi(Kg) yang dijual"],
    min: [
      process.env.MIN_BAGASI_KG,
      `Jumlah minimal bagasi ${process.env.MIN_BAGASI_KG} Kg`,
    ],
    max: [
      process.env.MAX_BAGASI_KG,
      `Jumlah maksimal bagasi ${process.env.MAX_BAGASI_KG} kg`,
    ],
  },
  bookedKg: {
    type: Number,
    default: 0,
  },
  hargaRp: {
    type: Number,
    required: [true, "Pastikan harga bagasi per Kg"],
    min: [1, "Harga tidak valid"],
  },
  balanceRp: {
    type: Number,
    default: 0,
  },
  adminFeeRp: {
    type: Number,
    default: 0,
  },
  netRp: {
    type: Number,
    default: 0,
  },
  pesawat: {
    type: String,
    default: "",
    // required: [true, 'Sertakan nama pesawat yang ditumpangi']
  },
  dokumen: {
    //* We insert/create the document name in this property via adminController.updateBagasiStatus
    //Upload bukti keberangkatan
    type: String,
    default: "",
    // required: [true, 'Mohon upload tiket keberangkatan Kak']
    // select: false
  },
  catatan: {
    type: String,
    maxLength: [
      process.env.MAX_LENGTH_CATATAN,
      `Maksimal panjang catatan yang diperbolehkan hanya ${process.env.MAX_LENGTH_CATATAN} kak`,
    ],
  },
  status: {
    type: String,
    enum: {
      values: ["Scheduled", "Opened", "Closed", "Unloaded", "Canceled"],
    },
    default: "Scheduled",
  },
  active: {
    type: Boolean,
    select: true,
    default: true,
  },
  owner: Object, //* Embedded. One to One. A bagasi has only one Owner/User. We insert the userModel/Obj in this property via bagasiController.createBagasi
  order: [
    //* Child Referencing. One to Few. A bagasi can be ordered mulitple times
    //* We push orderID into this array in the adminController.activateOrder
    {
      type: mongoose.Schema.ObjectId,
      ref: "Order",
    },
  ],
});

// bagasiSchema.index({ order: 1 }, { unique: true })

//! Document Middleware --start
bagasiSchema.pre("save", async function (next) {
  //* create a Reference document to Owner/User
  const ownerId = this.owner._id;

  this.initialKg = this.availableKg;

  await UserAuth.findByIdAndUpdate(ownerId, {
    $push: {
      bagasi: this._id,
    },
  });

  next();
});
//! Document Middleware --end

//! Query Middleware --start
bagasiSchema.pre(/^find/, async function (next) {
  this.find({ active: { $ne: false } });

  next();
});
//! Query Middleware --end

const Bagasi = mongoose.model("Bagasi", bagasiSchema);
module.exports = Bagasi;
