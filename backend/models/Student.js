const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  studentId: {
    type: String,
    required: true,
  },
  fullName: {
    type: String,
    required: true,
  },
  campus: {
    type: String,
    required: true,
    trim: true,
  },
  batch: {
    type: String,
    required: true,
    trim: true,
  },
  addedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

studentSchema.index({ studentId: 1, addedBy: 1 }, { unique: true });

const Student = mongoose.model('Student', studentSchema);

module.exports = Student;
