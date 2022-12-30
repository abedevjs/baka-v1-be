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
    waktuKeberangkatan: {// YYYY-MM-DD
        type: Date,
        required: [true, 'Isi waktu keberangkatan'],
    },
    harga: {
        type: Number,
        required: [true, 'Pastikan harga bagasi per Kg'],
        min: [1, 'Harga tidak valid']
    },
    initial: {
        type: Number,
        default: 0
    },
    jumlah: {
        type: Number,
        required: [true, 'Pastikan jumlah bagasi(Kg) yang dijual'],
        min: [0, 'Jumlah minimal 0'],
    },
    booked: {
        type: Number,
        default: 0,
    },
    balance: {
        type: Number,
        default: 0,
    },
    pesawat: {
        type: String,
        required: [true, 'Sertakan nama pesawat yang ditumpangi']
    },
    dokumen: {//Upload bukti keberangkatan
        type: String,
        default: 'Upload document akan di buat',
        select: false
    },
    status: {
        type: String,
        enum: {
            values: ['Scheduled', 'Loading', 'Full', 'Departed', 'Arrived', 'Canceled']
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

    this.initial = this.jumlah;

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