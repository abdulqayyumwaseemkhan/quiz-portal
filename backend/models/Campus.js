const mongoose = require('mongoose');

const campusSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  addedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
  }
}, { timestamps: true });

module.exports = mongoose.model('Campus', campusSchema);
