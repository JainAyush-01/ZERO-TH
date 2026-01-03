const redis = require("redis");

const redisClient = redis.createClient({
    username: 'default',
    password: process.env.REDIS_PASS,
    socket: {
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT
    }
});

// This pice of code is added to handle the error created when server is idle and when server remains idle state then redisclien breaks connection and crashes
redisClient.on('error', (err) => {
    console.error('Redis Client Error:', err);
});

module.exports = redisClient;