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

router.get('/verify-id/:studentId', verifyStudentId);
router.get('/quizzes', getAvailableQuizzes);
router.get('/quiz/:quizId/:studentId', getQuizForAttempt);
router.post('/submit', submitQuiz);
router.get('/result/:resultId', getStudentResult);
router.get('/check-attempt/:quizId/:studentId', checkAttemptStatus);

module.exports = router;
