const Weight = require('../models/Weight');
const User = require('../models/User');

exports.logWeight = async (req, res) => {
    try {
        const { weight } = req.body;
        const userId = req.user.userId;

        if (weight > 500) {
            return res.status(400).json({ error: 'Weight cannot exceed 500 kg' });
        }

        const user = await User.findById(userId);
        
        // Update user's current weight
        user.weight = weight;
        await user.save();

        const newWeight = await Weight.create({
            userId,
            userEmail: user.email,
            weight
        });

        res.status(201).json({ 
            weight: newWeight,
            currentWeight: user.weight
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getWeightHistory = async (req, res) => {
    try {
        const weights = await Weight.find({ userId: req.user.userId })
            .sort({ date: -1 });
        res.json(weights);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.deleteWeight = async (req, res) => {
    try {
        const { id } = req.params;
        const weight = await Weight.findOneAndDelete({
            _id: id,
            userId: req.user.userId
        });

        if (!weight) {
            return res.status(404).json({ error: 'Weight record not found' });
        }

        res.json({ message: 'Weight record deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};