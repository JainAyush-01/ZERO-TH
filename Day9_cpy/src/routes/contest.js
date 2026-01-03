const express = require('express');
const router = express.Router();
const validateUser = require('../middleware/validateUser');
const validateCreator = require('../middleware/validateCreator');
const { createContest, getAllContests, registerForContest,getContestById,getContestLeaderboard} = require('../controllers/contestManager');

// Public Routes (Authenticated Users)
router.get('/all', validateUser, getAllContests);
router.post('/register/:id', validateUser, registerForContest);

// Creator/Admin Routes
router.post('/create', validateCreator, createContest);
router.get('/:id', validateUser, getContestById); // Add this

router.get('/:id/leaderboard', validateUser, getContestLeaderboard); // Add this
module.exports = router;