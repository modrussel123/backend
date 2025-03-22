const Weight = require('../models/Weight');
const User = require('../models/User');
const Streak = require('../models/Streak');
const Workout = require('../models/Workout');
const CompletedWorkout = require('../models/CompletedWorkout');

exports.getWeightLossLeaderboard = async (req, res) => {
    try {
        const users = await User.find()
            .select('firstName lastName email profilePicture weight initialWeight')
            .lean();
        
        const weightHistories = await Weight.find({}).sort({ date: -1 });

        // Get current week's date range
        const today = new Date();
        const startOfWeek = new Date(today);
        startOfWeek.setHours(0, 0, 0, 0);
        startOfWeek.setDate(today.getDate() - today.getDay()); // Start of week (Sunday)

        const leaderboardData = await Promise.all(users.map(async (user) => {
            const userWeights = weightHistories.filter(w => w.userEmail === user.email);
            
            if (userWeights.length === 0) return null;

            const startingWeight = user.initialWeight || userWeights[userWeights.length - 1].weight;
            const currentWeight = userWeights[0].weight;

            // Count unique days in current week
            const daysThisWeek = new Set(
                userWeights
                    .filter(w => new Date(w.date) >= startOfWeek)
                    .map(w => new Date(w.date).toDateString())
            ).size;

            // Calculate bonus based on current week's activity
            let consistencyBonus = 0;
            if (daysThisWeek >= 5) {
                consistencyBonus = 0.5; // 50% bonus
            } else if (daysThisWeek >= 3) {
                consistencyBonus = 0.25; // 25% bonus
            } else if (daysThisWeek >= 1) {
                consistencyBonus = 0.1; // 10% bonus
            }

            const weightLoss = startingWeight - currentWeight;
            const totalScore = weightLoss * (1 + consistencyBonus);

            return {
                _id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                profilePicture: user.profilePicture,
                startingWeight,
                currentWeight,
                weightLoss,
                consistencyBonus,
                weighInDays: daysThisWeek,
                totalScore
            };
        }));

        const filteredAndSorted = leaderboardData
            .filter(entry => entry !== null)
            .sort((a, b) => b.totalScore - a.totalScore)
            .slice(0, 10);

        res.json(filteredAndSorted);
    } catch (error) {
        console.error('Leaderboard error:', error);
        res.status(500).json({ error: 'Failed to fetch leaderboard data' });
    }
};

exports.getStrengthLeaderboard = async (req, res) => {
    try {
        // Get all users with their weights
        const users = await User.find()
            .select('firstName lastName email profilePicture weight')
            .lean();

        // Get all completed workouts
        const completedWorkouts = await CompletedWorkout.find({})
            .sort({ completedDate: -1 })
            .lean();

        const leaderboardData = users.map(user => {
            // Get all completed workouts for this user
            const userWorkouts = completedWorkouts.filter(w => w.userEmail === user.email);
            
            if (userWorkouts.length === 0) return null;

            // Calculate total strength score using completed workouts
            let totalStrengthScore = userWorkouts.reduce((total, workout) => {
                // For bodyweight exercises, use user's current weight
                const weight = workout.category === 'Bodyweight' 
                    ? (user.weight || 0) 
                    : workout.weightLifted;
                
                return total + (weight * workout.setsCompleted * workout.repsCompleted);
            }, 0);

            // Ensure totalStrengthScore is a number
            totalStrengthScore = Number(totalStrengthScore) || 0;

            return {
                _id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                profilePicture: user.profilePicture,
                strengthScore: totalStrengthScore,
                workoutCount: userWorkouts.length,
                totalVolume: totalStrengthScore.toFixed(2)
            };
        });

        const filteredAndSorted = leaderboardData
            .filter(entry => entry !== null)
            .sort((a, b) => b.strengthScore - a.strengthScore)
            .slice(0, 10);

        res.json(filteredAndSorted);
    } catch (error) {
        console.error('Strength leaderboard error:', error);
        res.status(500).json({ error: 'Failed to fetch strength leaderboard data' });
    }
};

// Add this function alongside existing ones
exports.getConsistencyLeaderboard = async (req, res) => {
    try {
        const users = await User.find()
            .select('firstName lastName email profilePicture')
            .lean();

        const completedWorkouts = await CompletedWorkout.find()
            .sort({ completedDate: -1 })
            .lean();

        const leaderboardData = await Promise.all(users.map(async user => {
            // Get all completed workouts for this user
            const userWorkouts = completedWorkouts.filter(w => w.userEmail === user.email);
            
            if (userWorkouts.length === 0) return null;

            // Calculate active days (unique days with workouts)
            const uniqueDays = new Set(
                userWorkouts.map(workout => 
                    new Date(workout.completedDate).toDateString()
                )
            );
            const activeDays = uniqueDays.size;

            // Calculate consistency score using the correct formula:
            // Total Workouts Completed + (Active Days × 10)
            const consistencyScore = userWorkouts.length + (activeDays * 10);

            return {
                _id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                profilePicture: user.profilePicture,
                totalWorkouts: userWorkouts.length,
                activeDays: activeDays,
                consistencyScore: consistencyScore
            };
        }));

        const filteredAndSorted = leaderboardData
            .filter(entry => entry !== null)
            .sort((a, b) => b.consistencyScore - a.consistencyScore)
            .slice(0, 10);

        res.json(filteredAndSorted);
    } catch (error) {
        console.error('Consistency leaderboard error:', error);
        res.status(500).json({ error: 'Failed to fetch consistency leaderboard data' });
    }
};

exports.getHybridLeaderboard = async (req, res) => {
    try {
        console.log('Fetching hybrid leaderboard data...');
        const users = await User.find()
            .select('firstName lastName email profilePicture')
            .lean();
        
        console.log(`Found ${users.length} users`);

        const completedWorkouts = await CompletedWorkout.find()
            .sort({ completedDate: -1 })
            .lean();
        
        console.log(`Found ${completedWorkouts.length} completed workouts`);

        const leaderboardData = await Promise.all(users.map(async user => {
            const userWorkouts = completedWorkouts.filter(w => w.userEmail === user.email);
            
            if (userWorkouts.length === 0) {
                console.log(`No workouts found for user: ${user.email}`);
                return null;
            }

            console.log(`Processing user ${user.email} with ${userWorkouts.length} workouts`);

            const uniqueDays = new Set(
                userWorkouts.map(workout => 
                    new Date(workout.completedDate).toDateString()
                )
            );
            const activeDays = uniqueDays.size;

            const totalVolume = userWorkouts.reduce((sum, workout) => {
                const volume = workout.weightLifted * workout.repsCompleted * workout.setsCompleted;
                console.log(`Workout volume: ${volume} (${workout.weightLifted}kg × ${workout.repsCompleted} reps × ${workout.setsCompleted} sets)`);
                return sum + volume;
            }, 0);

            const hybridScore = totalVolume + (activeDays * 10);
            console.log(`User ${user.email} hybrid score: ${hybridScore}`);

            return {
                _id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                profilePicture: user.profilePicture,
                totalVolume: totalVolume,
                activeDays: activeDays,
                hybridScore: hybridScore,
                totalWorkouts: userWorkouts.length
            };
        }));

        const filteredAndSorted = leaderboardData
            .filter(entry => entry !== null)
            .sort((a, b) => b.hybridScore - a.hybridScore)
            .slice(0, 10);

        console.log(`Sending ${filteredAndSorted.length} hybrid leaderboard entries`);
        res.json(filteredAndSorted);
    } catch (error) {
        console.error('Hybrid leaderboard error:', error);
        res.status(500).json({ error: 'Failed to fetch hybrid leaderboard data' });
    }
};

// Add this new function
exports.getUserRanks = async (req, res) => {
    try {
        const userEmail = req.params.email;
        
        // Get user rankings by reusing existing leaderboard functions
        const weightLossData = await this.getWeightLossLeaderboard(req, { json: (data) => data });
        const strengthData = await this.getStrengthLeaderboard(req, { json: (data) => data });
        const consistencyData = await this.getConsistencyLeaderboard(req, { json: (data) => data });
        const hybridData = await this.getHybridLeaderboard(req, { json: (data) => data });

        // Find user positions
        const ranks = {
            weightLoss: findRank(weightLossData, userEmail),
            strength: findRank(strengthData, userEmail),
            consistency: findRank(consistencyData, userEmail),
            hybrid: findRank(hybridData, userEmail)
        };

        res.json(ranks);
    } catch (error) {
        console.error('Get user ranks error:', error);
        res.status(500).json({ error: 'Failed to fetch user ranks' });
    }
};

// Helper function to find rank
function findRank(data, userEmail) {
    if (!data || !Array.isArray(data)) return { rank: 0, total: 0 };
    
    const userIndex = data.findIndex(user => user.email === userEmail);
    return {
        rank: userIndex !== -1 ? userIndex + 1 : 0,
        total: data.length
    };
}