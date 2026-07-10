const express = require('express');
const router = express.Router();
const { generateBarcode, getProductByBarcode } = require('../controllers/barcodeController');

// Route for generating barcodes
router.post('/generate', generateBarcode);
router.get('/:barcode', getProductByBarcode);

module.exports = router;
