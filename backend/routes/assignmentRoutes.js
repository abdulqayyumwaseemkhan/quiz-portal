const express = require('express');
const router = express.Router();
const {
  createAssignment,
  getAssignments,
  updateAssignment,
  deleteAssignment,
  getSubmissionsForAssignment,
} = require('../controllers/assignmentController');
const { protectAdmin } = require('../middleware/auth');

router.post('/', protectAdmin, createAssignment);
router.get('/', protectAdmin, getAssignments);
router.put('/:id', protectAdmin, updateAssignment);
router.delete('/:id', protectAdmin, deleteAssignment);
router.get('/:id/submissions', protectAdmin, getSubmissionsForAssignment);

module.exports = router;
