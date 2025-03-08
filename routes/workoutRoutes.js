const express = require('express');
const { getWorkouts, createWorkout, updateWorkout, deleteWorkout } = require('../controllers/workoutController');
const authMiddleware = require('../middleware/auth'); // Make sure this is imported

const router = express.Router();

// Add auth middleware to all routes
router.get('/', authMiddleware, getWorkouts);
router.post('/', authMiddleware, createWorkout);
router.put('/:id', authMiddleware, updateWorkout);
router.delete('/:id', authMiddleware, deleteWorkout);

module.exports = router;
