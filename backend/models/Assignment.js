const mongoose = require('mongoose');

const assignmentSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    dueDate: {
      type: Date,
      required: true,
    },
    totalMarks: {
      type: Number,
      default: 100,
    },
    allowLateSubmission: {
      type: Boolean,
      default: true,
    },
    campus: {
      type: String,
      trim: true,
      default: '', // empty means visible to all campuses
    },
    batch: {
      type: String,
      trim: true,
      default: '', // empty means visible to all batches in matched campus
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      required: true,
    },
    projectType: {
      type: String,
      enum: ['vanilla', 'react', 'document'],
      default: 'vanilla',
    },
  },
  { timestamps: true }
);

assignmentSchema.index({ createdBy: 1, campus: 1, batch: 1, createdAt: -1 });

const Assignment = mongoose.model('Assignment', assignmentSchema);

module.exports = Assignment;
