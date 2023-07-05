const nodemailer = require('nodemailer');

const sendEmail = async options => {
    //todo 1. Create a transporter/mail service
    const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,//Gmail user have to activate 'Less secure app' option in his Gmail setting
        port: process.env.EMAIL_PORT,
        auth: {
            user: process.env.EMAIL_USERNAME,
            pass: process.env.EMAIL_PASSWORD
        }
    });

    // const transporter = nodemailer.createTransport({
    //     service: 'Gmail',//Gmail user have to activate 'Less secure app' option in his Gmail setting
    //     auth: {
    //         user: process.env.EMAIL_USERNAME,
    //         pass: process.env.EMAIL_PASSWORD
    //     }
    // });

    //todo 2. Define email options
    const mailOptions = {
        from: 'abe <abe@abe.io>',
        to: options.email,
        subject: options.subject,
        text: options.message,
        //html:
    };

    //todo 3. Send email
    console.log(mailOptions);
    await transporter.sendMail(mailOptions)

};

module.exports = sendEmail;