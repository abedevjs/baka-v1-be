exports.getHome = (req, res, next) => {

    res.status(200).json({
        status: 'done',
        requestedAt: req.time,
        message: 'This is the home page'
    });

};