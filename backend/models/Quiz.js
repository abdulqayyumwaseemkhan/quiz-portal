const mongoose = require('mongoose');

const quizSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    required: true,
  },
  duration: {
    type: Number,
    required: true, // in minutes
  },
  startDate: {
    type: Date,
    default: null,
  },
  endDate: {
    type: Date,
    default: null,
  },
  totalMarks: {
    type: Number,
    required: true,
    default: 0,
  },
  campus: {
    type: String,
    trim: true,
    default: '', // empty string = visible to all campuses of this admin
  },
  batch: {
    type: String,
    trim: true,
    default: '', // empty string = visible to all batches
  },
  shuffleQuestions: {
    type: Boolean,
    default: true,
  },
  shuffleOptions: {
    type: Boolean,
    default: true,
  },
  attemptsAllowed: {
    type: Number,
    default: 1,
    min: 1,
  },
  isPublished: {
    type: Boolean,
    default: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
  },
  resultsReleased: {
    type: Boolean,
    default: false,
  },
}, { timestamps: true });

quizSchema.index({ createdBy: 1, isPublished: 1, campus: 1, batch: 1 });
quizSchema.index({ createdBy: 1, createdAt: -1 });

module.exports = mongoose.model('Quiz', quizSchema);
