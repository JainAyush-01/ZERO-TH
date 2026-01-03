const express = require('express');
const router = express.Router();
const validateUser = require('../middleware/validateUser');
const { createInterviewRoom } = require('../controllers/interviewController');

router.post('/create', validateUser, createInterviewRoom);

module.exports = router;