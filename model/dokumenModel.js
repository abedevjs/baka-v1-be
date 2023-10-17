const mongoose = require("mongoose");

const dokumenSchema = new mongoose.Schema({
  tanggalDibuat: {
    type: Date,
    default: Date.now(),
    select: false,
  },
  nama: {
    type: String,
    default: "",
  },
});

const Dokumen = mongoose.model("Dokumen", dokumenSchema);
module.exports = Dokumen;
