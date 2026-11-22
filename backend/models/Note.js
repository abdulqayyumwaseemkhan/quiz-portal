const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema(
  {
    lectureNumber: {
      type: Number,
      required: true,
    },
    lectureTitle: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
    },
    fileUrl: {
      type: String,
      required: true,
    },
    filePublicId: {
      type: String,
      default: '',
    },
    originalFileName: {
      type: String,
      default: '',
    },
    fileType: {
      type: String,
      default: 'pdf',
    },
    category: {
      type: String,
      enum: ['handout', 'slides', 'code', 'link', 'cheatsheet', 'other'],
      default: 'handout',
    },
    externalUrl: {
      type: String,
      default: '',
      trim: true,
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
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      required: true,
    },
  },
  { timestamps: true }
);

const Note = mongoose.model('Note', noteSchema);

module.exports = Note;
