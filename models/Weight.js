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
        min: [0, 'Weight cannot be negative']
    },
    date: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Weight', WeightSchema);