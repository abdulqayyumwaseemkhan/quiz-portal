const asyncHandler = require('express-async-handler');
const Quiz = require('../models/Quiz');
const Question = require('../models/Question');
const Result = require('../models/Result');
const Student = require('../models/Student');

// Student login via ID verification
const verifyStudentId = asyncHandler(async (req, res) => {
  const { studentId } = req.params;
  const student = await Student.findOne({ studentId });
  if (student) {
    res.json(student);
  } else {
    res.status(404);
    throw new Error('Student ID not found in record');
  }
});

const getAvailableQuizzes = asyncHandler(async (req, res) => {
  const { studentId } = req.params;
  const student = await Student.findOne({ studentId });
  
  if (!student) {
    res.status(404);
    throw new Error('Student not found');
  }

  const quizzes = await Quiz.find({ createdBy: student.addedBy }).sort({ createdAt: -1 });
  res.json(quizzes);
});

const getQuizForAttempt = asyncHandler(async (req, res) => {
  const { quizId, studentId } = req.params;

  // Check if student already attempted
  const existingResult = await Result.findOne({ studentId, quizId });
  if (existingResult) {
    res.status(400);
    throw new Error('You have already attempted this quiz');
  }

  const quiz = await Quiz.findById(quizId);
  if (!quiz) {
    res.status(404);
    throw new Error('Quiz not found');
  }

  const now = new Date();
  if (quiz.startDate && new Date(quiz.startDate) > now) {
    res.status(400);
    throw new Error('Quiz has not started yet');
  }
  if (quiz.endDate && new Date(quiz.endDate) < now) {
    res.status(400);
    throw new Error('Quiz has already closed');
  }

  let questions = await Question.find({ quizId }).select('-correctAnswer');
  
  // Randomize questions
  questions = questions.sort(() => Math.random() - 0.5);

  // Randomize options for MCQ
  questions = questions.map(q => {
    if (q.type === 'mcq' && q.options) {
      q.options = q.options.sort(() => Math.random() - 0.5);
    }
    return q;
  });

  res.json({ quiz, questions });
});

const submitQuiz = asyncHandler(async (req, res) => {
  const { studentName, studentId, quizId, userAnswers } = req.body;

  // Double check existence
  const existingResult = await Result.findOne({ studentId, quizId });
  if (existingResult) {
    res.status(400);
    throw new Error('Duplicate submission');
  }

  const questions = await Question.find({ quizId });
  let score = 0;
  let totalPossibleMarks = 0;
  const processedAnswers = [];

  questions.forEach(q => {
    totalPossibleMarks += q.marks;
    const userAnswerObj = userAnswers.find(ua => ua.questionId === q._id.toString());
    const userAnswerText = userAnswerObj ? userAnswerObj.answer : '';
    
    let isCorrect = false;
    if (q.type === 'mcq') {
      isCorrect = userAnswerText === q.correctAnswer;
    } else {
      // Short answer: Case insensitive, exact match
      isCorrect = userAnswerText.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase();
    }

    const marksObtained = isCorrect ? q.marks : 0;
    if (isCorrect) score += q.marks;

    processedAnswers.push({
      questionId: q._id,
      answer: userAnswerText,
      isCorrect,
      marksObtained
    });
  });

  const percentage = (score / totalPossibleMarks) * 100;

  const studentDoc = await Student.findOne({ studentId });

  const result = await Result.create({
    studentName,
    studentId,
    campus: studentDoc?.campus,
    batch: studentDoc?.batch,
    quizId,
    answers: processedAnswers,
    score,
    totalPossibleMarks,
    percentage: percentage.toFixed(2),
  });

  res.status(201).json(result);
});

const getStudentResult = asyncHandler(async (req, res) => {
  const { resultId } = req.params;
  const result = await Result.findById(resultId)
    .populate('quizId', 'title description resultsReleased')
    .populate('answers.questionId', 'questionText type options correctAnswer');
  
  if (!result) {
    res.status(404);
    throw new Error('Result not found');
  }

  // If results are not released, don't send scores or specific answers
  if (!result.quizId.resultsReleased) {
    return res.json({
      _id: result._id,
      studentName: result.studentName,
      studentId: result.studentId,
      quizId: {
        _id: result.quizId._id,
        title: result.quizId.title,
        description: result.quizId.description,
        resultsReleased: false
      },
      submittedAt: result.submittedAt,
      message: 'Results are pending release by admin. Check back later!'
    });
  }

  res.json(result);
});

const checkAttemptStatus = asyncHandler(async (req, res) => {
    const { studentId, quizId } = req.params;
    const attempt = await Result.findOne({ studentId, quizId });
    res.json({ attempted: !!attempt, resultId: attempt ? attempt._id : null });
});

module.exports = {
  getAvailableQuizzes,
  getQuizForAttempt,
  submitQuiz,
  getStudentResult,
  checkAttemptStatus,
  verifyStudentId
};
