const asyncHandler = require('express-async-handler');
const Quiz = require('../models/Quiz');
const Question = require('../models/Question');
const Result = require('../models/Result');
const cache = require('../utils/cache');
const { getAdminScope } = require('../middleware/auth');

async function syncQuizTotalMarks(quizId) {
  const agg = await Question.aggregate([
    { $match: { quizId: typeof quizId === 'string' ? new (require('mongoose').Types.ObjectId)(quizId) : quizId } },
    { $group: { _id: '$quizId', total: { $sum: '$marks' } } },
  ]);
  const sumMarks = agg[0]?.total || 0;
  if (sumMarks > 0) {
    await Quiz.updateOne({ _id: quizId }, { $set: { totalMarks: sumMarks } });
  }
  cache.invalidate(`quiz:${quizId}`);
}

// --- Quiz Controllers ---

const createQuiz = asyncHandler(async (req, res) => {
  const {
    title,
    description,
    duration,
    totalMarks,
    startDate,
    endDate,
    campus,
    batch,
    shuffleQuestions,
    shuffleOptions,
    attemptsAllowed,
    isPublished,
    resultsReleased,
  } = req.body;

  const quiz = await Quiz.create({
    title,
    description,
    duration: Number(duration) || 30,
    totalMarks: Number(totalMarks) || 10,
    startDate: startDate || null,
    endDate: endDate || null,
    campus: (campus || '').trim(),
    batch: (batch || '').trim(),
    shuffleQuestions: shuffleQuestions !== undefined ? Boolean(shuffleQuestions) : true,
    shuffleOptions: shuffleOptions !== undefined ? Boolean(shuffleOptions) : true,
    attemptsAllowed: Math.max(1, Number(attemptsAllowed) || 1),
    isPublished: isPublished !== undefined ? Boolean(isPublished) : true,
    resultsReleased: Boolean(resultsReleased),
    createdBy: req.admin._id,
  });

  res.status(201).json(quiz);
});

const getQuizzes = asyncHandler(async (req, res) => {
  const query = getAdminScope(req, 'createdBy');
  const quizzes = await Quiz.find(query).sort({ createdAt: -1 }).lean();

  if (quizzes.length === 0) {
    return res.json([]);
  }

  const quizIds = quizzes.map((q) => q._id);

  // Aggregate question counts & submitted attempt counts in single batch queries (no N+1)
  const [questionCounts, attemptCounts] = await Promise.all([
    Question.aggregate([
      { $match: { quizId: { $in: quizIds } } },
      { $group: { _id: '$quizId', count: { $sum: 1 }, marksSum: { $sum: '$marks' } } },
    ]),
    Result.aggregate([
      { $match: { quizId: { $in: quizIds }, status: { $ne: 'in_progress' } } },
      { $group: { _id: '$quizId', count: { $sum: 1 } } },
    ]),
  ]);

  const qCountMap = new Map(questionCounts.map((i) => [i._id.toString(), i]));
  const aCountMap = new Map(attemptCounts.map((i) => [i._id.toString(), i.count]));

  const enriched = quizzes.map((q) => {
    const qMeta = qCountMap.get(q._id.toString());
    return {
      ...q,
      questionCount: qMeta?.count || 0,
      attemptCount: aCountMap.get(q._id.toString()) || 0,
    };
  });

  res.json(enriched);
});

const getQuizById = asyncHandler(async (req, res) => {
  const quiz = await Quiz.findById(req.params.id).lean();
  if (quiz) {
    res.json(quiz);
  } else {
    res.status(404);
    throw new Error('Quiz not found');
  }
});

const updateQuiz = asyncHandler(async (req, res) => {
  const scope = getAdminScope(req, 'createdBy');
  const quiz = await Quiz.findOne({ _id: req.params.id, ...scope });
  if (!quiz) {
    res.status(404);
    throw new Error('Quiz not found');
  }

  if (req.body.title !== undefined) quiz.title = req.body.title.trim();
  if (req.body.description !== undefined) quiz.description = req.body.description;
  if (req.body.duration !== undefined) quiz.duration = Number(req.body.duration);
  if (req.body.totalMarks !== undefined) quiz.totalMarks = Number(req.body.totalMarks);
  if (req.body.hasOwnProperty('startDate')) quiz.startDate = req.body.startDate || null;
  if (req.body.hasOwnProperty('endDate')) quiz.endDate = req.body.endDate || null;
  if (req.body.hasOwnProperty('campus')) quiz.campus = (req.body.campus || '').trim();
  if (req.body.hasOwnProperty('batch')) quiz.batch = (req.body.batch || '').trim();
  if (req.body.hasOwnProperty('shuffleQuestions')) quiz.shuffleQuestions = Boolean(req.body.shuffleQuestions);
  if (req.body.hasOwnProperty('shuffleOptions')) quiz.shuffleOptions = Boolean(req.body.shuffleOptions);
  if (req.body.hasOwnProperty('attemptsAllowed')) {
    quiz.attemptsAllowed = Math.max(1, Number(req.body.attemptsAllowed) || 1);
  }
  if (req.body.hasOwnProperty('isPublished')) quiz.isPublished = Boolean(req.body.isPublished);
  if (req.body.hasOwnProperty('resultsReleased')) quiz.resultsReleased = Boolean(req.body.resultsReleased);

  const updatedQuiz = await quiz.save();
  cache.invalidate(`quiz:${quiz._id}`);
  res.json(updatedQuiz);
});

const duplicateQuiz = asyncHandler(async (req, res) => {
  const scope = getAdminScope(req, 'createdBy');
  const original = await Quiz.findOne({ _id: req.params.id, ...scope }).lean();
  if (!original) {
    res.status(404);
    throw new Error('Original quiz not found');
  }

  const { title, campus, batch, startDate, endDate, isPublished } = req.body || {};

  const duplicatedQuiz = await Quiz.create({
    title: title ? title.trim() : `${original.title} (Copy)`,
    description: original.description,
    duration: original.duration,
    totalMarks: original.totalMarks,
    startDate: startDate !== undefined ? startDate : original.startDate,
    endDate: endDate !== undefined ? endDate : original.endDate,
    campus: campus !== undefined ? campus.trim() : original.campus || '',
    batch: batch !== undefined ? batch.trim() : original.batch || '',
    shuffleQuestions: original.shuffleQuestions !== false,
    shuffleOptions: original.shuffleOptions !== false,
    attemptsAllowed: original.attemptsAllowed || 1,
    isPublished: isPublished !== undefined ? Boolean(isPublished) : false,
    resultsReleased: false,
    createdBy: req.admin._id,
  });

  const originalQuestions = await Question.find({ quizId: original._id }).lean();
  if (originalQuestions.length > 0) {
    const clonedQuestions = originalQuestions.map((q) => ({
      quizId: duplicatedQuiz._id,
      questionText: q.questionText,
      type: q.type,
      options: q.options || [],
      correctAnswer: q.correctAnswer,
      marks: q.marks || 1,
      explanation: q.explanation || '',
    }));
    await Question.insertMany(clonedQuestions);
  }

  res.status(201).json({
    ...duplicatedQuiz.toObject(),
    questionCount: originalQuestions.length,
    attemptCount: 0,
  });
});

const deleteQuiz = asyncHandler(async (req, res) => {
  const scope = getAdminScope(req, 'createdBy');
  const quiz = await Quiz.findOne({ _id: req.params.id, ...scope });
  if (quiz) {
    await Question.deleteMany({ quizId: quiz._id });
    await Quiz.deleteOne({ _id: quiz._id });
    cache.invalidate(`quiz:${quiz._id}`);
    res.json({ message: 'Quiz and its questions removed' });
  } else {
    res.status(404);
    throw new Error('Quiz not found');
  }
});

// --- Question Controllers ---

const addQuestion = asyncHandler(async (req, res) => {
  const scope = getAdminScope(req, 'createdBy');
  const quiz = await Quiz.findOne({ _id: req.params.quizId, ...scope }).lean();
  if (!quiz) {
    res.status(404);
    throw new Error('Quiz not found');
  }

  const { questionText, type = 'mcq', options = [], correctAnswer, marks = 1, explanation = '' } = req.body;
  const cleanOptions = Array.isArray(options) ? options.map((o) => String(o || '').trim()).filter(Boolean) : [];

  const question = await Question.create({
    quizId: req.params.quizId,
    questionText: String(questionText || '').trim(),
    type,
    options: type === 'mcq' ? cleanOptions : [],
    correctAnswer: String(correctAnswer || '').trim(),
    marks: Number(marks) || 1,
    explanation: String(explanation || '').trim(),
  });

  await syncQuizTotalMarks(req.params.quizId);
  res.status(201).json(question);
});

const bulkAddQuestions = asyncHandler(async (req, res) => {
  const scope = getAdminScope(req, 'createdBy');
  const quiz = await Quiz.findOne({ _id: req.params.quizId, ...scope }).lean();
  if (!quiz) {
    res.status(404);
    throw new Error('Quiz not found');
  }

  const { questions } = req.body;
  if (!Array.isArray(questions) || questions.length === 0) {
    res.status(400);
    throw new Error('No questions provided for bulk import');
  }

  const docsToInsert = [];
  const errors = [];

  questions.forEach((raw, idx) => {
    const questionText = String(raw.questionText || raw.question || '').trim();
    const rawOptions = Array.isArray(raw.options)
      ? raw.options.map((o) => String(o ?? '').trim()).filter(Boolean)
      : [raw.optionA, raw.optionB, raw.optionC, raw.optionD, raw.optionE]
          .map((o) => String(o ?? '').trim())
          .filter(Boolean);

    let correct = String(raw.correctAnswer ?? raw.correctOption ?? '').trim();
    const marks = Math.max(0.5, Number(raw.marks) || 1);
    const explanation = String(raw.explanation || '').trim();

    if (!questionText) {
      errors.push({ row: idx + 1, message: 'Missing question text' });
      return;
    }
    if (rawOptions.length < 2) {
      errors.push({ row: idx + 1, message: 'At least 2 options are required' });
      return;
    }

    // Map letter answers like "A", "Option B", "1" to actual option string
    const letterMatch = correct.match(/^(?:option\s*)?([a-eA-E])$/i);
    if (letterMatch) {
      const letterIdx = letterMatch[1].toUpperCase().charCodeAt(0) - 65;
      if (rawOptions[letterIdx]) {
        correct = rawOptions[letterIdx];
      }
    } else {
      // Case-insensitive match against option values
      const matchedOpt = rawOptions.find((o) => o.toLowerCase() === correct.toLowerCase());
      if (matchedOpt) correct = matchedOpt;
    }

    if (!correct || !rawOptions.includes(correct)) {
      errors.push({
        row: idx + 1,
        message: `Correct option "${correct || '(empty)'}" does not match any provided option`,
      });
      return;
    }

    docsToInsert.push({
      quizId: quiz._id,
      questionText,
      type: 'mcq',
      options: rawOptions,
      correctAnswer: correct,
      marks,
      explanation,
    });
  });

  if (docsToInsert.length === 0) {
    res.status(400);
    throw new Error(errors[0]?.message || 'No valid questions to insert');
  }

  const inserted = await Question.insertMany(docsToInsert, { ordered: false });
  await syncQuizTotalMarks(quiz._id);

  res.status(201).json({
    insertedCount: inserted.length,
    errorCount: errors.length,
    questions: inserted,
    errors,
  });
});

const getQuestionsByQuiz = asyncHandler(async (req, res) => {
  const questions = await Question.find({ quizId: req.params.quizId }).sort({ createdAt: 1 }).lean();
  res.json(questions);
});

const updateQuestion = asyncHandler(async (req, res) => {
  const question = await Question.findById(req.params.id);
  if (!question) {
    res.status(404);
    throw new Error('Question not found');
  }

  const scope = getAdminScope(req, 'createdBy');
  const quiz = await Quiz.findOne({ _id: question.quizId, ...scope }).lean();
  if (!quiz) {
    res.status(403);
    throw new Error('Not authorized to edit this question');
  }

  if (req.body.questionText !== undefined) question.questionText = String(req.body.questionText).trim();
  if (req.body.type !== undefined) question.type = req.body.type;
  if (Array.isArray(req.body.options)) {
    question.options = req.body.options.map((o) => String(o || '').trim()).filter(Boolean);
  }
  if (req.body.correctAnswer !== undefined) question.correctAnswer = String(req.body.correctAnswer).trim();
  if (req.body.marks !== undefined) question.marks = Number(req.body.marks) || 1;
  if (req.body.explanation !== undefined) question.explanation = String(req.body.explanation).trim();

  const updated = await question.save();
  await syncQuizTotalMarks(question.quizId);
  res.json(updated);
});

const deleteQuestion = asyncHandler(async (req, res) => {
  const question = await Question.findById(req.params.id);
  if (!question) {
    res.status(404);
    throw new Error('Question not found');
  }

  const quizId = question.quizId;
  await Question.deleteOne({ _id: question._id });
  await syncQuizTotalMarks(quizId);
  res.json({ message: 'Question removed' });
});

// --- Results Controllers (Admin) ---

const getAllResults = asyncHandler(async (req, res) => {
  const { quizId, studentId, campus, batch } = req.query;
  const scope = getAdminScope(req, 'createdBy');

  const adminQuizzes = await Quiz.find(scope).select('_id title').lean();
  const quizMap = new Map(adminQuizzes.map((q) => [q._id.toString(), q]));
  const allowedQuizIds = adminQuizzes.map((q) => q._id);

  if (allowedQuizIds.length === 0) {
    return res.json([]);
  }

  const matchQuery = {
    quizId: { $in: allowedQuizIds },
    status: { $ne: 'in_progress' },
  };

  if (quizId) {
    if (!quizMap.has(quizId)) {
      return res.json([]);
    }
    matchQuery.quizId = quizId;
  }
  if (studentId) {
    matchQuery.studentId = { $regex: String(studentId).trim(), $options: 'i' };
  }
  if (campus) matchQuery.campus = campus;
  if (batch) matchQuery.batch = batch;

  const results = await Result.find(matchQuery)
    .select('-answers -draftAnswers')
    .populate('quizId', 'title campus batch')
    .sort({ submittedAt: -1 })
    .lean();

  res.json(results);
});

module.exports = {
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
  getAllResults,
};
