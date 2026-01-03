const express = require('express');
const submitRouter = express.Router();
const validateUser = require('../middleware/validateUser')
const validateAdmin = require('../middleware/validateAdmin')
const { submitAns, RunCode, fetchUserHistory, runPlayground,getAllSubmissions } = require('../controllers/submitAns');
const submitCodeRateLimiter = require('../middleware/rateLimiter')

submitRouter.post('/submit/:id' , validateUser,submitCodeRateLimiter, submitAns);
submitRouter.post('/run/:id',validateUser,RunCode);
submitRouter.get('/history', validateUser, fetchUserHistory); // Profile Activity
submitRouter.post('/playground', validateUser, runPlayground); // Online IDE
submitRouter.get('/all', validateAdmin, getAllSubmissions);

module.exports = submitRouter;