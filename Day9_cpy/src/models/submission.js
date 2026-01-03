const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const submissionSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'user',
    required: true
  },
  problemId: {
    type: Schema.Types.ObjectId,
    ref: 'problem', 
    required: true
  },
  // ... rest of your schema (code, language, status, etc.)
  code: { type: String, required: true },
  language: { type: String, required: true },
  status: { type: String, default: 'pending' },
  runtime: { type: Number, default: 0 },
  memory: { type: Number, default: 0 },
  errorMessage: { type: String, default: '' },
  testCasesPassed: { type: Number, default: 0 },
  testCasesTotal: { type: Number, default: 0 }
}, { 
  timestamps: true
});

submissionSchema.index({userId : 1 , problemId : 1}); 

const Submission = mongoose.model('submission' , submissionSchema);
module.exports = Submission;