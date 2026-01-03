const mongoose = require('mongoose');
const { Schema } = mongoose;

const postSchema = new Schema({
    title: { type: String, required: true, trim: true },
    content: { type: String, required: true },
    author: { type: Schema.Types.ObjectId, ref: 'user', required: true },
    tags: { 
        type: [String], 
        enum: ['General', 'Interview Experience', 'System Design', 'Compensation', 'Career'],
        default: ['General']
    },
    views: { type: Number, default: 0 },
    upvotes: { type: [Schema.Types.ObjectId], ref: 'user', default: [] }, // Array of user IDs for simple voting
    commentsCount: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('post', postSchema);