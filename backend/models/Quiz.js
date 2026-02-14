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
  },
  endDate: {
    type: Date,
  },
  totalMarks: {
    type: Number,
    required: true,
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

module.exports = mongoose.model('Quiz', quizSchema);
