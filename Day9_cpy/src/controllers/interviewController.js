const { v4: uuidv4 } = require('uuid');
const redisClient = require('../config/redis');

const createInterviewRoom = async (req, res) => {
    try {
        const userId = req.result._id.toString(); 
        const roomId = uuidv4();

        // Storing in Redis with 24-hour TTL (Time-To-Live)
        await redisClient.set(`interview_room:${roomId}`, userId, {
            EX: 86400 
        });

        res.status(201).json({ roomId });
    } catch (err) {
        console.error("Interview Create Error:", err);
        res.status(500).json({ error: "Failed to create room" });
    }
};

module.exports = { createInterviewRoom };