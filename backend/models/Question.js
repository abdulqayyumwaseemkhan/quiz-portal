const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  quizId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Quiz',
    required: true,
  },
  questionText: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ['mcq', 'short'],
    required: true,
  },
  options: [{
    type: String, // Only for MCQ
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
}, { timestamps: true });

module.exports = mongoose.model('Question', questionSchema);
