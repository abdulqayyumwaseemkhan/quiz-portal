const mongoose = require('mongoose');

const resultSchema = new mongoose.Schema({
  studentName: {
    type: String,
    required: true,
  },
  studentId: {
    type: String,
    required: true,
  },
  campus: String,
  batch: String,
  quizId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Quiz',
    required: true,
  },
  answers: [{
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Question',
    },
    answer: String,
    isCorrect: Boolean,
    marksObtained: Number,
  }],
  score: {
    type: Number,
    required: true,
  },
  totalPossibleMarks: {
    type: Number,
    required: true,
  },
  percentage: {
    type: Number,
    required: true,
  },
  submittedAt: {
    type: Date,
    default: Date.now,
  },
}, { timestamps: true });

// Ensure a student cannot attempt the same quiz twice
resultSchema.index({ studentId: 1, quizId: 1 }, { unique: true });

module.exports = mongoose.model('Result', resultSchema);
