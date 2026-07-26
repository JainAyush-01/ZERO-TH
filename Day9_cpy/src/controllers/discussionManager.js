const Discussion = require('../models/discussion');

const discussionManager = async (req, res) => {
    try {
        const limit = 20; // Fetch 20 messages at a time
        const { cursor } = req.query; // The ID of the oldest message currently on the screen
        
        let query = { problemId: req.params.problemId };

        // IMPLEMENTED: Cursor-based Pagination
        // If a cursor is provided, only fetch messages older than that cursor
        if (cursor) {
            query._id = { $lt: cursor };
        }

        // 1. Fetch messages (sorted newest to oldest to get the latest batch)
        const messages = await Discussion.find(query)
            .sort({ _id: -1 }) // Sort descending to get the most recent ones
            .limit(limit)
            .populate('userId', 'firstName role');
        
        // 2. Reverse the array before sending so the frontend displays them oldest-first (top to bottom)
        messages.reverse();

        res.status(200).json({
            messages,
            nextCursor: messages.length > 0 ? messages[0]._id : null // The oldest message ID becomes the new cursor
        });
    } catch (err) {
        res.status(500).send("Error fetching discussion");
    }
}

module.exports = discussionManager;