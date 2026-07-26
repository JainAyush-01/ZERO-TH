const Post = require('../models/post');
const Comment = require('../models/comment');
const mongoose = require('mongoose');

const getAllPosts = async (req, res) => {
    try {
        // FIXED: Negative Math Bug
        let page = parseInt(req.query.page) || 1;
        if (page < 1) page = 1; // Prevent negative skip values
        
        const limit = 10; 
        const skip = (page - 1) * limit;

        const { tag } = req.query;
        const query = tag && tag !== 'All' ? { tags: tag } : {};
        
        const total = await Post.countDocuments(query);

        const posts = await Post.find(query)
            .sort({ createdAt: -1 })
            .populate('author', 'firstName role')
            .skip(skip)
            .limit(limit);

        res.status(200).json({
            posts,
            pagination: { total, page, pages: Math.ceil(total / limit) }
        });
    } catch (err) {
        res.status(500).send("Error fetching posts");
    }
};

const createPost = async (req, res) => {
    try {
        const { title, content, tags } = req.body;
        
        if (!title || !content || title.trim() === "" || content.trim() === "") {
            return res.status(400).send("Title and Content cannot be empty");
        }

        const newPost = await Post.create({
            title,
            content,
            tags: tags || ['General'],
            author: req.result._id
        });

        res.status(201).json(newPost);
    } catch (err) {
        res.status(500).send("Error creating post");
    }
};

const getPostById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).send("Invalid Post ID format");
        }

        // FIXED: Race Condition using Atomic $inc Operator
        // This updates the view count directly in the DB and returns the updated document in one step
        const post = await Post.findByIdAndUpdate(
            id, 
            { $inc: { views: 1 } }, 
            { new: true } // Returns the document AFTER the view count is incremented
        ).populate('author', 'firstName role');
        
        if (!post) return res.status(404).send("Post not found");

        // IMPLEMENTED: Basic Pagination for Comments so large posts don't crash the server
        let page = parseInt(req.query.commentPage) || 1;
        if (page < 1) page = 1;
        const commentLimit = 20;

        const comments = await Comment.find({ postId: post._id })
            .sort({ createdAt: 1 })
            .populate('author', 'firstName role')
            .skip((page - 1) * commentLimit)
            .limit(commentLimit);

        res.status(200).json({ post, comments });
    } catch (err) {
        console.error(err); 
        res.status(500).send("Error loading discussion");
    }
};

const addComment = async (req, res) => {
    try {
        const { content } = req.body;
        const { id } = req.params;

        if (!content || content.trim() === "") {
            return res.status(400).send("Comment content is required");
        }

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).send("Invalid Post ID");
        }

        const postExists = await Post.exists({ _id: id });
        if (!postExists) {
            return res.status(404).send("Post no longer exists");
        }

        const newComment = await Comment.create({
            postId: id,
            author: req.result._id,
            content
        });

        // Already correct in your original code!
        await Post.findByIdAndUpdate(id, { $inc: { commentsCount: 1 } });

        const populatedComment = await newComment.populate('author', 'firstName role');
        res.status(201).json(populatedComment);
    } catch (err) {
        console.error(err);
        res.status(500).send("Error posting comment");
    }
};

module.exports = { getAllPosts, createPost, getPostById, addComment };