const express = require('express');
const router = express.Router();
const validateUser = require('../middleware/validateUser');
const { getAllPosts, createPost, getPostById, addComment } = require('../controllers/forumController');

router.get('/all', validateUser, getAllPosts);
router.post('/create', validateUser, createPost);
router.get('/:id', validateUser, getPostById);
router.post('/:id/comment', validateUser, addComment);

module.exports = router;