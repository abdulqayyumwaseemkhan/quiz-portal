const express = require('express');
const router = express.Router();
const {
  createNote,
  getNotes,
  deleteNote,
  updateNote,
} = require('../controllers/noteController');
const { protectAdmin } = require('../middleware/auth');
const { assignmentUpload } = require('../middleware/upload');

router.post('/', protectAdmin, assignmentUpload.single('file'), createNote);
router.get('/', protectAdmin, getNotes);
router.put('/:id', protectAdmin, updateNote);
router.delete('/:id', protectAdmin, deleteNote);

module.exports = router;
