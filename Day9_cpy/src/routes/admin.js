const express = require('express');
const router = express.Router();
const validateAdmin = require('../middleware/validateAdmin'); // Reuse your admin middleware
const { getSystemStats, getAllUsers, toggleBanUser , updateUserRole} = require('../controllers/adminController');

// All routes protected by validateAdmin
router.get('/stats', validateAdmin, getSystemStats);
router.get('/users', validateAdmin, getAllUsers);
router.put('/users/ban/:id', validateAdmin, toggleBanUser);
router.put('/users/role/:id', validateAdmin, updateUserRole);

module.exports = router;