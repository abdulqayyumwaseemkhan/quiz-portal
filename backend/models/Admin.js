const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const securityKeySchema = new mongoose.Schema(
  {
    credentialId: { type: String, required: true },
    publicKeySpki: { type: String, required: true },
    alg: { type: Number, default: -7 },
    label: { type: String, default: 'Windows Security Key' },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const adminSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      default: 'admin',
    },
    totpEnabled: {
      type: Boolean,
      default: false,
    },
    totpSecret: {
      type: String,
      default: '',
    },
    totpPendingSecret: {
      type: String,
      default: '',
    },
    securityKeys: {
      type: [securityKeySchema],
      default: [],
    },
    currentChallenge: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

adminSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 10);
});

adminSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('Admin', adminSchema);
