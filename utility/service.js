const axios = require('axios');

exports.getGoogleOauthTokens = async (code) => {
    try {
        const URL = 'https://oauth2.googleapis.com/token';

        const values = {
            code,
            client_id: process.env.GOOGLE_CLIENT_ID,
            client_secret: process.env.GOOGLE_CLIENT_SECRET,
            redirect_uri: process.env.googleOauthRedirectUrl,
            grant_type: 'authorization_code'
        };

        const paramsString = new URLSearchParams(values);

        const res = await axios.post(URL, paramsString, {
            Headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        })

        return res.data;

    } catch (error) {
        console.log('😃 service.js error:', error);
    }
}

exports.getGoogleUser = async (id_token, access_token) => {
    try {
        const URL = `https://www.googleapis.com/oauth2/v1/userinfo?alt=json&access_token=${access_token}`;

        const res = await axios.get(URL, {
            Headers: {
                Authorization: `Bearer: ${id_token}`
            }
        })

        return res.data;

    } catch (error) {
        console.log('😃 service.js error:', error);
    }
}

//! Buat tombol di UI 'Login with Google'
//! Dalam tombol tersebut ada link href yang mengexecute code dibawah
const getGoogleOAuthURL = function () {
    const rootUrl = "https://accounts.google.com/o/oauth2/v2/auth";

    const options = {
        redirect_uri: process.env.redirect_uri,
        client_id: process.env.GOOGLE_CLIENT_ID,
        access_type: "offline",
        response_type: "code",
        prompt: "consent",
        scope: [
            "https://www.googleapis.com/auth/userinfo.profile",
            "https://www.googleapis.com/auth/userinfo.email",
        ].join(" "),
    };

    const qs = new URLSearchParams(options);

    return `${rootUrl}?${qs.toString()}`;
}