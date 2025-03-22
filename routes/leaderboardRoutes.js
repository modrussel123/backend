const express = require('express');
const router = express.Router();
const leaderboardController = require('../controllers/leaderboardController');

router.get('/weight-loss', leaderboardController.getWeightLossLeaderboard);
router.get('/strength', leaderboardController.getStrengthLeaderboard);
router.get('/consistency', leaderboardController.getConsistencyLeaderboard);
// Add this route alongside existing ones
router.get('/hybrid', leaderboardController.getHybridLeaderboard);

module.exports = router;