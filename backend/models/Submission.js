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
      required: true,
    },
    filePublicId: {
      type: String,
      required: true,
    },
    originalFileName: {
      type: String,
      required: true,
    },
    fileSizeBytes: {
      type: Number,
      required: true,
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
