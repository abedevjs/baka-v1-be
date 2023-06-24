const Bagasi = require('./../model/bagasiModel');
const User = require('./../model/userModel')
const catchAsync = require('./../utility/catchAsync');
const AppError = require('./../utility/appError');
const multerUpload = require('../utility/multer');


exports.uploadMiddleware = multerUpload.single('dokumen'); 

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
    //todo 1. Upload file sudah di handle oleh midware multer di utility file

    //todo 2. Preventing create more than 3 bagasi
    if (req.user.bagasi.length >= 3) return next(new AppError('Kakak hanya boleh memiliki 3 bagasi aktif yang terjual 😢', 403));

    //todo 3. If User does not have telpon and he wont update (karena di model UserAuth telpon initially 0), return error.
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

    //todo 4. Check if the upload file not exceed than 5mb
    //* Sengaja di buatkan variable baru karena ada uploadMidware yg memblok proses jika user tdk upload dokumen,
    //* upload dokumen tetap wajib, tp di validate oleh mongoose.

    let updateDokumen = req.body.dokumen; 

    if(req.file) {
        updateDokumen = req.file.filename
        if(req.file.size > 5300880) return next(new AppError('Ukuran maksimal dokumen yang di upload hanya sampai 5mb saja Kakak 😢', 403));
    };
    
    //todo 5. If all those conditions above is fulfilled, create new Bagasi.
    const bagasi = await Bagasi.create({
        dari: req.body.dari,
        tujuan: req.body.tujuan,
        waktuBerangkat: req.body.waktuBerangkat,
        waktuTiba: req.body.waktuTiba,
        hargaRp: req.body.hargaRp,
        availableKg: req.body.availableKg,
        dokumen: updateDokumen, //naming dokumen using the uploaded original file name
        catatan: req.body.catatan,
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
    //todo 1. Upload file sudah di handle oleh midware multer di utility file

    //todo 2. Check Bagasi
    const bagasi = await Bagasi.findById(req.params.id);
    if (!bagasi) return next(new AppError('Bagasi yang kakak minta tidak tersedia 😢', 404));

    //todo 3. Check Owner.
    if (bagasi.owner._id.toString() !== req.user.id) return next(new AppError('Kakak bukan pemilik/penjual bagasi ini 😢. Akses di tolak ya Kak', 401));

    //todo 4. Check if ordered Bagasi is bigger than the new one, request denied.
    // console.log('😃', req.body.availableKg <= 60);
    if (bagasi.bookedKg > req.body.availableKg || (req.body.availableKg == 60 && bagasi.initialKg == 60) || ((bagasi.bookedKg + req.body.availableKg) - bagasi.bookedKg) > 60) return next(new AppError('Jumlah Bagasi yang dijual melebihi batas maksimal (60Kg) atau Bagasi yang telah dipesan lebih besar dari yang Kakak jual 😢. Jika mendesak, hubungi Admin.', 401));
    
    //todo 5. Check if user update the upload file, make sure it's not exceed than 5mb
    //* Sengaja di buatkan variable baru karena ada uploadMidware yg memblok proses jika user tdk upload dokumen,
    //* upload dokumen tetap wajib, tp di validate oleh mongoose.

    let updateDokumen = req.body.dokumen; 

    if(req.file) {
        updateDokumen = req.file.filename
        if(req.file.size > 5300880) return next(new AppError('Ukuran maksimal dokumen yang di upload hanya sampai 5mb saja Kakak 😢', 403));
    }

    //todo 6. If all conditions above are fulfilled, update Bagasi
    const updatedBagasi = await Bagasi.findByIdAndUpdate(bagasi, {
        waktuBerangkat: req.body.waktuBerangkat,
        waktuTiba: req.body.waktuTiba,
        hargaRp: req.body.hargaRp,
        availableKg: req.body.availableKg,
        dokumen: updateDokumen,
        catatan: req.body.catatan,
    }, {
        new: true,
        runValidators: true
    });

    //todo 7. Update the quantities (InitialKg, availableKg) inside the updatedBagasi
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