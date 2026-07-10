const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  productName: { type: String, required: true },
  brandName: { type: String },
  category: { type: String },
  sku: { type: String },
  barcode: { type: String, required: true, unique: true },
  price: { type: String },
  weight: { type: String },
  description: { type: String }
}, {
  timestamps: true
});

module.exports = mongoose.model('Product', productSchema);
