const Weight = require('../models/Weight');
const User = require('../models/User');

exports.logWeight = async (req, res) => {
    try {
        const { weight } = req.body;
        const userId = req.user.userId;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Check if user has already logged weight today
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const hasLoggedToday = await Weight.findOne({
            userId,
            date: {
                $gte: today,
                $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
            }
        });

        if (hasLoggedToday) {
            return res.status(400).json({ 
                error: 'You have already logged your weight today. Please come back tomorrow!' 
            });
        }

        // Rest of validation logic
        const weightChange = Math.abs(weight - user.weight);

        if (weight > user.weight && weightChange > 1) {
            return res.status(400).json({ 
                error: 'Weight gain cannot exceed 1 kg per day' 
            });
        }

        if (weight < user.weight && weightChange > 2) {
            return res.status(400).json({ 
                error: 'Weight loss cannot exceed 2 kg per day' 
            });
        }

        // Update current weight
        user.weight = weight;
        await user.save();

        // Create new weight entry
        const newWeight = await Weight.create({
            userId,
            userEmail: user.email,
            weight: weight,
            date: new Date()
        });

        res.status(201).json({
            success: true,
            weight: newWeight,
            currentWeight: user.weight
        });
    } catch (error) {
        console.error('Error logging weight:', error);
        res.status(500).json({ error: error.message || 'Error logging weight' });
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