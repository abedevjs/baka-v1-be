const mongoose = require('mongoose');
const User = require('./userModel');

const bagasiSchema = new mongoose.Schema({
    tanggalDibuat: {
        type: Date,
        default: Date.now(),
        select: false
    },
    dari: {
        type: String,
        required: [true, 'Bagasi ini berangkat dari mana?'],
    },
    tujuan: {
        type: String,
        required: [true, 'Bagasi ini berangkat lemana?'],
    },
    waktuBerangkat: {// YYYY-MM-DD
        type: Date,
        required: [true, 'Isi waktu keberangkatan'],
    },
    waktuTiba: {// YYYY-MM-DD
        type: Date,
        required: [true, 'Isi waktu tiba'],
    },
    initialKg: {
        type: Number,
        default: 0
    },
    availableKg: {
        type: Number,
        required: [true, 'Pastikan jumlah bagasi(Kg) yang dijual'],
        min: [0, 'Jumlah minimal 0'],
        max: [60, 'Jumlah maksimal 60'],
    },
    bookedKg: {
        type: Number,
        default: 0,
    },
    hargaRp: {
        type: Number,
        required: [true, 'Pastikan harga bagasi per Kg'],
        min: [1, 'Harga tidak valid']
    },
    balanceRp: {
        type: Number,
        default: 0,
    },
    adminFeeRp: {
        type: Number,
        default: 0
    },
    pesawat: {
        type: String,
        default: 'Maskapai akan di update manual oleh Admin'
        // required: [true, 'Sertakan nama pesawat yang ditumpangi']
    },
    dokumen: {//Upload bukti keberangkatan
        type: String,
        default: 'Upload document akan di cek manual oleh Admin',
        required: [true, 'Mohon upload tiket keberangkatan Kak']
        // select: false
    },
    catatan: {
        type: String,
        maxLength: [60, 'Pesan nya terlalu panjang kak']
    },
    status: {
        type: String,
        enum: {
            values: ['Scheduled', 'Opened', 'Closed', 'Canceled']
        },
        default: 'Scheduled'
    },
    active: {
        type: Boolean,
        select: true,
        default: true
    },
    owner: Object, //* Embedded. One to One. A bagasi has only one Owner/User
    order: [ //* Child Referencing. One to Few. A bagasi can be ordered mulitple times
        {
            type: mongoose.Schema.ObjectId,
            ref: 'Order'
        }
    ]
});

// bagasiSchema.index({ order: 1 }, { unique: true })

//! Document Middleware --start
bagasiSchema.pre('save', async function (next) {//* create a Reference document to Owner/User
    const ownerId = this.owner._id;

    this.initialKg = this.availableKg;

    await User.findByIdAndUpdate(ownerId, {
        $push: {
            bagasi: this._id
        }
    })

    next()
});
//! Document Middleware --end

//! Query Middleware --start
bagasiSchema.pre(/^find/, async function (next) {
    this.find({ active: { $ne: false } });

    next();
});
//! Query Middleware --end

const Bagasi = mongoose.model('Bagasi', bagasiSchema);
module.exports = Bagasi;