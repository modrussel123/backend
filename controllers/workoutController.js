const Workout = require('../models/Workout'); 
const User = require('../models/User');
const { JWT_SECRET } = require('../config/jwt.config');
const CompletedWorkout = require('../models/CompletedWorkout');

exports.getWorkouts = async (req, res) => {
    try {
        const user = req.user; // This comes from auth middleware
        if (!user) {
            return res.status(401).json({ error: "Authentication required" });
        }

        const workouts = await Workout.find({ userEmail: user.email });
        res.status(200).json(workouts);
    } catch (error) {
        console.error("Error fetching workouts:", error);
        res.status(500).json({ error: "Server error" });
    }
};

exports.createWorkout = async (req, res) => {
    try {
        // User data now comes from auth middleware
        const userId = req.user.userId;
        const user = await User.findById(userId);
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const workoutData = {
            ...req.body,
            userEmail: user.email
        };

        const workout = new Workout(workoutData);
        await workout.save();
        
        res.status(201).json({ 
            message: "Workout created successfully", 
            workout 
        });
    } catch (error) {
        console.error("Error creating workout:", error);
        res.status(500).json({ error: "Error creating workout" });
    }
};

exports.updateWorkout = async (req, res) => {
    try {
        // User data now comes from auth middleware
        const userId = req.user.userId;
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ error: "User not found" });

        // Prepare workout data
        const workoutData = {
            ...req.body,
            userEmail: user.email,
            sets: Number(req.body.sets),
            reps: Number(req.body.reps),
            weight: req.body.category === 'Bodyweight' ? 0 : Number(req.body.weight)
        };

        // Debug logging
        console.log('Updating workout:', workoutData);

        const updatedWorkout = await Workout.findOneAndUpdate(
            { _id: req.params.id, userEmail: user.email },
            workoutData,
            { 
                new: true,
                runValidators: true,
                context: 'query'
            }
        );

        if (!updatedWorkout) {
            return res.status(404).json({ error: "Workout not found or unauthorized" });
        }

        res.json(updatedWorkout);

    } catch (error) {
        console.error("Error updating workout:", error);
        if (error.name === 'ValidationError') {
            return res.status(400).json({ 
                error: Object.values(error.errors)
                    .map(err => err.message)
                    .join('. ')
            });
        }
        res.status(500).json({ error: "Error updating workout" });
    }
};

exports.deleteWorkout = async (req, res) => {
    try {
        // User data now comes from auth middleware
        const userId = req.user.userId;
        const user = await User.findById(userId);
        
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        const workout = await Workout.findOne({ 
            _id: req.params.id, 
            userEmail: user.email 
        });

        if (!workout) {
            return res.status(404).json({ error: "Workout not found or unauthorized" });
        }

        await Workout.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: "Workout deleted successfully" });

    } catch (error) {
        console.error("Error deleting workout:", error);
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ error: "Invalid token" });
        }
        if (error.name === 'CastError') {
            return res.status(400).json({ error: "Invalid workout ID" });
        }
        res.status(500).json({ error: "Error deleting workout" });
    }
};

// Add this new function to handle workout completion
exports.completeWorkout = async (req, res) => {
    try {
        const userId = req.user.userId;
        const user = await User.findById(userId);
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const workout = await Workout.findById(req.params.id);
        if (!workout || workout.userEmail !== user.email) {
            return res.status(404).json({ error: 'Workout not found or unauthorized' });
        }

        const completedWorkout = new CompletedWorkout({
            userEmail: user.email,
            workoutId: workout._id,
            name: workout.name,
            description: workout.description,
            category: workout.category,
            target: workout.target,
            exerciseName: workout.exerciseName,
            weightLifted: workout.category === 'Bodyweight' ? user.weight : workout.weight,
            setsCompleted: workout.sets,
            repsCompleted: workout.reps,
            completedDate: new Date()
        });

        await completedWorkout.save();
        
        res.status(200).json({ 
            message: "Workout marked as completed", 
            completedWorkout 
        });
    } catch (error) {
        console.error("Error completing workout:", error);
        res.status(500).json({ error: "Error marking workout as completed" });
    }
};

// Add endpoint to get completed workouts
exports.getCompletedWorkouts = async (req, res) => {
    try {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ error: "Authentication required" });
        }

        const completedWorkouts = await CompletedWorkout.find({ userEmail: user.email })
            .sort({ completedDate: -1 });
        res.status(200).json(completedWorkouts);
    } catch (error) {
        console.error("Error fetching completed workouts:", error);
        res.status(500).json({ error: "Server error" });
    }
};