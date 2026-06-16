const express = require('express');
const router = express.Router();
const {
  createNote,
  getNotes,
  deleteNote,
} = require('../controllers/noteController');
const { protectAdmin } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.post('/', protectAdmin, upload.single('file'), createNote);
router.get('/', protectAdmin, getNotes);
router.delete('/:id', protectAdmin, deleteNote);

module.exports = router;
