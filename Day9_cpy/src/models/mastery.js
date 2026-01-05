const mongoose = require('mongoose');
const { Schema } = mongoose;

const masterySchema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'user', required: true },
    problemId: { type: Schema.Types.ObjectId, ref: 'problem', required: true },
    
    // SM-2 Algorithm Data
    repetition: { type: Number, default: 0 }, // 'n'
    interval: { type: Number, default: 0 },   // 'I' (Days)
    easeFactor: { type: Number, default: 2.5 }, // 'EF'
    
    nextReviewDate: { type: Date, default: Date.now }, // The sorting key
    lastReviewedAt: { type: Date, default: Date.now }
});

// Compound index to ensure one entry per user-problem pair
masterySchema.index({ userId: 1, problemId: 1 }, { unique: true });
// Index for fast "What is due today?" queries
masterySchema.index({ userId: 1, nextReviewDate: 1 });

module.exports = mongoose.model('mastery', masterySchema);