const express = require('express');
const router = express.Router();
const { generateBarcode } = require('../controllers/barcodeController');

// Route for generating barcodes
router.post('/generate', generateBarcode);

module.exports = router;
