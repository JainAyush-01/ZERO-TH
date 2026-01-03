const express = require('express');
const router = express.Router();
const validateUser = require('../middleware/validateUser');
const { askAI } = require('../controllers/aiController');

router.post('/ask', validateUser, askAI);

module.exports = router;