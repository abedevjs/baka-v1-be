const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: {
        type: String
    },
    email: {
        type: String
    },
    phone: {
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