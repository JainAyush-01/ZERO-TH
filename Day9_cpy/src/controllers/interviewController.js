const { v4: uuidv4 } = require('uuid');
const redisClient = require('../config/redis');

const createInterviewRoom = async (req, res) => {
    try {
        const userId = req.result._id.toString(); // From validateUser middleware
        const roomId = uuidv4();

        // Store Room Owner in Redis (Expire in 24 hours)
        // Key: "interview_room:{roomId}" -> Value: "userId"
        await redisClient.set(`interview_room:${roomId}`, userId, {
            EX: 86400 
        });

        res.status(201).json({ roomId });
    } catch (err) {
        console.error("Interview Create Error:", err);
        res.status(500).send("Failed to create room");
    }
};

module.exports = { createInterviewRoom };