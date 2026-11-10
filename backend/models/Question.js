const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  quizId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Quiz',
    required: true,
    index: true,
  },
  questionText: {
    type: String,
    required: true,
    trim: true,
  },
  type: {
    type: String,
    enum: ['mcq', 'short'],
    required: true,
    default: 'mcq',
  },
  options: [{
    type: String, // 4 or 5 options for MCQ
  }],
  correctAnswer: {
    type: String,
    required: true,
  },
  marks: {
    type: Number,
    required: true,
    default: 1,
  },
  explanation: {
    type: String,
    default: '',
  },
}, { timestamps: true });

questionSchema.index({ quizId: 1, createdAt: 1 });

module.exports = mongoose.model('Question', questionSchema);
