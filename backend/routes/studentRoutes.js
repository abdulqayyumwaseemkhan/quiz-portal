const express = require('express');
const router = express.Router();
const {
  getAvailableQuizzes,
  getQuizForAttempt,
  submitQuiz,
  getStudentResult,
  checkAttemptStatus,
  verifyStudentId
} = require('../controllers/studentController');

const {
  getAssignmentsForStudent,
  submitAssignment,
  getMySubmissionStatus,
} = require('../controllers/assignmentController');

const {
  getNotesForStudent,
} = require('../controllers/noteController');

const upload = require('../middleware/upload');

router.get('/verify-id/:studentId', verifyStudentId);
router.get('/quizzes', getAvailableQuizzes);
router.get('/quiz/:quizId/:studentId', getQuizForAttempt);
router.post('/submit', submitQuiz);
router.get('/result/:resultId', getStudentResult);
router.get('/check-attempt/:quizId/:studentId', checkAttemptStatus);

// Assignment Routes
router.get('/assignments/:studentId', getAssignmentsForStudent);
router.post('/assignments/:id/submit/:studentId', upload.single('file'), submitAssignment);
router.get('/assignments/:id/status/:studentId', getMySubmissionStatus);

// Note Routes
router.get('/notes/:studentId', getNotesForStudent);

module.exports = router;
