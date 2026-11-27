const mongoose = require('mongoose');

const platformSettingSchema = new mongoose.Schema(
  {
    singletonKey: {
      type: String,
      default: 'default',
      unique: true,
      index: true,
    },
    enableNodePracticeIde: {
      type: Boolean,
      default: false,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('PlatformSetting', platformSettingSchema);
