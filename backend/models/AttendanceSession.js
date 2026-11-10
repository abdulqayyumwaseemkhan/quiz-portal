const mongoose = require('mongoose');

const attendanceSessionSchema = new mongoose.Schema(
  {
    lectureTitle: {
      type: String,
      required: true,
      trim: true,
    },
    date: {
      type: Date,
      required: true,
    },
    time: {
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
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      required: true,
    },
  },
  { timestamps: true }
);

attendanceSessionSchema.index({ createdBy: 1, campus: 1, batch: 1, date: -1 });

module.exports = mongoose.model('AttendanceSession', attendanceSessionSchema);
