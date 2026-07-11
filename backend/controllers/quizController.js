const asyncHandler = require('express-async-handler');
const Quiz = require('../models/Quiz');
const Question = require('../models/Question');
const Result = require('../models/Result');

// --- Quiz Controllers ---

const createQuiz = asyncHandler(async (req, res) => {
  const { title, description, duration, totalMarks, startDate, endDate, resultsReleased } = req.body;
  const quiz = await Quiz.create({
    title,
    description,
    duration,
    totalMarks,
    startDate,
    endDate,
    resultsReleased: resultsReleased || false,
    createdBy: req.admin._id,
  });
  res.status(201).json(quiz);
});

const getQuizzes = asyncHandler(async (req, res) => {
  let query = { createdBy: req.admin._id };
  const quizzes = await Quiz.find(query).sort({ createdAt: -1 });
  res.json(quizzes);
});

const getQuizById = asyncHandler(async (req, res) => {
  const quiz = await Quiz.findById(req.params.id);
  if (quiz) {
    res.json(quiz);
  } else {
    res.status(404);
    throw new Error('Quiz not found');
  }
});

const updateQuiz = asyncHandler(async (req, res) => {
  const quiz = await Quiz.findById(req.params.id);
  if (quiz) {
    quiz.title = req.body.title || quiz.title;
    quiz.description = req.body.description || quiz.description;
    quiz.duration = req.body.duration || quiz.duration;
    quiz.totalMarks = req.body.totalMarks || quiz.totalMarks;
    quiz.startDate = req.body.startDate || quiz.startDate;
    quiz.endDate = req.body.endDate || quiz.endDate;
    quiz.resultsReleased = req.body.hasOwnProperty('resultsReleased') 
      ? req.body.resultsReleased 
      : quiz.resultsReleased;
    
    const updatedQuiz = await quiz.save();
    res.json(updatedQuiz);
  } else {
    res.status(404);
    throw new Error('Quiz not found');
  }
});

const deleteQuiz = asyncHandler(async (req, res) => {
  const quiz = await Quiz.findById(req.params.id);
  if (quiz) {
    await Question.deleteMany({ quizId: quiz._id });
    await Quiz.deleteOne({ _id: quiz._id });
    res.json({ message: 'Quiz and its questions removed' });
  } else {
    res.status(404);
    throw new Error('Quiz not found');
  }
});

// --- Question Controllers ---

const addQuestion = asyncHandler(async (req, res) => {
  const { questionText, type, options, correctAnswer, marks } = req.body;
  const question = await Question.create({
    quizId: req.params.quizId,
    questionText,
    type,
    options,
    correctAnswer,
    marks,
  });
  res.status(201).json(question);
});

const getQuestionsByQuiz = asyncHandler(async (req, res) => {
  const questions = await Question.find({ quizId: req.params.quizId });
  res.json(questions);
});

const deleteQuestion = asyncHandler(async (req, res) => {
  const question = await Question.findById(req.params.id);
  if (question) {
    await Question.deleteOne({ _id: question._id });
    res.json({ message: 'Question removed' });
  } else {
    res.status(404);
    throw new Error('Question not found');
  }
});

// --- Results Controllers (Admin) ---

const getAllResults = asyncHandler(async (req, res) => {
  const { quizId, studentId, campus, batch } = req.query;
  let query = {};
  
  const adminQuizzes = await Quiz.find({ createdBy: req.admin._id }).distinct('_id');
  query.quizId = { $in: adminQuizzes };

  if (quizId) {
    if (query.quizId && query.quizId.$in) {
      if (!query.quizId.$in.map(id => id.toString()).includes(quizId)) {
        return res.json([]); 
      }
    }
    query.quizId = quizId;
  }
  if (studentId) query.studentId = { $regex: studentId, $options: 'i' };
  if (campus) query.campus = campus;
  if (batch) query.batch = batch;

  const results = await Result.find(query)
    .populate('quizId', 'title')
    .sort({ submittedAt: -1 });
  res.json(results);
});

module.exports = {
  createQuiz,
  getQuizzes,
  getQuizById,
  updateQuiz,
  deleteQuiz,
  addQuestion,
  getQuestionsByQuiz,
  deleteQuestion,
  getAllResults,
};
