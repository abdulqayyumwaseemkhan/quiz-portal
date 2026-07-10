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
    },
    dueDate: {
      type: Date,
      required: true,
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
      enum: ['vanilla', 'react'],
      default: 'vanilla',
    },
  },
  { timestamps: true }
);

const Assignment = mongoose.model('Assignment', assignmentSchema);

module.exports = Assignment;
