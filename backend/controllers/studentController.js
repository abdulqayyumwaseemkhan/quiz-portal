const asyncHandler = require('express-async-handler');
const jwt = require('jsonwebtoken');
const Quiz = require('../models/Quiz');
const Question = require('../models/Question');
const Result = require('../models/Result');
const Student = require('../models/Student');
const { hashPassword, verifyPassword } = require('../utils/password');

const generateStudentToken = (student) => {
  return jwt.sign(
    {
      id: student._id,
      studentId: student.studentId,
      role: 'student',
      addedBy: student.addedBy,
    },
    process.env.JWT_SECRET,
    { expiresIn: '12h' }
  );
};

// @desc    Student login with Student ID + password
// @route   POST /api/student/login
const loginStudent = asyncHandler(async (req, res) => {
  const { studentId, password } = req.body;
  if (!studentId || !password) {
    res.status(400);
    throw new Error('Please enter both Student ID and password');
  }

  const trimmedId = String(studentId).trim();
  const student = await Student.findOne({
    studentId: { $regex: `^${trimmedId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' },
  }).select('+passwordHash');

  if (!student) {
    res.status(401);
    throw new Error('Invalid Student ID or password');
  }

  if (student.isActive === false) {
    res.status(403);
    throw new Error('Your account has been deactivated. Please contact your administrator.');
  }

  let isMatch = false;
  if (student.passwordHash) {
    isMatch = await verifyPassword(String(password), student.passwordHash);
  } else {
    // Legacy migration fallback: if pre-Phase-1 student has no passwordHash yet,
    // allow signing in with their studentId as initial password and require password change.
    isMatch = String(password).trim().toLowerCase() === student.studentId.toLowerCase();
  }

  if (!isMatch) {
    res.status(401);
    throw new Error('Invalid Student ID or password');
  }

  const mustChangePassword = !student.passwordHash ? true : Boolean(student.mustChangePassword);

  res.json({
    _id: student._id,
    studentId: student.studentId,
    fullName: student.fullName,
    email: student.email || '',
    contact: student.contact || '',
    campus: student.campus,
    batch: student.batch,
    addedBy: student.addedBy,
    mustChangePassword,
    token: generateStudentToken(student),
  });
});

// @desc    Change student password
// @route   PUT /api/student/change-password
const changeStudentPassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!newPassword || String(newPassword).length < 6) {
    res.status(400);
    throw new Error('New password must be at least 6 characters long');
  }

  const student = await Student.findById(req.student._id).select('+passwordHash');
  if (!student) {
    res.status(404);
    throw new Error('Student not found');
  }

  if (student.passwordHash && currentPassword) {
    const validCurrent = await verifyPassword(String(currentPassword), student.passwordHash);
    if (!validCurrent) {
      res.status(400);
      throw new Error('Current password is incorrect');
    }
  } else if (student.passwordHash && !student.mustChangePassword && !currentPassword) {
    res.status(400);
    throw new Error('Current password is required');
  }

  student.passwordHash = await hashPassword(String(newPassword));
  student.mustChangePassword = false;
  await student.save();

  res.json({
    message: 'Password updated successfully',
    mustChangePassword: false,
  });
});

// @desc    Update student contact & email profile
// @route   PUT /api/student/profile
const updateStudentProfile = asyncHandler(async (req, res) => {
  const { contact, email } = req.body;

  const student = await Student.findById(req.student._id);
  if (!student) {
    res.status(404);
    throw new Error('Student not found');
  }

  if (email !== undefined) {
    const cleanEmail = String(email).trim().toLowerCase();
    if (cleanEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      res.status(400);
      throw new Error('Please provide a valid email address');
    }
    student.email = cleanEmail;
  }

  if (contact !== undefined) {
    student.contact = String(contact).trim();
  }

  await student.save();

  res.json({
    _id: student._id,
    studentId: student.studentId,
    fullName: student.fullName,
    email: student.email || '',
    contact: student.contact || '',
    campus: student.campus,
    batch: student.batch,
    addedBy: student.addedBy,
    mustChangePassword: Boolean(student.mustChangePassword),
  });
});

// Legacy ID lookup (kept for backwards compatibility, never exposes passwordHash)
const verifyStudentId = asyncHandler(async (req, res) => {
  const { studentId } = req.params;
  const student = await Student.findOne({ studentId }).select('-passwordHash').lean();
  if (student) {
    if (student.isActive === false) {
      res.status(403);
      throw new Error('Student account is deactivated');
    }
    res.json(student);
  } else {
    res.status(404);
    throw new Error('Student ID not found in record');
  }
});

const getAvailableQuizzes = asyncHandler(async (req, res) => {
  const { studentId } = req.params;
  const student = await Student.findOne({ studentId }).lean();
  
  if (!student) {
    res.status(404);
    throw new Error('Student not found');
  }

  const quizzes = await Quiz.find({ createdBy: student.addedBy }).sort({ createdAt: -1 }).lean();
  res.json(quizzes);
});

const getQuizForAttempt = asyncHandler(async (req, res) => {
  const { quizId, studentId } = req.params;

  // Check if student already attempted
  const existingResult = await Result.findOne({ studentId, quizId }).lean();
  if (existingResult) {
    res.status(400);
    throw new Error('You have already attempted this quiz');
  }

  const quiz = await Quiz.findById(quizId).lean();
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

  let questions = await Question.find({ quizId }).select('-correctAnswer').lean();
  
  // Randomize questions
  questions = questions.sort(() => Math.random() - 0.5);

  // Randomize options for MCQ
  questions = questions.map(q => {
    if (q.type === 'mcq' && q.options) {
      q.options = [...q.options].sort(() => Math.random() - 0.5);
    }
    return q;
  });

  res.json({ quiz, questions });
});

const submitQuiz = asyncHandler(async (req, res) => {
  const { studentName, studentId, quizId, userAnswers } = req.body;

  // Double check existence
  const existingResult = await Result.findOne({ studentId, quizId }).lean();
  if (existingResult) {
    res.status(400);
    throw new Error('Duplicate submission');
  }

  const questions = await Question.find({ quizId }).lean();
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

  const percentage = totalPossibleMarks > 0 ? (score / totalPossibleMarks) * 100 : 0;

  const studentDoc = await Student.findOne({ studentId }).lean();

  const result = await Result.create({
    studentName,
    studentId,
    campus: studentDoc?.campus,
    batch: studentDoc?.batch,
    quizId,
    answers: processedAnswers,
    score,
    totalPossibleMarks,
    percentage: Number(percentage.toFixed(2)),
  });

  res.status(201).json(result);
});

const getStudentResult = asyncHandler(async (req, res) => {
  const { resultId } = req.params;
  const result = await Result.findById(resultId)
    .populate('quizId', 'title description resultsReleased')
    .populate('answers.questionId', 'questionText type options correctAnswer explanation')
    .lean();
  
  if (!result) {
    res.status(404);
    throw new Error('Result not found');
  }

  // If results are not released, don't send scores or specific answers
  if (!result.quizId?.resultsReleased) {
    return res.json({
      _id: result._id,
      studentName: result.studentName,
      studentId: result.studentId,
      quizId: {
        _id: result.quizId?._id,
        title: result.quizId?.title,
        description: result.quizId?.description,
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
  const attempt = await Result.findOne({ studentId, quizId }).select('_id').lean();
  res.json({ attempted: !!attempt, resultId: attempt ? attempt._id : null });
});

module.exports = {
  loginStudent,
  changeStudentPassword,
  updateStudentProfile,
  getAvailableQuizzes,
  getQuizForAttempt,
  submitQuiz,
  getStudentResult,
  checkAttemptStatus,
  verifyStudentId
};
