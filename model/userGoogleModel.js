const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    nama: {
        type: String
    },
    googleID: {
        type: String,
        // required: true
    },
    facebookID: {
        type: String,
        // required: true
    },
    email: {
        type: String,
    },
    provider: {
        type: String
    },
    telpon: {
        type: String
    },
    image: {
        type: String
    },
    bagasi: [ //* Child Referencing. One to Few 
        {
            type: mongoose.Schema.ObjectId,
            ref: 'Bagasi'
        }
    ],
    order: [ //* Child Referencing. One to Few
        {
            type: mongoose.Schema.ObjectId,
            ref: 'Order'
        }
    ],
    orderBagasiId: Array,
});

const UserGoogle = mongoose.model('UserGoogle', userSchema);
module.exports = UserGoogle