const redisClient = require('../config/redis'); 

const submitCodeRateLimiter = async (req, res, next) => {
  try {
    if (!req.result || !req.result._id) {
       return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = req.result._id.toString(); 
    const redisKey = `submit_cooldown:${userId}`;

    /* 
     * MAANG FIX: ATOMIC RATE LIMITING
     * 'NX' ensures this only succeeds if the key DOES NOT exist.
     * 'EX: 10' sets the 10-second expiration.
     * If multiple requests hit exactly at once, Redis guarantees only 1 returns "OK".
     * The others will return null.
     */
    const successfullySet = await redisClient.set(redisKey, 'active', {
      NX: true,
      EX: 10 
    });

    if (!successfullySet) {
      // If it returns null, the key already existed. Block them!
      return res.status(429).json({
        error: 'Please wait 10 seconds before submitting again'
      });
    }

    next();
  } catch (error) {
    console.error('Rate limiter error:', error);
    
    /*
     * ARCHITECTURE CHOICE: FAIL CLOSED.
     * We intentionally block the request here if Redis is down to prevent 
     * malicious users from bankrupting our 3rd-party API quotas.
     */
    res.status(500).json({ error: 'Rate Limit Middleware Unavailable. Please try again later.' });
  }
};

module.exports = submitCodeRateLimiter;