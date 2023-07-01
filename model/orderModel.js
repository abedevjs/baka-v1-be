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
    adminFeeRp: {
        type: Number,
        default: 0
    },
    netRp: {
        type: Number,
        default: 0
    },
    dokumen: {//Upload bukti pembayaran
        type: String,
        default: '',
        // required: [true, 'Mohon upload bukti pembayaran Kak 🥲']
        // select: false
    },
    catatan: {
        type: String,
        maxLength: [60, 'Pesan nya terlalu panjang kak']
    },
    status: {
        type: String,
        enum: {
            values: ['Preparing', 'Ready', 'Delivered', 'Canceled']
        },
        default: 'Preparing'
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
orderSchema.post('save', async function () {//* Referencing orderId and orderBagasiId to User.order and User.orderBagasiId
    const ownerId = this.owner._id;
    // const bagasiId = this.bagasi._id;

    // await Bagasi.findByIdAndUpdate(bagasiId, {//* Manipulating Bagasi data. Fn ini di pindah, di handle langsung oleh Admin
    //     $inc: {
    //         availableKg: -this.jumlahKg,
    //         bookedKg: +this.jumlahKg,
    //         balanceRp: +this.biayaRp
    //     },
    //     $push: {
    //         order: this._id
    //     }
    // });

    await User.findByIdAndUpdate(ownerId, {
        $push: {
            order: this._id,
            orderBagasiId: this.bagasi._id
        }
    })
});

//* Ini untuk ketika sedang delete Order, availableKg, bookedKg dan balanceRp bagasinya ter update. Fn ini di called di orderController.deleteOrder()
//* Reason this code is deleted: Operasional modifikasi bagasi ($inc) hanya dilakukan oleh Admin
// orderSchema.pre('updateOne', async function (next) {
//     const currentDocument = this._conditions;

//     const bagasiId = currentDocument.bagasi._id;
//     await Bagasi.findByIdAndUpdate(bagasiId, {
//         $inc: {
//             availableKg: +currentDocument.jumlahKg,
//             bookedKg: -currentDocument.jumlahKg,
//             balanceRp: -currentDocument.biayaRp
//         },
//     });

//     next();
// });
//! Document Middleware --end

//! Query Middleware --start
orderSchema.pre(/^find/, async function (next) {
    this.find({ active: { $ne: false } });

    next();
});
//! Query Middleware --end

const Order = mongoose.model('Order', orderSchema);
module.exports = Order;