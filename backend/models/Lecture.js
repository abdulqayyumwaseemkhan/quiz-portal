const mongoose = require('mongoose');

const lectureSchema = new mongoose.Schema(
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
    courseModule: {
      type: String,
      trim: true,
      default: 'General',
    },
    order: {
      type: Number,
      required: true,
      default: 1,
    },
    lectureDate: {
      type: Date,
      default: Date.now,
    },
    videoUrl: {
      type: String,
      required: true,
      trim: true,
    },
    videoProvider: {
      type: String,
      enum: ['youtube', 'drive'],
      required: true,
    },
    embedUrl: {
      type: String,
      required: true,
      trim: true,
    },
    resourceUrl: {
      type: String,
      trim: true,
      default: '',
    },
    campus: {
      type: String,
      trim: true,
      default: '',
    },
    batch: {
      type: String,
      trim: true,
      default: '',
    },
    isPublished: {
      type: Boolean,
      default: true,
    },
    watchedBy: {
      type: [String], // array of studentIds who marked this lecture watched
      default: [],
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      required: true,
    },
  },
  { timestamps: true }
);

lectureSchema.index({ createdBy: 1, order: 1, createdAt: -1 });
lectureSchema.index({ createdBy: 1, campus: 1, batch: 1, isPublished: 1 });

module.exports = mongoose.model('Lecture', lectureSchema);
