const redisClient = require('../config/redis'); // <--- FIXED PATH (Was ./redisClient)

const submitCodeRateLimiter = async (req, res, next) => {
  try {
    // Check if user is logged in
    if (!req.result || !req.result._id) {
       return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = req.result._id.toString(); 
    const redisKey = `submit_cooldown:${userId}`;

    // Check if user has a recent submission
    const exists = await redisClient.get(redisKey); // Changed .exists to .get for some redis versions
    
    if (exists) {
      return res.status(429).json({
        error: 'Please wait 10 seconds before submitting again'
      });
    }

    // Set cooldown period
    await redisClient.set(redisKey, 'active', {
      EX: 10, // Expire after 10 seconds
    });

    next();
  } catch (error) {
    console.error('Rate limiter error:', error);
    // Send JSON error so frontend doesn't show "Internal Server Error" text
    res.status(500).json({ error: 'Rate Limit Middleware Failed', details: error.message });
  }
};

module.exports = submitCodeRateLimiter;