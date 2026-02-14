const express = require('express');
const router = express.Router();
const {
  createQuiz,
  getQuizzes,
  getQuizById,
  updateQuiz,
  deleteQuiz,
  addQuestion,
  getQuestionsByQuiz,
  deleteQuestion,
} = require('../controllers/quizController');
const { protectAdmin } = require('../middleware/auth');

router.route('/')
  .get(getQuizzes)
  .post(protectAdmin, createQuiz);

router.route('/:id')
  .get(getQuizById)
  .put(protectAdmin, updateQuiz)
  .delete(protectAdmin, deleteQuiz);

router.route('/:quizId/questions')
  .get(getQuestionsByQuiz)
  .post(protectAdmin, addQuestion);

router.route('/questions/:id')
  .delete(protectAdmin, deleteQuestion);

module.exports = router;
