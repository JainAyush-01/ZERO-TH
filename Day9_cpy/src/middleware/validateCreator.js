const jwt = require('jsonwebtoken');
const Users = require('../models/user');
const redisClient = require('../config/redis');

const validateCreator = async (req, res, next) => {
    try {
        const { token } = req.cookies;
        if(!token) throw new Error("Token Missing");

        const isBlocked = await redisClient.get(`token:${token}`);
        if(isBlocked) throw new Error("Token Blocked");

        const payload = jwt.verify(token, process.env.JWT_KEY);
        const user = await Users.findById(payload._id);

        if(!user) throw new Error("User not found");

        // Allow ADMIN or CREATOR
        if (user.role === 'admin' || user.role === 'creator') {
            req.result = user;
            next();
        } else {
            throw new Error("Access Denied: Creator privileges required");
        }
    } catch (err) {
        res.status(403).send("Unauthorized: " + err.message);
    }
}

module.exports = validateCreator;