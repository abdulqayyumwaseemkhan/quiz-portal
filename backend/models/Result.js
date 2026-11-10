const mongoose = require('mongoose');

const resultSchema = new mongoose.Schema({
  studentName: {
    type: String,
    required: true,
  },
  studentId: {
    type: String,
    required: true,
    index: true,
  },
  campus: {
    type: String,
    default: '',
  },
  batch: {
    type: String,
    default: '',
  },
  quizId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Quiz',
    required: true,
    index: true,
  },
  attemptNo: {
    type: Number,
    default: 1,
  },
  status: {
    type: String,
    enum: ['in_progress', 'submitted'],
    default: 'submitted',
  },
  startedAt: {
    type: Date,
    default: Date.now,
  },
  lastSavedAt: {
    type: Date,
    default: Date.now,
  },
  draftAnswers: [{
    questionId: String,
    answer: String,
  }],
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
    default: 0,
  },
  totalPossibleMarks: {
    type: Number,
    required: true,
    default: 0,
  },
  percentage: {
    type: Number,
    required: true,
    default: 0,
  },
  submittedAt: {
    type: Date,
    default: Date.now,
  },
}, { timestamps: true });

// Unique index per student + quiz + attemptNo for idempotent multi-attempt support
resultSchema.index({ studentId: 1, quizId: 1, attemptNo: 1 }, { unique: true });
resultSchema.index({ quizId: 1, status: 1, submittedAt: -1 });
resultSchema.index({ quizId: 1, campus: 1, batch: 1 });

module.exports = mongoose.model('Result', resultSchema);
