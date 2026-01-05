const express = require('express');
const router = express.Router();
const validateUser = require('../middleware/validateUser');
const { getVaultItems, submitReview } = require('../controllers/masteryController');

router.get('/dashboard', validateUser, getVaultItems);
router.post('/review', validateUser, submitReview);

module.exports = router;