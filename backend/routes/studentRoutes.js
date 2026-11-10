const express = require('express');
const router = express.Router();
const {
  loginStudent,
  changeStudentPassword,
  getStudentProfile,
  updateStudentProfile,
  getStudentDashboard,
  getAvailableQuizzes,
  getQuizForAttempt,
  autosaveQuizAttempt,
  submitQuiz,
  getStudentResult,
  checkAttemptStatus,
  verifyStudentId
} = require('../controllers/studentController');

const {
  getAssignmentsForStudent,
  submitAssignment,
  submitIdeAssignment,
  uploadIdeImage,
  getMySubmissionStatus,
} = require('../controllers/assignmentController');

const {
  getNotesForStudent,
} = require('../controllers/noteController');

const {
  getLecturesForStudent,
  toggleLectureWatched,
} = require('../controllers/lectureController');

const {
  getStudentAttendance,
} = require('../controllers/attendanceController');

const { protectStudent } = require('../middleware/auth');
const { assignmentUpload, ideImageUpload } = require('../middleware/upload');

// Auth & Profile Routes
router.post('/login', loginStudent);
router.get('/profile', protectStudent, getStudentProfile);
router.put('/change-password', protectStudent, changeStudentPassword);
router.put('/profile', protectStudent, updateStudentProfile);
router.get('/verify-id/:studentId', verifyStudentId);
router.get('/dashboard/:studentId', protectStudent, getStudentDashboard);

// Quiz Routes
router.get('/quizzes/:studentId', protectStudent, getAvailableQuizzes);
router.get('/quiz/:quizId/:studentId', protectStudent, getQuizForAttempt);
router.put('/quiz/:quizId/autosave', protectStudent, autosaveQuizAttempt);
router.post('/submit', protectStudent, submitQuiz);
router.get('/result/:resultId', protectStudent, getStudentResult);
router.get('/check-attempt/:quizId/:studentId', protectStudent, checkAttemptStatus);

// Assignment Routes
router.get('/assignments/:studentId', protectStudent, getAssignmentsForStudent);
router.post('/assignments/:id/submit/:studentId', protectStudent, assignmentUpload.single('file'), submitAssignment);
router.post('/assignments/:id/submit-ide/:studentId', protectStudent, submitIdeAssignment);
router.post('/ide/upload-image', protectStudent, ideImageUpload.single('image'), uploadIdeImage);
router.get('/assignments/:id/status/:studentId', protectStudent, getMySubmissionStatus);

// Note Routes
router.get('/notes/:studentId', protectStudent, getNotesForStudent);

// Lecture Routes
router.get('/lectures/:studentId', protectStudent, getLecturesForStudent);
router.post('/lectures/:id/watched', protectStudent, toggleLectureWatched);

// Attendance Route
router.get('/attendance/:studentId', protectStudent, getStudentAttendance);

module.exports = router;
