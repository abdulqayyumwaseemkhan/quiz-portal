const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema(
  {
    assignmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Assignment',
      required: true,
    },
    studentId: {
      type: String,
      required: true,
    },
    studentName: {
      type: String,
      required: true,
    },
    campus: {
      type: String,
      default: '',
    },
    batch: {
      type: String,
      default: '',
    },
    fileUrl: {
      type: String,
      default: null,
    },
    filePublicId: {
      type: String,
      default: null,
    },
    originalFileName: {
      type: String,
      default: null,
    },
    fileSizeBytes: {
      type: Number,
      default: null,
    },
    submissionType: {
      type: String,
      enum: ['file', 'ide', 'document', 'link', 'deployed', 'project'],
      default: 'file',
    },
    projectData: {
      type: mongoose.Schema.Types.Mixed,
    },
    liveUrl: {
      type: String,
      default: '',
      trim: true,
    },
    githubUrl: {
      type: String,
      default: '',
      trim: true,
    },
    driveLink: {
      type: String,
      default: '',
      trim: true,
    },
    assignmentTitle: {
      type: String,
      default: '',
    },
    assignmentDetails: {
      type: String,
      default: '',
    },
    isLate: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ['submitted', 'late', 'graded'],
      default: 'submitted',
    },
    marksObtained: {
      type: Number,
      default: null,
    },
    maxMarks: {
      type: Number,
      default: 100,
    },
    feedback: {
      type: String,
      default: '',
    },
    remarks: {
      type: String,
      default: '',
    },
    gradedAt: {
      type: Date,
      default: null,
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

submissionSchema.index({ assignmentId: 1, studentId: 1 });
submissionSchema.index({ studentId: 1, submittedAt: -1 });

const Submission = mongoose.model('Submission', submissionSchema);

module.exports = Submission;
