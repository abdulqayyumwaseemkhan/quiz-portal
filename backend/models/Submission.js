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
    },
    batch: {
      type: String,
    },
    fileUrl: {
      type: String,
      required: function() { return this.submissionType === 'file'; },
    },
    filePublicId: {
      type: String,
      required: function() { return this.submissionType === 'file'; },
    },
    originalFileName: {
      type: String,
      required: function() { return this.submissionType === 'file'; },
    },
    fileSizeBytes: {
      type: Number,
      required: function() { return this.submissionType === 'file'; },
    },
    submissionType: {
      type: String,
      enum: ['file', 'ide', 'document'],
      default: 'file',
    },
    projectData: {
      type: mongoose.Schema.Types.Mixed,
    },
    driveLink: {
      type: String,
    },
    assignmentTitle: {
      type: String,
    },
    assignmentDetails: {
      type: String,
    },
    isLate: {
      type: Boolean,
      default: false,
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true } // also useful to have createdAt/updatedAt just in case
);

// Not unique so resubmission can happen and overwrite
submissionSchema.index({ assignmentId: 1, studentId: 1 });

const Submission = mongoose.model('Submission', submissionSchema);

module.exports = Submission;
