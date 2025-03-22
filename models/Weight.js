const mongoose = require('mongoose');

const WeightSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    userEmail: {
        type: String,
        required: true
    },
    weight: {
        type: Number,
        required: true,
        max: [500, 'Weight cannot exceed 500 kg'],
        min: [40, 'Weight cannot be less than 40 kg']
    },
    date: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Weight', WeightSchema);