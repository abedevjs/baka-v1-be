const mongoose = require('mongoose');
const Bagasi = require('./bagasiModel');
const User = require('./userModel');

const orderSchema = new mongoose.Schema({
    tanggalDibuat: {
        type: Date,
        default: Date.now()
    },
    jumlah: {
        type: Number,
        required: [true, 'Berapa jumlah bagasi yg Anda ingin beli?'],
        min: [1, 'Jumlah minimal 1']
    },
    isi: {
        type: String,
        required: [true, 'Apa isi bagasi Anda?'],
        trim: true,
        maxlength: 30,
    },
    biaya: {
        type: Number,//dari front end (form calculate sendiri)
        required: [true, 'Berapa biaya bagasi ini?'],
        min: 0
    },
    pembayaran: {//Upload bukti pembayaran
        type: String,
        default: 'Pembayaran akan di buat',
        select: false
    },
    status: {
        type: String,
        enum: {
            values: ['Booked', 'Confirmed', 'At Origin', 'Delivered', 'Canceled']
        },
        default: 'Booked'
    },
    active: {
        type: Boolean,
        select: true,
        default: true
    },
    owner: Object, //* Embedded. One to One. An Order only have one Owner/User
    bagasi: Object, //* Embedded. One to One. An Order only belong to one Bagasi
});

//! Document Middleware --start
orderSchema.post('save', async function () {
    const ownerId = this.owner._id;
    const bagasiId = this.bagasi._id;

    await Bagasi.findByIdAndUpdate(bagasiId, {
        $inc: {
            jumlah: -this.jumlah,
            booked: +this.jumlah,
            balance: +this.biaya
        },
        $push: {
            order: this._id
        }
    });

    await User.findByIdAndUpdate(ownerId, {
        $push: {
            order: this._id,
            orderBagasiId: this.bagasi._id
        }
    })
});

orderSchema.pre('updateOne', async function (next) { //* Ini untuk ketika sedang delete Order, jumlah, booked dan balance bagasinya ter update
    const currentDocument = this._update;

    currentDocument.active = false; //* nge set Order document active nya = false. Jadi documentnya tidak di delete, tetap di keep tapi tidak keluar saat di search.

    const bagasiId = currentDocument.bagasi._id;
    await Bagasi.findByIdAndUpdate(bagasiId, {
        $inc: {
            jumlah: +currentDocument.jumlah,
            booked: -currentDocument.jumlah,
            balance: -currentDocument.biaya
        },
    });

    next();
});
//! Document Middleware --end

//! Query Middleware --start
orderSchema.pre(/^find/, async function (next) {
    this.find({ active: { $ne: false } });

    next();
});
//! Query Middleware --end

const Order = mongoose.model('Order', orderSchema);
module.exports = Order;