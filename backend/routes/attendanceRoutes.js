const express = require('express');
const router = express.Router();
const {
  createSession,
  getSessions,
  getSessionById,
  markSessionAttendance,
  deleteSession,
  getAttendanceReport,
} = require('../controllers/attendanceController');
const { protectAdmin } = require('../middleware/auth');

router.route('/sessions')
  .get(protectAdmin, getSessions)
  .post(protectAdmin, createSession);

router.route('/sessions/:id')
  .get(protectAdmin, getSessionById)
  .delete(protectAdmin, deleteSession);

router.post('/sessions/:id/mark', protectAdmin, markSessionAttendance);

router.get('/report', protectAdmin, getAttendanceReport);

module.exports = router;
