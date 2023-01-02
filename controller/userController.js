const User = require('./../model/userModel');
const catchAsync = require('./../utility/catchAsync');
const AppError = require('./../utility/appError');

const filterBody = (obj, ...allowedFields) => {
    const newObj = {}
    Object.keys(obj).forEach(el => {
        if (allowedFields.includes(el)) newObj[el] = obj[el]
    });

    return newObj;
};

exports.profilSaya = catchAsync(async (req, res, next) => {
    const user = await User.findById(req.user.id).populate({
        path: 'bagasi order'
    })

    res.status(200).json({
        status: 'done',
        data: {
            user
        }
    });
});

exports.updateUser = catchAsync(async (req, res, next) => {
    //todo 1. Create error if user POSTs password data
    if (req.body.password || req.body.passwordConfirm) return next(new AppError('Updating for password on route /updatePassword', 401));

    //todo 2. Filter hanya object yang di inginkan
    // filterBody(req.body, 'nama', 'email', 'telpon');

    //todo 3. Update user document
    const updatedUser = await User.findByIdAndUpdate(req.user.id, {
        name: req.body.name,
        email: req.body.email,
        telpon: req.body.telpon
    }, {
        new: true,
        runValidators: true
    });

    res.status(201).json({
        status: 'done',
        data: {
            updatedUser
        }
    })
});

exports.hapusUser = catchAsync(async (req, res, next) => {
    // await User.findByIdAndDelete(req.user.id);
    await User.findByIdAndUpdate(req.user.id, { active: false });

    res.status(200).json({
        status: 'done',
        message: 'Selamat jalan 👋'
    })
})