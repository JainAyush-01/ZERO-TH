const Post = require('../models/post');
const Comment = require('../models/comment');
const mongoose = require('mongoose'); // Needed for ID validation

const getAllPosts = async (req, res) => {
    try {
        // 1. Pagination Params
        const page = parseInt(req.query.page) || 1;
        const limit = 10; // Show 10 posts per page
        const skip = (page - 1) * limit;

        const { tag } = req.query;
        const query = tag && tag !== 'All' ? { tags: tag } : {};
        
        // 2. Get Total Count (for frontend math)
        const total = await Post.countDocuments(query);

        // 3. Fetch Specific Page
        const posts = await Post.find(query)
            .sort({ createdAt: -1 })
            .populate('author', 'firstName role')
            .skip(skip)
            .limit(limit);

        // 4. Return Data + Meta Info
        res.status(200).json({
            posts,
            pagination: {
                total,
                page,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (err) {
        res.status(500).send("Error fetching posts");
    }
};

const createPost = async (req, res) => {
    try {
        const { title, content, tags } = req.body;
        
        // 1. Validate Input
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

        // 1. Validate MongoDB ID Format
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).send("Invalid Post ID format");
        }

        const post = await Post.findById(id).populate('author', 'firstName role');
        
        // 2. Validate Existence
        if (!post) return res.status(404).send("Post not found");

        post.views += 1;
        await post.save();

        const comments = await Comment.find({ postId: post._id })
            .sort({ createdAt: 1 })
            .populate('author', 'firstName role');

        res.status(200).json({ post, comments });
    } catch (err) {
        console.error(err); // Good for debugging
        res.status(500).send("Error loading discussion");
    }
};

const addComment = async (req, res) => {
    try {
        const { content } = req.body;
        const { id } = req.params;

        // 1. Validate Content
        if (!content || content.trim() === "") {
            return res.status(400).send("Comment content is required");
        }

        // 2. Validate Post ID
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).send("Invalid Post ID");
        }

        // 3. Ensure Post Actually Exists (Optional but recommended)
        const postExists = await Post.exists({ _id: id });
        if (!postExists) {
            return res.status(404).send("Post no longer exists");
        }

        const newComment = await Comment.create({
            postId: id,
            author: req.result._id,
            content
        });

        await Post.findByIdAndUpdate(id, { $inc: { commentsCount: 1 } });

        const populatedComment = await newComment.populate('author', 'firstName role');
        res.status(201).json(populatedComment);
    } catch (err) {
        console.error(err);
        res.status(500).send("Error posting comment");
    }
};

module.exports = { getAllPosts, createPost, getPostById, addComment };  