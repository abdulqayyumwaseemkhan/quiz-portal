const express = require('express');
const router = express.Router();
const {
  createLecture,
  getLecturesAdmin,
  updateLecture,
  deleteLecture,
} = require('../controllers/lectureController');
const { protectAdmin } = require('../middleware/auth');

router.route('/')
  .get(protectAdmin, getLecturesAdmin)
  .post(protectAdmin, createLecture);

router.route('/:id')
  .put(protectAdmin, updateLecture)
  .delete(protectAdmin, deleteLecture);

module.exports = router;
