const Bagasi = require('./../model/bagasiModel');
const User = require('./../model/userModel')
const catchAsync = require('./../utility/catchAsync');
const AppError = require('./../utility/appError');

exports.getAllBagasi = catchAsync(async (req, res, next) => {
    let query = Bagasi.find();

    if (req.query) query = Bagasi.find(req.query);
    if (req.query.sort) query = query.sort(req.query.sort);
    if (req.query.fields) query = query.select(req.query.fields);
    if (req.query.page) {
        const page = req.query.page * 1 || 1;
        const limit = req.query.limit * 1 || 100;
        const skip = (page - 1) * limit;
        query = query.skip(skip).limit(limit);
    };

    const bagasi = await query;

    if (!bagasi) return next(new AppError('Hasil pencarian bagasi tidak tersedia', 404))

    res.status(200).json({
        status: 'done',
        result: bagasi.length,
        data: {
            bagasi
        }
    });
});


exports.getOneBagasi = catchAsync(async (req, res, next) => {
    const bagasi = await Bagasi.findById(req.params.id).populate({
        path: 'order',
        select: '-tanggalDibuat -isi -biaya -owner -bagasi -__v'
    });

    if (!bagasi) return next(new AppError('Bagasi yang Anda minta tidak tersedia', 404))

    res.status(200).json({
        status: 'done',
        data: {
            bagasi
        }
    });
});

exports.createBagasi = catchAsync(async (req, res, next) => {
    //todo Preventing create more than 3 bagasi
    if (req.user.bagasi.length >= 3) return next(new AppError('Kamu hanya boleh memiliki 3 bagasi aktif yang terjual', 403));

    const bagasi = await Bagasi.create({
        dari: req.body.dari,
        tujuan: req.body.tujuan,
        waktuKeberangkatan: req.body.waktuKeberangkatan,
        harga: req.body.harga,
        jumlah: req.body.jumlah,
        pesawat: req.body.pesawat,
        jumlah: req.body.jumlah,
        owner: await User.findById(req.user.id)
    });

    if (!bagasi) return next(new AppError('Terjadi kesalahan dalam mendaftarkan bagasi Anda', 400))

    res.status(201).json({
        status: 'done',
        data: {
            bagasi
        }
    });
})

exports.updateBagasi = catchAsync(async (req, res, next) => {
    const id = await Bagasi.findById(req.params.id);

    if (id.owner._id.toString() !== req.user.id) return next(new AppError('Anda bukan pemilik/penjual bagasi ini. Akses di tolak', 401));

    const bagasi = await Bagasi.findByIdAndUpdate(id, {
        tanggalKeberangkatan: req.body.tanggalKeberangkatan,
        harga: req.body.harga,
        jumlah: req.body.jumlah,
        pesawat: req.body.pesawat,
    },
        {
            new: true,
            runValidators: true
        });


    // console.log(bagasi.owner.id);

    if (!bagasi) return next(new AppError('Terjadi kesalahan dalam proses update bagasi Anda', 400));

    res.status(200).json({
        status: 'done',
        data: {
            bagasi
        }
    });
})

exports.deleteBagasi = catchAsync(async (req, res, next) => {

    //todo 1. Check Bagasi Id
    const id = await Bagasi.findById(req.params.id);
    if (!id) return next(new AppError('Bagasi yang Anda minta tidak ditemukan', 404));

    // todo 2. Check if he is the owner
    if (id.owner._id.toString() !== req.user.id) return next(new AppError('Anda bukan pemilik/penjual bagasi ini. Akses di tolak', 401));

    // todo 3. Check if bagasi has been ordered, request denied
    if (id.booked > 0) return next(new AppError('Bagasi yang sudah di booking oleh user lain tidak dapat di cancel. Hubungi Admin', 401));

    //todo 3. Delete bagasiId from User.bagasi
    const user = await User.findById(req.user.id);
    const userBagasi = await User.updateOne(user, {
        $pull: {
            bagasi: {
                $in: [req.params.id]
            }
        }
    });

    //todo 4. Delete bagasi document from Bagasi collection
    const bagasi = await Bagasi.findOneAndUpdate(id, { active: false });
    if (!userBagasi || !bagasi) return next(new AppError('Terjadi kesalahan dalam menghapus bagasi Anda', 400));

    res.status(200).json({
        status: 'done',
        data: null
    });
});