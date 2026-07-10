const bwipjs = require('bwip-js');
const asyncHandler = require('express-async-handler');

// @desc    Generate a barcode
// @route   POST /api/barcodes/generate
// @access  Public / Admin
const generateBarcode = asyncHandler(async (req, res) => {
  let { barcode, type, scale, height, includetext, textxalign, barcolor, textcolor } = req.body;

  // Generate a unique barcode if not provided
  if (!barcode) {
    const randomNum = Math.floor(100000 + Math.random() * 900000);
    barcode = `WG${randomNum}`;
  }

  // Options for bwip-js
  const options = {
    bcid: type || 'code128',       // Barcode type
    text: barcode,                 // Text to encode
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

module.exports = {
  generateBarcode,
};
