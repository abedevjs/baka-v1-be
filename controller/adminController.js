const Bagasi = require('./../model/bagasiModel');
const Order = require('./../model/orderModel');
const User = require('./../model/userModel');

const catchAsync = require('./../utility/catchAsync');
const AppError = require('./../utility/appError');

// const calculate = async (bagasiOrderArr, orderModel, orderField) => {
    
//     let valueArr = [];
//     let valueTotal = 0;
//     const bagOrderIds = Object.values(bagasiOrderArr).map(id => id);// '4f5sa', '87f5f'

//     await Promise.all(bagOrderIds.map(async (el) => {
//         let field = orderField
//         const val = (await orderModel.findById(el)).field;
//         valueArr.push(val);

//     }));

//     valueTotal = jumlah.reduce((acc, el) => acc + el, 0);

//     return valueTotal
// }

exports.updateBagasiStatus = catchAsync(async (req, res, next) => {
    //todo 1. Check Bagasi
    const bagasiID = await Bagasi.findById(req.params.id);
    if (!bagasiID) return next(new AppError('Bagasi yang Admin minta tidak tersedia 😢', 404));

    //todo 2. Update Bagasi.status
    const updateBagasi = await Bagasi.findByIdAndUpdate(bagasiID, {
        status: req.body.status
    }, {
        new: true,
        runValidators: true
    })

    if(!updateBagasi) return next(new AppError('Update status bagasi gagal', 400))

    res.status(200).json({
        status: 'Success',
        message: 'Dokumen penerbangan telah di verifikasi. Bagasi sudah bisa di order',
        statusBagasi: updateBagasi.status
    });
});

exports.activateOrder = catchAsync(async (req, res, next) => {

    //todo 1. Check Order
    const order = await Order.findById(req.params.id);
    if (!order) return next(new AppError('Order yang Admin minta tidak tersedia 😢', 404));

    //todo 2. Check Bagasi
    const bagasiID = order.bagasi._id;
    if (!bagasiID) return next(new AppError('BagasiID yang Admin minta tidak tersedia 😢', 404));

    //todo 3. Check Status. Only executed if Order.status = 'Preparing'. To prevent double calculation in Bagasi data.
    if((order.status !== 'Preparing')) return next(new AppError('Order.status must be: Preparing, pak Admin!. Order ini sudah pernah di activate 🙂', 401));

    //todo 4. Check no duplicate orderID in Bagasi.order array
    const bagasiOrderArray = await Bagasi.findById(bagasiID);
    if(bagasiOrderArray.order.includes(req.params.id)) {

        await Bagasi.findByIdAndUpdate(bagasiID, {
            $pull: {
                order: req.params.id
            }
        }, {
            new: true,
            runValidators: true
        })
    };
    
    //todo 5. Insert orderID ke Bagasi.order
    const currentBagasi = await Bagasi.findByIdAndUpdate(bagasiID, {
        $push: {
            order: req.params.id,
        }
    }, {
        new: true,
        runValidators: true
    });

    //todo 6. Calculate Kg and Rp di Bagasi.order.id (loop)
    const bagasiOrderIds = Object.values(currentBagasi.order).map(id => id);// '4f5sa', '87f5f'

        //todo 1. Calculate Kg in Bagasi.availableKg
        let jumlahKgArray = [];
        await Promise.all(bagasiOrderIds.map(async (el) => {
            const value = (await Order.findById(el)).jumlahKg;
            jumlahKgArray.push(value);
        }));
        const totalJumlahKg = jumlahKgArray.reduce((acc, el) => acc + el, 0)

        //todo 2. Calculate Rp in Bagasi.balanceRp
        let biayaRpArray = [];
        await Promise.all(bagasiOrderIds.map(async (el) => {
            const value = (await Order.findById(el)).biayaRp;
            biayaRpArray.push(value);
        }));
        const totalBiayaRp = biayaRpArray.reduce((acc, el) => acc + el, 0)

    //todo 7. Update the newly Kg to Bagasi
    const updatedKgBagasi = await Bagasi.findByIdAndUpdate(bagasiID, {
        availableKg: currentBagasi.initialKg - totalJumlahKg,
        bookedKg: totalJumlahKg,
        balanceRp: totalBiayaRp,
    }, {
        new: true,
        runValidators: true
    });

    //todo 8. Calculate Rp in Bagasi.adminFeeRp (balanceRp * tax)
    const totalAdminFeeRp = updatedKgBagasi.balanceRp * process.env.BAGASI_TAX;

    //todo 9. Calculate Rp in Bagasi.netRp (totalBalanceRp - totalAdminFeeRp)
    const totalNetRp = updatedKgBagasi.balanceRp - totalAdminFeeRp;

    // console.log(`🫠, totalBalanceRp: ${updatedKgBagasi.balanceRp}, totalAdminFeeRp: ${totalAdminFeeRp}, totalNetRp: ${totalNetRp}`);

    //todo 10. Update the newly Rp to Bagasi
    const updatedRpBagasi = await Bagasi.findByIdAndUpdate(bagasiID, {
        adminFeeRp: totalAdminFeeRp,
        netRp: totalNetRp
    }, {
        new: true,
        runValidators: true
    });

    //todo 12. Check and Update updatedKgBagasi.active to Bagasi
    if(updatedKgBagasi.availableKg == 0) {
        const updateBagasiStatus = await Bagasi.findByIdAndUpdate(bagasiID, { status: 'Closed' }, {
            new: true,
            runValidators: true
        });

        if(!updateBagasiStatus) return next(new AppError('Kesalahan dalam mengupdate status Bagasi', 500))
    }
    
    //todo 9. Update Order.status
    const updateOrderStatus = await Order.findByIdAndUpdate(order, {
        status: req.body.status
    },
        {
            new: true,
            runValidators: true
        }
    )
    if (!updatedKgBagasi || !updatedRpBagasi || !updateOrderStatus ) return next(new AppError('Update Bagasi tidak berhasil pak Admin! 😢', 404));
    
    res.status(200).json({
        status: 'Success',
        message: 'Pembayaran valid. Order berhasil di aktifkan',
        updatedAvailableKgBagasi: updatedKgBagasi.availableKg,
        updateOrderStatus: updateOrderStatus.status
    });
});