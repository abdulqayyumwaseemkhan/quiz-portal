const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  studentId: {
    type: String,
    required: true,
    trim: true,
  },
  fullName: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    default: '',
  },
  contact: {
    type: String,
    trim: true,
    default: '',
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
  passwordHash: {
    type: String,
    select: false,
  },
  passwordCipher: {
    type: String,
    select: false,
    default: '',
  },
  mustChangePassword: {
    type: Boolean,
    default: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  emailStatus: {
    type: String,
    enum: ['pending', 'sent', 'failed'],
    default: 'pending',
  },
  emailSentAt: {
    type: Date,
    default: null,
  },
  emailError: {
    type: String,
    default: '',
  },
  addedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
}, { timestamps: true });

studentSchema.index({ studentId: 1, addedBy: 1 }, { unique: true });
studentSchema.index({ studentId: 1 });
studentSchema.index({ addedBy: 1, campus: 1, batch: 1 });
studentSchema.index({ addedBy: 1, emailStatus: 1 });

const Student = mongoose.model('Student', studentSchema);

module.exports = Student;
