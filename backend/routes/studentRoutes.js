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
  submitIdeAssignment,
  uploadIdeImage,
  getMySubmissionStatus,
} = require('../controllers/assignmentController');

const {
  getNotesForStudent,
} = require('../controllers/noteController');

const { assignmentUpload, ideImageUpload } = require('../middleware/upload');

router.get('/verify-id/:studentId', verifyStudentId);
router.get('/quizzes/:studentId', getAvailableQuizzes);
router.get('/quiz/:quizId/:studentId', getQuizForAttempt);
router.post('/submit', submitQuiz);
router.get('/result/:resultId', getStudentResult);
router.get('/check-attempt/:quizId/:studentId', checkAttemptStatus);

// Assignment Routes
router.get('/assignments/:studentId', getAssignmentsForStudent);
router.post('/assignments/:id/submit/:studentId', assignmentUpload.single('file'), submitAssignment);
router.post('/assignments/:id/submit-ide/:studentId', submitIdeAssignment);
router.post('/ide/upload-image', ideImageUpload.single('image'), uploadIdeImage);
router.get('/assignments/:id/status/:studentId', getMySubmissionStatus);

// Note Routes
router.get('/notes/:studentId', getNotesForStudent);

module.exports = router;
