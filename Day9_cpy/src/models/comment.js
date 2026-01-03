const mongoose = require('mongoose');
const { Schema } = mongoose;

const commentSchema = new Schema({
    postId: { type: Schema.Types.ObjectId, ref: 'post', required: true },
    author: { type: Schema.Types.ObjectId, ref: 'user', required: true },
    content: { type: String, required: true },
    upvotes: { type: [Schema.Types.ObjectId], ref: 'user', default: [] }
}, { timestamps: true });

module.exports = mongoose.model('comment', commentSchema);