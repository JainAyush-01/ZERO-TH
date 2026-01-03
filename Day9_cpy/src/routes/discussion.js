const express = require('express');
const Discussion = require('../models/discussion');
const validateUser = require('../middleware/validateUser');
const discussionManager = require('../controllers/discussionManager')
const discussionRouter = express.Router();

discussionRouter.get('/:problemId', validateUser, discussionManager);
module.exports = discussionRouter;