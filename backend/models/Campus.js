const mongoose = require('mongoose');

const campusSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  addedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
  }
}, { timestamps: true });

campusSchema.index({ name: 1, addedBy: 1 }, { unique: true });

module.exports = mongoose.model('Campus', campusSchema);
