const CryptoJS = require("crypto-js");

//* https://github.com/brix/crypto-js

// Encrypt
exports.encode = function (dataObj) {
  return CryptoJS.AES.encrypt(
    JSON.stringify(dataObj),
    process.env.CRYPTOJS_SECRET_KEY
  ).toString();
};

// Decrypt
exports.decode = function (encryptedData) {
  const bytes = CryptoJS.AES.decrypt(
    encryptedData,
    process.env.CRYPTOJS_SECRET_KEY
  );
  const decryptedData = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));

  return decryptedData;
};
