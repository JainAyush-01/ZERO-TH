const User = require('../models/user'); 
const Mastery = require('../models/mastery');
const calculateSM2 = require('../utils/sm2');

// 1. Get Vault Items (FIXED: Concurrency Bottleneck)
const getVaultItems = async (req, res) => {
    try {
        const userId = req.result._id;
        const now = new Date();

        // FIXED: Run all 5 database queries at the exact same time (Parallel)
        const [user, dueItems, upcomingItems, totalItems, healthyItems] = await Promise.all([
            User.findById(userId).select('masteryStreak'),
            Mastery.find({ userId, nextReviewDate: { $lte: now } }).populate('problemId', 'title difficulty tags'),
            Mastery.find({ userId, nextReviewDate: { $gt: now } }).sort({ nextReviewDate: 1 }).limit(5).populate('problemId', 'title'),
            Mastery.countDocuments({ userId }),
            Mastery.countDocuments({ userId, nextReviewDate: { $gt: now } })
        ]);

        const health = totalItems === 0 ? 100 : Math.round((healthyItems / totalItems) * 100);
        
        // Safety check in case user.masteryStreak doesn't exist yet
        const streakData = user?.masteryStreak || { count: 0, lastActiveDate: null };

        res.status(200).json({ 
            due: dueItems, 
            upcoming: upcomingItems,
            stats: {
                total: totalItems,
                health: health,
                streak: streakData.count,
                isActiveToday: isSameDay(streakData.lastActiveDate, now)
            }
        });
    } catch (err) {
        res.status(500).json({ error: "Vault Error" });
    }
};

// 2. Submit Review
const submitReview = async (req, res) => {
    try {
        const { problemId, quality } = req.body;
        const userId = req.result._id;
        
        let item = await Mastery.findOne({ userId, problemId });
        if (!item) item = new Mastery({ userId, problemId });

        const { repetition, interval, easeFactor } = calculateSM2(quality, item.repetition, item.interval, item.easeFactor);
        
        item.repetition = repetition;
        item.interval = interval;
        item.easeFactor = easeFactor;
        item.lastReviewedAt = new Date();
        
        const nextDate = new Date();
        nextDate.setDate(nextDate.getDate() + interval);
        item.nextReviewDate = nextDate;
        
        await item.save();

        const user = await User.findById(userId);
        const today = new Date();
        
        // Ensure masteryStreak object exists
        if (!user.masteryStreak) user.masteryStreak = { count: 0, lastActiveDate: null };

        if (!isSameDay(user.masteryStreak.lastActiveDate, today)) {
            if (isYesterday(user.masteryStreak.lastActiveDate)) {
                user.masteryStreak.count += 1;
            } else if (!user.masteryStreak.lastActiveDate) {
                user.masteryStreak.count = 1;
            } else {
                user.masteryStreak.count = 1; 
            }
            
            user.masteryStreak.lastActiveDate = today;
            await user.save();
        }

        res.status(200).json({ message: "Memory Updated", nextReview: nextDate });
    } catch (err) {
        res.status(500).json({ error: "Review Error" });
    }
};

// Helper Functions for Date Comparison
function isSameDay(d1, d2) {
    if (!d1 || !d2) return false;

    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
}

function isYesterday(d1) {
    if (!d1) return false;
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return isSameDay(d1, yesterday);
}

module.exports = { getVaultItems, submitReview };