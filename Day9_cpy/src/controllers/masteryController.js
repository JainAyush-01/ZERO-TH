const User = require('../models/user'); // <--- Import User
const Mastery = require('../models/mastery');
const calculateSM2 = require('../utils/sm2');

// 1. Get Vault Items (Updated to send Streak info)
const getVaultItems = async (req, res) => {
    try {
        const userId = req.result._id;
        const now = new Date();

        // Fetch Streak Info directly from User
        const user = await User.findById(userId).select('masteryStreak');

        // ... (Existing Fetch Logic for dueItems/upcomingItems) ...
        const dueItems = await Mastery.find({ userId, nextReviewDate: { $lte: now } }).populate('problemId', 'title difficulty tags');
        const upcomingItems = await Mastery.find({ userId, nextReviewDate: { $gt: now } }).sort({ nextReviewDate: 1 }).limit(5).populate('problemId', 'title');

        // ... (Existing Stats Logic) ...
        const totalItems = await Mastery.countDocuments({ userId });
        const healthyItems = await Mastery.countDocuments({ userId, nextReviewDate: { $gt: now } });
        const health = totalItems === 0 ? 100 : Math.round((healthyItems / totalItems) * 100);

        res.status(200).json({ 
            due: dueItems, 
            upcoming: upcomingItems,
            stats: {
                total: totalItems,
                health: health,
                // Send Streak Data
                streak: user.masteryStreak?.count || 0,
                isActiveToday: isSameDay(user.masteryStreak?.lastActiveDate, now)
            }
        });
    } catch (err) {
        res.status(500).send("Vault Error");
    }
};

// 2. Submit Review (With Optimized Streak Update)
const submitReview = async (req, res) => {
    try {
        // ... (Existing Anti-Spam and Setup Logic) ...
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

        // We only write to User DB if they haven't updated streak today
        const user = await User.findById(userId);
        const today = new Date();
        
        if (!isSameDay(user.masteryStreak.lastActiveDate, today)) {
            // Check if they missed yesterday (Reset streak)
            if (isYesterday(user.masteryStreak.lastActiveDate)) {
                // Streak Continues
                user.masteryStreak.count += 1;
            } else if (!user.masteryStreak.lastActiveDate) {
                // First ever streak
                user.masteryStreak.count = 1;
            } else {
                // Streak Broken (Missed more than 1 day)
                // Logic: If user reviewed today already, we skip. 
                // If last review was 2 days ago, we reset to 1.
                user.masteryStreak.count = 1; 
            }
            
            user.masteryStreak.lastActiveDate = today;
            await user.save();
        }

        res.status(200).json({ message: "Memory Updated", nextReview: nextDate });
    } catch (err) {
        res.status(500).send("Review Error");
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
    if (!lastActive) return false; 
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return isSameDay(d1, yesterday);
}

module.exports = { getVaultItems, submitReview };