const mongoose = require('mongoose');
const Bagasi = require('./bagasiModel');
const User = require('./userModel');

const orderSchema = new mongoose.Schema({
    tanggalDibuat: {
        type: Date,
        default: Date.now()
    },
    jumlahKg: {
        type: Number,
        required: [true, 'Berapa jumlahKg bagasi yg ingin Kakak beli?'],
        min: [1, 'jumlahKg minimal 1']
    },
    isi: {
        type: String,
        required: [true, 'Isi dulu Bagasi nya ya Kak 😃'],
        trim: true,
        maxLength: 30,
    },
    biayaRp: {
        type: Number,//dari front end (form calculate sendiri)
        required: [true, 'Berapa biayaRp bagasi ini?'],
        min: 0
    },
    pembayaran: {//Upload bukti pembayaran
        type: String,
        default: 'Pembayaran akan di buat',
        select: false
    },
    catatan: {
        type: String,
        maxLength: [60, 'Pesan nya terlalu panjang kak']
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
            availableKg: -this.jumlahKg,
            bookedKg: +this.jumlahKg,
            balanceRp: +this.biayaRp
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

orderSchema.pre('updateOne', async function (next) { //* Ini untuk ketika sedang delete Order, availableKg, bookedKg dan balanceRp bagasinya ter update. Fn ini di called di orderController.deleteOrder()
    const currentDocument = this._conditions;

    const bagasiId = currentDocument.bagasi._id;
    await Bagasi.findByIdAndUpdate(bagasiId, {
        $inc: {
            availableKg: +currentDocument.jumlahKg,
            bookedKg: -currentDocument.jumlahKg,
            balanceRp: -currentDocument.biayaRp
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