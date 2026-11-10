const asyncHandler = require('express-async-handler');
const jwt = require('jsonwebtoken');
const Quiz = require('../models/Quiz');
const Question = require('../models/Question');
const Result = require('../models/Result');
const Student = require('../models/Student');
const cache = require('../utils/cache');
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

function shuffleArray(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

async function getCachedQuizAndQuestions(quizId) {
  const cacheKey = `quiz:${quizId}:bundle`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const [quiz, fullQuestions] = await Promise.all([
    Quiz.findById(quizId).lean(),
    Question.find({ quizId }).sort({ createdAt: 1 }).lean(),
  ]);

  if (!quiz) return null;

  const bundle = { quiz, fullQuestions };
  cache.set(cacheKey, bundle, 15000); // 15s TTL for high-concurrency burst protection
  return bundle;
}

function gradeAttemptAnswers(fullQuestions, userAnswers = []) {
  let score = 0;
  let totalPossibleMarks = 0;
  const answerMap = new Map(
    (Array.isArray(userAnswers) ? userAnswers : []).map((ua) => [String(ua.questionId), String(ua.answer ?? '')])
  );

  const processedAnswers = fullQuestions.map((q) => {
    const marks = Number(q.marks) || 1;
    totalPossibleMarks += marks;
    const userAnswerText = answerMap.get(q._id.toString()) || '';

    let isCorrect = false;
    if (q.type === 'mcq') {
      isCorrect = userAnswerText === q.correctAnswer;
    } else {
      isCorrect = userAnswerText.trim().toLowerCase() === String(q.correctAnswer || '').trim().toLowerCase();
    }

    const marksObtained = isCorrect ? marks : 0;
    if (isCorrect) score += marks;

    return {
      questionId: q._id,
      answer: userAnswerText,
      isCorrect,
      marksObtained,
    };
  });

  const percentage = totalPossibleMarks > 0 ? Number(((score / totalPossibleMarks) * 100).toFixed(2)) : 0;
  return { score, totalPossibleMarks, percentage, processedAnswers };
}

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

// Legacy ID lookup
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
  const student = req.student?.studentId === studentId
    ? req.student
    : await Student.findOne({ studentId }).select('-passwordHash').lean();

  if (!student) {
    res.status(404);
    throw new Error('Student not found');
  }

  // Single batch fetch for quizzes + student's attempts (avoids N+1 requests)
  const [quizzes, studentResults] = await Promise.all([
    Quiz.find({
      createdBy: student.addedBy,
      isPublished: { $ne: false },
      $and: [
        { $or: [{ campus: '' }, { campus: { $exists: false } }, { campus: student.campus }] },
        { $or: [{ batch: '' }, { batch: { $exists: false } }, { batch: student.batch }] },
      ],
    })
      .sort({ createdAt: -1 })
      .lean(),
    Result.find({ studentId: student.studentId })
      .select('_id quizId status attemptNo score totalPossibleMarks percentage submittedAt startedAt')
      .sort({ attemptNo: -1, createdAt: -1 })
      .lean(),
  ]);

  const resultsByQuiz = new Map();
  studentResults.forEach((r) => {
    const key = r.quizId.toString();
    if (!resultsByQuiz.has(key)) resultsByQuiz.set(key, []);
    resultsByQuiz.get(key).push(r);
  });

  const enriched = quizzes.map((q) => {
    const attempts = resultsByQuiz.get(q._id.toString()) || [];
    const submittedAttempts = attempts.filter((a) => a.status !== 'in_progress');
    const inProgress = attempts.find((a) => a.status === 'in_progress');
    const latestSubmitted = submittedAttempts[0] || null;
    const attemptsAllowed = q.attemptsAllowed || 1;
    const exhaustedAttempts = submittedAttempts.length >= attemptsAllowed;

    return {
      ...q,
      attemptInfo: {
        attempted: exhaustedAttempts && !inProgress,
        hasCompletedAttempt: submittedAttempts.length > 0,
        attemptsUsed: submittedAttempts.length,
        attemptsAllowed,
        inProgress: Boolean(inProgress),
        resultId: latestSubmitted ? latestSubmitted._id : null,
        latestScore: latestSubmitted ? latestSubmitted.score : null,
        latestPercentage: latestSubmitted ? latestSubmitted.percentage : null,
      },
    };
  });

  res.json(enriched);
});

const getQuizForAttempt = asyncHandler(async (req, res) => {
  const { quizId, studentId } = req.params;

  const bundle = await getCachedQuizAndQuestions(quizId);
  if (!bundle || !bundle.quiz) {
    res.status(404);
    throw new Error('Quiz not found');
  }

  const { quiz, fullQuestions } = bundle;

  if (quiz.isPublished === false) {
    res.status(400);
    throw new Error('This quiz is not currently published');
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

  const student = req.student?.studentId === studentId
    ? req.student
    : await Student.findOne({ studentId }).select('-passwordHash').lean();

  if (!student) {
    res.status(404);
    throw new Error('Student not found');
  }

  // Check existing attempts for this student + quiz
  const existingAttempts = await Result.find({ studentId, quizId })
    .sort({ attemptNo: -1, createdAt: -1 });

  let activeAttempt = existingAttempts.find((a) => a.status === 'in_progress');
  const submittedAttempts = existingAttempts.filter((a) => a.status !== 'in_progress');
  const attemptsAllowed = Math.max(1, quiz.attemptsAllowed || 1);
  const durationSeconds = Math.max(60, (quiz.duration || 30) * 60);

  // If there is an active in_progress attempt, check if server timer already expired
  if (activeAttempt) {
    const elapsedSeconds = Math.floor((Date.now() - new Date(activeAttempt.startedAt).getTime()) / 1000);
    const remainingSeconds = durationSeconds - elapsedSeconds;

    if (remainingSeconds <= 0) {
      // Auto-submit expired attempt on the server
      const graded = gradeAttemptAnswers(fullQuestions, activeAttempt.draftAnswers || []);
      activeAttempt.status = 'submitted';
      activeAttempt.answers = graded.processedAnswers;
      activeAttempt.score = graded.score;
      activeAttempt.totalPossibleMarks = graded.totalPossibleMarks;
      activeAttempt.percentage = graded.percentage;
      activeAttempt.submittedAt = new Date();
      activeAttempt.draftAnswers = [];
      await activeAttempt.save();
      submittedAttempts.unshift(activeAttempt);
      activeAttempt = null;
    }
  }

  if (!activeAttempt) {
    if (submittedAttempts.length >= attemptsAllowed) {
      res.status(400);
      throw new Error('You have already attempted this quiz');
    }

    const nextAttemptNo = submittedAttempts.length + 1;
    try {
      activeAttempt = await Result.create({
        studentName: student.fullName,
        studentId: student.studentId,
        campus: student.campus || '',
        batch: student.batch || '',
        quizId,
        attemptNo: nextAttemptNo,
        status: 'in_progress',
        startedAt: new Date(),
        lastSavedAt: new Date(),
        draftAnswers: [],
        answers: [],
        score: 0,
        totalPossibleMarks: quiz.totalMarks || 0,
        percentage: 0,
      });
    } catch (err) {
      // Handle race condition if student double-clicked Start Quiz
      activeAttempt = await Result.findOne({ studentId, quizId, status: 'in_progress' });
      if (!activeAttempt) throw err;
    }
  }

  const elapsed = Math.floor((Date.now() - new Date(activeAttempt.startedAt).getTime()) / 1000);
  const remainingSeconds = Math.max(1, durationSeconds - elapsed);

  // Strip correctAnswer and explanation before sending to client!
  let sanitizedQuestions = fullQuestions.map((q) => ({
    _id: q._id,
    quizId: q.quizId,
    questionText: q.questionText,
    type: q.type,
    options: q.type === 'mcq' && Array.isArray(q.options)
      ? (quiz.shuffleOptions !== false ? shuffleArray(q.options) : [...q.options])
      : [],
    marks: q.marks,
  }));

  if (quiz.shuffleQuestions !== false) {
    sanitizedQuestions = shuffleArray(sanitizedQuestions);
  }

  res.json({
    quiz,
    questions: sanitizedQuestions,
    attempt: {
      _id: activeAttempt._id,
      attemptNo: activeAttempt.attemptNo,
      startedAt: activeAttempt.startedAt,
      remainingSeconds,
      draftAnswers: activeAttempt.draftAnswers || [],
    },
  });
});

// @desc    Lightweight periodic autosave of student's in-progress answers
// @route   PUT /api/student/quiz/:quizId/autosave
const autosaveQuizAttempt = asyncHandler(async (req, res) => {
  const { quizId } = req.params;
  const { studentId, attemptId, userAnswers } = req.body;

  if (!Array.isArray(userAnswers)) {
    res.status(400);
    throw new Error('Invalid answers payload');
  }

  const sanitizedDraft = userAnswers.slice(0, 300).map((ua) => ({
    questionId: String(ua.questionId || ''),
    answer: String(ua.answer ?? ''),
  }));

  const filter = attemptId
    ? { _id: attemptId, studentId, quizId, status: 'in_progress' }
    : { studentId, quizId, status: 'in_progress' };

  await Result.updateOne(filter, {
    $set: {
      draftAnswers: sanitizedDraft,
      lastSavedAt: new Date(),
    },
  });

  res.json({ saved: true, savedAt: new Date() });
});

// @desc    Idempotent quiz submission with server-side grading
// @route   POST /api/student/submit
const submitQuiz = asyncHandler(async (req, res) => {
  const { studentName, studentId, quizId, attemptId, userAnswers } = req.body;

  const bundle = await getCachedQuizAndQuestions(quizId);
  if (!bundle || !bundle.quiz) {
    res.status(404);
    throw new Error('Quiz not found');
  }

  const { fullQuestions } = bundle;

  // Find either the specified attempt or latest attempt for this student+quiz
  let attempt = attemptId
    ? await Result.findOne({ _id: attemptId, studentId, quizId })
    : await Result.findOne({ studentId, quizId }).sort({ attemptNo: -1, createdAt: -1 });

  // Idempotency: if already submitted, return existing result without error!
  if (attempt && attempt.status === 'submitted' && attempt.answers && attempt.answers.length > 0) {
    return res.status(200).json({
      _id: attempt._id,
      studentName: attempt.studentName,
      studentId: attempt.studentId,
      quizId: attempt.quizId,
      attemptNo: attempt.attemptNo,
      submittedAt: attempt.submittedAt,
    });
  }

  const finalUserAnswers =
    Array.isArray(userAnswers) && userAnswers.length > 0
      ? userAnswers
      : attempt?.draftAnswers || [];

  const { score, totalPossibleMarks, percentage, processedAnswers } = gradeAttemptAnswers(
    fullQuestions,
    finalUserAnswers
  );

  if (attempt) {
    attempt.status = 'submitted';
    attempt.answers = processedAnswers;
    attempt.draftAnswers = [];
    attempt.score = score;
    attempt.totalPossibleMarks = totalPossibleMarks;
    attempt.percentage = percentage;
    attempt.submittedAt = new Date();
    await attempt.save();
  } else {
    const studentDoc = await Student.findOne({ studentId }).select('fullName campus batch').lean();
    try {
      attempt = await Result.create({
        studentName: studentName || studentDoc?.fullName || studentId,
        studentId,
        campus: studentDoc?.campus || '',
        batch: studentDoc?.batch || '',
        quizId,
        attemptNo: 1,
        status: 'submitted',
        answers: processedAnswers,
        draftAnswers: [],
        score,
        totalPossibleMarks,
        percentage,
        submittedAt: new Date(),
      });
    } catch (err) {
      // Idempotent fallback on unique index collision
      const existing = await Result.findOne({ studentId, quizId }).sort({ attemptNo: -1 });
      if (existing) {
        return res.status(200).json(existing);
      }
      throw err;
    }
  }

  res.status(201).json({
    _id: attempt._id,
    studentName: attempt.studentName,
    studentId: attempt.studentId,
    quizId: attempt.quizId,
    attemptNo: attempt.attemptNo,
    submittedAt: attempt.submittedAt,
  });
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
  const [quiz, attempts] = await Promise.all([
    Quiz.findById(quizId).select('attemptsAllowed').lean(),
    Result.find({ studentId, quizId }).select('_id status attemptNo').sort({ attemptNo: -1 }).lean(),
  ]);

  const inProgress = attempts.find((a) => a.status === 'in_progress');
  const submitted = attempts.filter((a) => a.status !== 'in_progress');
  const attemptsAllowed = quiz?.attemptsAllowed || 1;
  const exhausted = submitted.length >= attemptsAllowed && !inProgress;

  res.json({
    attempted: exhausted,
    inProgress: Boolean(inProgress),
    attemptsUsed: submitted.length,
    attemptsAllowed,
    resultId: submitted[0] ? submitted[0]._id : null,
  });
});

module.exports = {
  loginStudent,
  changeStudentPassword,
  updateStudentProfile,
  getAvailableQuizzes,
  getQuizForAttempt,
  autosaveQuizAttempt,
  submitQuiz,
  getStudentResult,
  checkAttemptStatus,
  verifyStudentId
};
