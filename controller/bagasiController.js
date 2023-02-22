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
        select: '-tanggalDibuat -isi -biayaRp -owner -bagasi -__v'
    });

    if (!bagasi) return next(new AppError('Bagasi yang Kakak minta tidak tersedia 😢', 404))

    res.status(200).json({
        status: 'done',
        data: {
            bagasi
        }
    });
});

exports.createBagasi = catchAsync(async (req, res, next) => {
    //todo Preventing create more than 3 bagasi
    if (req.user.bagasi.length >= 3) return next(new AppError('Kakak hanya boleh memiliki 3 bagasi aktif yang terjual 😢', 403));

    const bagasi = await Bagasi.create({
        dari: req.body.dari,
        tujuan: req.body.tujuan,
        waktuKeberangkatan: req.body.waktuKeberangkatan,
        hargaRp: req.body.hargaRp,
        availableKg: req.body.availableKg,
        pesawat: req.body.pesawat,
        owner: await User.findById(req.user.id)
    });

    if (!bagasi) return next(new AppError('Terjadi kesalahan dalam mendaftarkan bagasi Kakak 😢', 400))

    res.status(201).json({
        status: 'done',
        data: {
            bagasi
        }
    });
})

exports.updateBagasi = catchAsync(async (req, res, next) => {
    const bagasi = await Bagasi.findById(req.params.id);

    //todo 1. Check Bagasi
    if (!bagasi) return next(new AppError('Bagasi yang kakak minta tidak tersedia 😢', 404));

    //todo 2. Check Owner.
    if (bagasi.owner._id.toString() !== req.user.id) return next(new AppError('Kakak bukan pemilik/penjual bagasi ini 😢. Akses di tolak ya Kak', 401));

    //todo 3. Check if ordered Bagasi is bigger than the new one, request denied.
    // console.log('😃', bagasi.bookedKg > req.body.availableKg, (req.body.availableKg == 60 && bagasi.initialKg == 60));
    if (bagasi.bookedKg > req.body.availableKg || (req.body.availableKg == 60 && bagasi.initialKg == 60) || ((bagasi.bookedKg + req.body.availableKg) - bagasi.bookedKg) > 60) return next(new AppError('Jumlah Bagasi yang telah dipesan lebih besar dari yang Kakak jual 😢. Jika mendesak, hubungi Admin.', 401));

    //todo 4. If all conditions above are fulfilled, update Bagasi
    const updatedBagasi = await Bagasi.findByIdAndUpdate(bagasi, {
        tanggalKeberangkatan: req.body.tanggalKeberangkatan,
        hargaRp: req.body.hargaRp,
        availableKg: req.body.availableKg,
        pesawat: req.body.pesawat,

    }, {
        new: true,
        runValidators: true
    });

    //todo 5. Update the quantities (InitialKg, availableKg) inside the updatedBagasi
    // console.log('🙃', `availableKg: ${Math.abs((bagasi.bookedKg - req.body.availableKg))}, InitialKg: ${bagasi.bookedKg + Math.abs((bagasi.bookedKg - req.body.availableKg))}`);
    const updateIncrement = await Bagasi.findByIdAndUpdate(updatedBagasi, {

        availableKg: Math.abs((bagasi.bookedKg - req.body.availableKg)),
        initialKg: bagasi.bookedKg + Math.abs((bagasi.bookedKg - req.body.availableKg)),

    }, {
        new: true,
        runValidators: true
    });

    if (!updatedBagasi || !updateIncrement) return next(new AppError('Terjadi kesalahan dalam proses update bagasi Kakak 😢', 400));

    res.status(200).json({
        status: 'done',
        data: {
            updatedBagasi
        }
    });
})

exports.deleteBagasi = catchAsync(async (req, res, next) => {

    //todo 1. Check Bagasi Id
    const id = await Bagasi.findById(req.params.id);
    if (!id) return next(new AppError('Bagasi yang Kakak minta tidak ditemukan 😢', 404));

    // todo 2. Check if he is the owner
    if (id.owner._id.toString() !== req.user.id) return next(new AppError('Kakak bukan pemilik/penjual bagasi ini 😢. Akses di tolak ya Kak', 401));

    // todo 3. Check if bagasi has been ordered, request denied
    if (id.bookedKg > 0) return next(new AppError('Bagasi yang sudah di booking oleh user lain tidak dapat di cancel ya Kak 😢. Hubungi Admin', 401));

    //todo 4. Delete bagasiId from User.bagasi
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
    if (!userBagasi || !bagasi) return next(new AppError('Terjadi kesalahan dalam menghapus bagasi Kakak 😢', 400));

    res.status(200).json({
        status: 'done',
        data: null
    });
});