const express = require('express');
const Discussion = require('../models/discussion');

const discussionManager = async(req,res)=>{
    try {
            const messages = await Discussion.find({ problemId: req.params.problemId })
                .sort({ createdAt: 1 }) // Oldest first
                .populate('userId', 'firstName role');
            
            res.status(200).json(messages);
        } catch (err) {
            res.status(500).send("Error fetching discussion");
        }
}

module.exports = discussionManager;