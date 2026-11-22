const express = require('express');
const router = express.Router();
const {
  createQuiz,
  getQuizzes,
  getQuizById,
  updateQuiz,
  duplicateQuiz,
  deleteQuiz,
  addQuestion,
  bulkAddQuestions,
  getQuestionsByQuiz,
  updateQuestion,
  deleteQuestion,
  getResultDetails,
  gradeResultAnswers,
  deleteQuizResult,
} = require('../controllers/quizController');
const { protectAdmin } = require('../middleware/auth');

router.get('/results/:id', protectAdmin, getResultDetails);
router.put('/results/:id/grade', protectAdmin, gradeResultAnswers);
router.delete('/results/:id', protectAdmin, deleteQuizResult);

router.route('/')
  .get(protectAdmin, getQuizzes)
  .post(protectAdmin, createQuiz);

router.post('/:id/duplicate', protectAdmin, duplicateQuiz);

router.route('/:id')
  .get(getQuizById)
  .put(protectAdmin, updateQuiz)
  .delete(protectAdmin, deleteQuiz);

router.route('/:quizId/questions')
  .get(protectAdmin, getQuestionsByQuiz)
  .post(protectAdmin, addQuestion);

router.post('/:quizId/questions/bulk', protectAdmin, bulkAddQuestions);

router.route('/questions/:id')
  .put(protectAdmin, updateQuestion)
  .delete(protectAdmin, deleteQuestion);

module.exports = router;
