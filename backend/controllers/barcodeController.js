const bwipjs = require('bwip-js');
const asyncHandler = require('express-async-handler');
const Product = require('../models/Product');

// @desc    Generate a barcode
// @route   POST /api/barcodes/generate
// @access  Public / Admin
const generateBarcode = asyncHandler(async (req, res) => {
  let { 
    barcode, type, scale, height, includetext, textxalign, barcolor, textcolor,
    productName, brandName, category, sku, price, weight, description
  } = req.body;

  // Generate a unique barcode if not provided
  if (!barcode) {
    const randomNum = Math.floor(100000 + Math.random() * 900000);
    barcode = `WG${randomNum}`;
  }

  // Save product details to DB
  try {
    if (productName) {
      let product = await Product.findOne({ barcode });
      if (!product) {
        await Product.create({
          productName,
          brandName,
          category,
          sku,
          barcode,
          price,
          weight,
          description
        });
      } else {
        product.productName = productName;
        product.brandName = brandName;
        product.category = category;
        product.sku = sku;
        product.price = price;
        product.weight = weight;
        product.description = description;
        await product.save();
      }
    }
  } catch (err) {
    console.error('Error saving product:', err);
  }

  // Options for bwip-js
  let encodeText = barcode;
  if (type === 'qrcode' && req.body.frontendUrl) {
    encodeText = `${req.body.frontendUrl}/product/${barcode}`;
  }

  const options = {
    bcid: type || 'code128',       // Barcode type
    text: encodeText,              // Text to encode
    scale: scale || 6,             // Scaling factor
    height: height || 25,          // Bar height, in millimeters
    includetext: includetext !== undefined ? includetext : true, // Show human-readable text
    textxalign: textxalign || 'center', // Always good to set this
    barcolor: barcolor ? barcolor.replace('#', '') : '000000',
    textcolor: textcolor ? textcolor.replace('#', '') : '000000',
  };
  
  try {
    // Generate PNG buffer
    const pngBuffer = await bwipjs.toBuffer(options);
    
    // Return image response directly
    res.set('Content-Type', 'image/png');
    res.send(pngBuffer);
  } catch (error) {
    res.status(400);
    throw new Error('Failed to generate barcode: ' + error.message);
  }
});

// @desc    Get product details by barcode
// @route   GET /api/barcodes/:barcode
// @access  Public
const getProductByBarcode = asyncHandler(async (req, res) => {
  const product = await Product.findOne({ barcode: req.params.barcode });
  if (!product) {
    res.status(404);
    throw new Error('Product not found');
  }
  res.json(product);
});

module.exports = {
  generateBarcode,
  getProductByBarcode
};
