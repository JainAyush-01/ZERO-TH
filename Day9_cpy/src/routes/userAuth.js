const express = require('express');
const authRouter = express.Router();
const validateToken = require('../middleware/validateUser'); // Ensure path is correct
const { 
    register, 
    login, 
    logout, 
    adminRegister, 
    deleteProfile, 
    fetchDetails,
    googleAuth, sendOtp
} = require('../controllers/userAuthentication');
const { fetchLeaderboard } = require('../controllers/userAuthentication');

authRouter.post('/register', register);
authRouter.post('/login', login);
authRouter.post('/logout', validateToken, logout);
authRouter.get('/me', validateToken, fetchDetails); // <--- THIS ROUTE MUST EXIST
authRouter.delete('/profile/Delete', validateToken, deleteProfile);
// Public route (no token needed to view leaderboard)
authRouter.get('/leaderboard', fetchLeaderboard); 
authRouter.post('/google', googleAuth);
authRouter.post('/send-otp', sendOtp);

module.exports = authRouter;