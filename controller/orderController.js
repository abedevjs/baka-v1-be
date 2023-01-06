const Order = require('./../model/orderModel');
const User = require('./../model/userModel');
const Bagasi = require('./../model/bagasiModel')
const catchAsync = require('./../utility/catchAsync');
const AppError = require('./../utility/appError');
const { hapusUser } = require('./userController');

exports.getAllOrder = catchAsync(async (req, res, next) => {
    let query = Order.find();

    if (req.query) query = Order.find(req.query);
    if (req.query.sort) query = query.sort(req.query.sort);
    if (req.query.fields) query = query.select(req.query.fields);
    if (req.query.page) {
        const page = req.query.page * 1 || 1;
        const limit = req.query.limit * 1 || 100;
        const skip = (page - 1) * limit;
        query = query.skip(skip).limit(limit);
    };

    const order = await query;

    if (!order) return next(new AppError('Hasil pencarian order Anda tidak tersedia', 404));

    res.status(200).json({
        status: 'done',
        result: order.length,
        data: {
            order
        }
    });

});

exports.getOneOrder = catchAsync(async (req, res, next) => {
    const order = await Order.findById(req.params.id);

    if (!order) return next(new AppError('Order yang Anda minta tidak tersedia', 404));

    res.status(200).json({
        status: 'done',
        result: order.length,
        data: {
            order
        }
    });
});

exports.createOrder = catchAsync(async (req, res, next) => {//* www.nama.com/bagasi/:bagasiId/order

    const bagId = await Bagasi.findById(req.params.bagasiId);
    if (!bagId) return next(new AppError('Bagasi yang ingin Anda order tidak tersedia', 404));

    //todo 1. Cek owner bagasi tidak boleh order bagasi sendiri
    if (bagId.owner._id.toString() === req.user.id) return next(new AppError('Anda tidak boleh membeli bagasi sendiri', 403));

    //todo 2. Cek user tdk punya lebih dari 5 aktif order
    if (req.user.order.length >= 5) return next(new AppError('Kamu hanya boleh memiliki 5 order aktif', 403));

    //todo 3.PREVENTING USER TO ORDER THE SAME BAGASI TWICE. IN THE FUTURE, THIS COULD BE LIMITED TO 2-3 ORDERS PER 1 BAGASI
    if (req.user.orderBagasiId.includes(req.params.bagasiId)) return next(new AppError('Kamu sudah memesan bagasi ini, ingin mengupdate pesanan?', 403));

    //todo 4. Cek if bagasi is overloaded, request denied
    if (bagId.available < req.body.jumlah) return next(new AppError('Bagasi yang Anda pesan telah memenuhi kapasitas, koreksi jumlah pesanan Anda', 401));

    //todo 5. Jika semua kondisi diatas terpenuhi, create order
    const order = await Order.create({
        jumlah: req.body.jumlah,
        isi: req.body.isi,
        biaya: req.body.biaya,
        owner: await User.findById(req.user.id), //* Embedding
        bagasi: await Bagasi.findById(bagId), //* Embedding
    });

    if (!order) return next(new AppError('Kesalahan dalam membuat order', 400));

    res.status(201).json({
        status: 'done',
        requestedAt: req.time,
        data: {
            order
        }
    });
});

exports.updateOrder = catchAsync(async (req, res, next) => {//* {{URL}}/order/634a9ae426fc2de08774ae4a
    //todo 1. Check if Order is exist
    const order = await Order.findById(req.params.id);
    if (!order) return next(new AppError('Order yang Anda minta tidak tersedia', 404));

    //todo 2. Check if Bagasi is exist
    const bagasi = order.bagasi;
    const currentBagasi = await Bagasi.findById(bagasi._id)
    if (!currentBagasi) return next(new AppError('Bagasi yang kakak minta tidak tersedia 😢', 404))

    //todo 3. Check if User is owner
    if (order.owner._id.toString() !== req.user.id) return next(new AppError('Anda bukan pemesan/pembeli bagasi ini. Akses di tolak', 401));

    //todo 4. Cek if bagasi is overloaded, request denied
    // req.body.jumlah = 46, order.jumlah = 15. currentBagasi.initial = 60, currentBagasi.avail = 15, currentBagasi.booked = 45
    // console.log(`😂, req.body.jumlah:${req.body.jumlah}, order.jumlah:${order.jumlah}, currentBagasi.initial:${currentBagasi.initial}, currentBagasi.available:${currentBagasi.available}, currentBagasi.booked:${currentBagasi.booked},`);
    if ((order.jumlah + req.body.jumlah) > currentBagasi.available && req.body.jumlah > (order.jumlah + currentBagasi.available)) return next(new AppError('Bagasi yang Anda pesan telah melebih kapasitas, koreksi jumlah pesanan Anda', 401))


    //todo 5. Update Order
    const updatedOrder = await Order.findByIdAndUpdate(order, {
        jumlah: req.body.jumlah,
        isi: req.body.isi,
        biaya: req.body.biaya,

    },
        {
            new: true,
            runValidators: true
        }
    );

    //todo 6. Calculate total Jumlah dan Balance di Bagasi
    const bagOrderIds = Object.values(currentBagasi.order).map(id => id);// '4f5sa', '87f5f'

    let jumlah = [];
    await Promise.all(bagOrderIds.map(async (el) => {
        const val = (await Order.findById(el)).jumlah;
        jumlah.push(val);

    }));
    const totalJumlah = jumlah.reduce((acc, el) => acc + el, 0)

    let biaya = [];
    await Promise.all(bagOrderIds.map(async (el) => {
        const val = (await Order.findById(el)).biaya;
        biaya.push(val);

    }));
    const totalBiaya = biaya.reduce((acc, el) => acc + el, 0);

    //todo 7. Update Bagasi
    const updatedBagasi = await Bagasi.findByIdAndUpdate(bagasi._id, {

        available: bagasi.initial - totalJumlah,
        booked: totalJumlah,
        balance: totalBiaya
    });

    if (!updatedOrder || !updatedBagasi) return next(new AppError('Kesalahan dalam memperbaharui order', 400));

    res.status(200).json({
        status: 'done',
        requestedAt: req.time,
        data: {
            updatedOrder
        }
    });
});

exports.deleteOrder = catchAsync(async (req, res, next) => { //* {{URL}}/order/634d1e13fc881dd5c6208968

    //todo 1. Check Order Id
    const order = await Order.findById(req.params.id);
    if (!order) return next(new AppError('Order yang Anda minta tidak ditemukan', 404));

    //todo 2. check if user is the owner
    if (order.owner._id.toString() !== req.user.id) return next(new AppError('Anda bukan pemesan/pembeli order ini. Akses di tolak', 401));

    //todo 3. update jumlah bagasi di Bagasi dan hapus order dari Bagasi.order[id]
    const bagasiId = order.bagasi._id;
    const bagasi = await Bagasi.findById(bagasiId)
    const bagasiOrder = await Bagasi.updateOne(bagasi, { //*hapus order dari Bagasi.order[id]
        $pull: {
            order: {
                $in: [req.params.id]
            }
        }
    });

    //todo 4 and 5. hapus order dari User.order[id] dan Hapus bagasiId dari User.orderBagasiId[id]
    const user = await User.findById(req.user.id);
    const userOrder = await User.updateOne(user, {
        $pull: {
            order: {
                $in: [req.params.id]
            },
            orderBagasiId: {
                $in: [order.bagasi._id]
            }
        }
    });

    //todo 6. Update Order dari Order collection ke active: false (liat Document Middleware di Order Model)
    // const deleteOrder = await Order.findByIdAndDelete(req.params.id);
    // const deleteOrder = await Order.findOneAndUpdate(req.params.id);
    // const deleteOrder = await Order.deleteOne({ _id: req.params.id });
    // const deleteOrder = await Order.findByIdAndUpdate(req.params.id, { active: false });
    const deleteOrder = await Order.updateOne(order, { active: false });

    if (!bagasiOrder || !userOrder || !deleteOrder) return next(new AppError('Kesalahan dalam menghapus order', 400));

    res.status(200).json({
        status: 'done',
        data: null
    });
});

