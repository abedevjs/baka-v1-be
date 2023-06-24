const Order = require('./../model/orderModel');
const User = require('./../model/userModel');
const Bagasi = require('./../model/bagasiModel')
const catchAsync = require('./../utility/catchAsync');
const AppError = require('./../utility/appError');
const multerUpload = require('../utility/multer');


exports.uploadMiddleware = multerUpload.single('dokumen'); 

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

    if (!order) return next(new AppError('Hasil pencarian order Kakak tidak tersedia 😢', 404));

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

    if (!order) return next(new AppError('Order yang Kakak minta tidak tersedia 😢', 404));

    res.status(200).json({
        status: 'done',
        result: order.length,
        data: {
            order
        }
    });
});

exports.createOrder = catchAsync(async (req, res, next) => {//* www.nama.com/bagasi/:bagasiId/order
    //todo 1. Upload file sudah di handle oleh midware multer di utility file

    //todo 2. Cek if the bagasi still exists
    const bagId = await Bagasi.findById(req.params.bagasiId);
    if (!bagId) return next(new AppError('Bagasi yang ingin Kakak order tidak tersedia 😢', 404));

    //todo 3. Cek owner bagasi tidak boleh order bagasi sendiri
    if (bagId.owner._id.toString() === req.user.id) return next(new AppError('Kakak tidak boleh membeli bagasi sendiri 😢', 403));

    //todo 4. Cek user tdk punya lebih dari 5 aktif order di bagasi yang berbeda2.
    if (req.user.order.length >= 5) return next(new AppError('Kakak hanya boleh memiliki 5 order aktif 😢', 403));

    //todo 5.PREVENTING USER TO ORDER THE SAME BAGASI TWICE. IN THE FUTURE, THIS COULD BE LIMITED TO 2-3 ORDERS PER 1 BAGASI
    if (req.user.orderBagasiId.includes(req.params.bagasiId)) return next(new AppError('Kakak sudah memesan bagasi ini, ingin mengupdate pesanan kak? 😃', 403));

    //todo 6. Cek if bagasi is overloaded, request denied
    if (bagId.availableKg < req.body.jumlahKg) return next(new AppError('Bagasi yang Kakak pesan telah memenuhi kapasitas 😢, koreksi jumlah pesanan nya ya Kak', 401));

    //todo 7. If User does not have telpon and he wont update (karena di model UserAuth telpon initially 0), return error.
    const user = await User.findById(req.user.id);

    if (!user.telpon) {
        const addTelponToUser = await User.findByIdAndUpdate(user, {
            telpon: req.body.telpon
        }, {
            new: true,
            runValidators: true,
        });
    
        if(!addTelponToUser.telpon) return next(new AppError('Sertakan nomor WhatsApp kak, agar mudah dihubungi 😢', 400));
        if(!addTelponToUser) return next(new AppError('Kesalahan dalam menambahkan nomor telpon Kakak 😢', 400));  
    };

    //todo 8. Check if the upload file not exceed than 5mb
    //* Sengaja di buatkan variable baru karena ada uploadMidware yg memblok proses jika user tdk upload dokumen,
    //* upload dokumen tetap wajib, tp di validate oleh mongoose.

    let updateDokumen = req.body.dokumen; 

    if(req.file) {
        updateDokumen = req.file.filename
        if(req.file.size > 5300880) return next(new AppError('Ukuran maksimal dokumen yang di upload hanya sampai 5mb saja Kakak 😢', 403));
    };

    //todo 9. Jika semua kondisi diatas terpenuhi, create order
    const order = await Order.create({
        jumlahKg: req.body.jumlahKg,
        isi: req.body.isi,
        biayaRp: req.body.biayaRp,
        dokumen: updateDokumen, //naming dokumen using the uploaded original file name
        catatan: req.body.catatan,
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
    //todo 1. Upload file sudah di handle oleh midware multer di utility file

    //todo 2. Check if Order is exist
    const order = await Order.findById(req.params.id);
    if (!order) return next(new AppError('Order yang Kakak minta tidak tersedia 😢', 404));

    //todo 3. Check if Bagasi is exist
    const bagasi = order.bagasi;
    const currentBagasi = await Bagasi.findById(bagasi._id)
    if (!currentBagasi) return next(new AppError('Bagasi yang kakak minta tidak tersedia 😢', 404))

    //todo 4. Check if User is owner
    if (order.owner._id.toString() !== req.user.id) return next(new AppError('Kakak bukan pemesan/pembeli bagasi ini 😢. Akses di tolak ya Kak', 401));

    //todo 5. Cek if bagasi is overloaded, request denied
    // req.body.jumlahKg = 46, order.jumlahKg = 15. currentBagasi.initialKg = 60, currentBagasi.avail = 15, currentBagasi.bookedKg = 45
    // console.log(`😂, req.body.jumlahKg:${req.body.jumlahKg}, order.jumlahKg:${order.jumlahKg}, currentBagasi.initialKg:${currentBagasi.initialKg}, currentBagasi.availableKg:${currentBagasi.availableKg}, currentBagasi.bookedKg:${currentBagasi.bookedKg},`);
    if ((order.jumlahKg + req.body.jumlahKg) > currentBagasi.availableKg && req.body.jumlahKg > (order.jumlahKg + currentBagasi.availableKg)) return next(new AppError('Bagasi yang Kakak pesan telah melebih kapasitas 😢, koreksi lagi jumlah pesanan nya ya Kak', 401))

    //todo 5. Check if user update the upload file, make sure it's not exceed than 5mb
    //* Sengaja di buatkan variable baru karena ada uploadMidware yg memblok proses jika user tdk upload dokumen,
    //* upload dokumen tetap wajib, tp di validate oleh mongoose.

    let updateDokumen = req.body.dokumen; 

    if(req.file) {
        updateDokumen = req.file.filename
        if(req.file.size > 5300880) return next(new AppError('Ukuran maksimal dokumen yang di upload hanya sampai 5mb saja Kakak 😢', 403));
    }

    //todo 6. Update Order
    const updatedOrder = await Order.findByIdAndUpdate(order, {
        jumlahKg: req.body.jumlahKg,
        isi: req.body.isi,
        biayaRp: req.body.biayaRp,
        dokumen: updateDokumen,
        catatan: req.body.catatan,

    },
        {
            new: true,
            runValidators: true
        }
    );

    //todo 6. Calculate total Jumlah dan balanceRp di Bagasi
    const bagOrderIds = Object.values(currentBagasi.order).map(id => id);// '4f5sa', '87f5f'

    let jumlah = [];
    await Promise.all(bagOrderIds.map(async (el) => {
        const val = (await Order.findById(el)).jumlahKg;
        jumlah.push(val);

    }));
    const totalJumlah = jumlah.reduce((acc, el) => acc + el, 0)

    let biaya = [];
    await Promise.all(bagOrderIds.map(async (el) => {
        const val = (await Order.findById(el)).biayaRp;
        biaya.push(val);

    }));
    const totalBiaya = biaya.reduce((acc, el) => acc + el, 0);

    //todo 7. Update Bagasi
    const updatedBagasi = await Bagasi.findByIdAndUpdate(bagasi._id, {

        availableKg: bagasi.initialKg - totalJumlah,
        bookedKg: totalJumlah,
        balanceRp: totalBiaya
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
    if (!order) return next(new AppError('Order yang Kakak minta tidak ditemukan 😢', 404));

    //todo 2. check if user is the owner
    if (order.owner._id.toString() !== req.user.id) return next(new AppError('Kakak bukan pemesan/pembeli order ini 😢. Akses di tolak ya Kak', 401));

    //todo 3. update jumlahKg bagasi di Bagasi dan hapus order dari Bagasi.order[id]
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

