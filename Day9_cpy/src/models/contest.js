const mongoose = require('mongoose');
const { Schema } = mongoose;

const contestSchema = new Schema({
    title: { type: String, required: true, unique: true },
    description: { type: String, required: true },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    
    // 🚀 UPDATED: Now stores ID + Points explicitly
    problems: [{
        problemId: { type: Schema.Types.ObjectId, ref: 'problem' },
        points: { type: Number, required: true } 
    }],
    
    creator: { type: Schema.Types.ObjectId, ref: 'user', required: true },
    status: { type: String, enum: ['upcoming', 'active', 'ended'], default: 'upcoming' },

    participants: [{
        userId: { type: Schema.Types.ObjectId, ref: 'user' },
        score: { type: Number, default: 0 },
        timePenalty: { type: Number, default: 0 }, 
        submissionHistory: [{
            problemId: { type: Schema.Types.ObjectId, ref: 'problem' },
            status: { type: String, enum: ['solved', 'attempted'], default: 'attempted' },
            failCount: { type: Number, default: 0 },
            solvedAt: { type: Date }
        }]
    }]
}, { timestamps: true });

module.exports = mongoose.model('contest', contestSchema);