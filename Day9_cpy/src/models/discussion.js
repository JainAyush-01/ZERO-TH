const mongoose = require('mongoose');
const { Schema } = mongoose;

const discussionSchema = new Schema({
    problemId: {
        type: Schema.Types.ObjectId,
        ref: 'problem',
        required: true
    },
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    message: {
        type: String,
        required: true
    },
    upvotes: {
        type: Number,
        default: 0
    }
}, { timestamps: true });

module.exports = mongoose.model('discussion', discussionSchema);