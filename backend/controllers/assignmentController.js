const asyncHandler = require('express-async-handler');
const Assignment = require('../models/Assignment');
const Submission = require('../models/Submission');
const Student = require('../models/Student');
const cloudinary = require('../config/cloudinary');
const { Readable } = require('stream');
const { getAdminScope } = require('../middleware/auth');

// --- Helper for Cloudinary Buffer Upload ---
const uploadToCloudinary = (buffer, folder, originalFilename) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'raw',
        folder,
        public_id: `${originalFilename.replace(/[^a-zA-Z0-9._-]/g, '_')}_${Date.now()}`,
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    const readableStream = new Readable();
    readableStream.push(buffer);
    readableStream.push(null);
    readableStream.pipe(stream);
  });
};

// --- Admin Controllers ---

const createAssignment = asyncHandler(async (req, res) => {
  const {
    title,
    description,
    dueDate,
    totalMarks,
    allowLateSubmission,
    campus,
    batch,
    projectType,
    category,
  } = req.body;

  const assignment = await Assignment.create({
    title: title.trim(),
    description: description || '',
    dueDate,
    totalMarks: Number(totalMarks) || 100,
    allowLateSubmission: allowLateSubmission !== undefined ? Boolean(allowLateSubmission) : true,
    campus: (campus || '').trim(),
    batch: (batch || '').trim(),
    projectType: projectType || 'vanilla',
    category: category || 'coding',
    createdBy: req.admin._id,
  });
  res.status(201).json(assignment);
});

const getAssignments = asyncHandler(async (req, res) => {
  const { campus, batch } = req.query;
  const query = { ...getAdminScope(req, 'createdBy') };
  if (campus) query.campus = campus;
  if (batch) query.batch = batch;

  const assignments = await Assignment.find(query).sort({ createdAt: -1 }).lean();

  if (assignments.length === 0) return res.json([]);

  const ids = assignments.map((a) => a._id);
  const subCounts = await Submission.aggregate([
    { $match: { assignmentId: { $in: ids } } },
    { $group: { _id: '$assignmentId', count: { $sum: 1 } } },
  ]);
  const countMap = new Map(subCounts.map((c) => [c._id.toString(), c.count]));

  res.json(
    assignments.map((a) => ({
      ...a,
      submissionCount: countMap.get(a._id.toString()) || 0,
    }))
  );
});

const updateAssignment = asyncHandler(async (req, res) => {
  const scope = getAdminScope(req, 'createdBy');
  const assignment = await Assignment.findOneAndUpdate(
    { _id: req.params.id, ...scope },
    req.body,
    { new: true, runValidators: true }
  );
  if (!assignment) {
    res.status(404);
    throw new Error('Assignment not found');
  }

  if (req.body.totalMarks !== undefined) {
    const newTotal = Number(req.body.totalMarks) || 100;
    await Submission.updateMany(
      { assignmentId: assignment._id },
      { $set: { maxMarks: newTotal } }
    );
  }

  res.json(assignment);
});

const deleteAssignment = asyncHandler(async (req, res) => {
  const scope = getAdminScope(req, 'createdBy');
  const assignment = await Assignment.findOne({ _id: req.params.id, ...scope });
  if (!assignment) {
    res.status(404);
    throw new Error('Assignment not found');
  }

  const submissions = await Submission.find({ assignmentId: assignment._id }).lean();

  for (const sub of submissions) {
    if (sub.filePublicId) {
      try {
        await cloudinary.uploader.destroy(sub.filePublicId, { resource_type: 'raw' });
      } catch (err) {
        console.error(`Failed to delete Cloudinary asset ${sub.filePublicId}`, err);
      }
    }
  }

  await Submission.deleteMany({ assignmentId: assignment._id });
  await assignment.deleteOne();

  res.json({ message: 'Assignment and related submissions deleted' });
});

const getSubmissionsForAssignment = asyncHandler(async (req, res) => {
  const { campus, batch } = req.query;
  const scope = getAdminScope(req, 'createdBy');
  const assignment = await Assignment.findOne({ _id: req.params.id, ...scope }).lean();
  if (!assignment) {
    res.status(404);
    throw new Error('Assignment not found');
  }

  const query = { assignmentId: req.params.id };
  if (campus) query.campus = campus;
  if (batch) query.batch = batch;

  const submissions = await Submission.find(query).sort({ submittedAt: -1 }).lean();
  const assignmentTotal = Number(assignment.totalMarks) || 100;
  const synced = submissions.map((s) => ({
    ...s,
    maxMarks: assignmentTotal,
    assignmentTotalMarks: assignmentTotal,
  }));
  res.json(synced);
});

const gradeSubmission = asyncHandler(async (req, res) => {
  const { submissionId } = req.params;
  const { marksObtained, maxMarks, feedback, remarks } = req.body;

  const submission = await Submission.findById(submissionId);
  if (!submission) {
    res.status(404);
    throw new Error('Submission not found');
  }

  const scope = getAdminScope(req, 'createdBy');
  const assignment = await Assignment.findOne({ _id: submission.assignmentId, ...scope }).lean();
  if (!assignment) {
    res.status(403);
    throw new Error('Not authorized to grade this submission');
  }

  const assignmentTotal = Number(assignment.totalMarks) || 100;

  submission.marksObtained = marksObtained !== '' && marksObtained !== null && marksObtained !== undefined
    ? Number(marksObtained)
    : null;

  if (maxMarks !== undefined && Number(maxMarks) > 0) {
    submission.maxMarks = Number(maxMarks);
  } else {
    submission.maxMarks = assignmentTotal;
  }

  const commentText = feedback !== undefined ? String(feedback).trim() : remarks !== undefined ? String(remarks).trim() : null;
  if (commentText !== null) {
    submission.feedback = commentText;
    submission.remarks = commentText;
  }

  const isGraded = submission.marksObtained !== null;
  submission.status = isGraded ? 'graded' : submission.isLate ? 'late' : 'submitted';
  submission.gradedAt = isGraded ? new Date() : null;

  const updated = await submission.save();
  const resObj = updated.toObject();
  resObj.assignmentTotalMarks = assignmentTotal;
  res.json(resObj);
});

// --- Student Controllers ---

const getAssignmentsForStudent = asyncHandler(async (req, res) => {
  const { studentId } = req.params;
  const student = req.student?.studentId === studentId
    ? req.student
    : await Student.findOne({ studentId }).select('-passwordHash').lean();

  if (!student) {
    res.status(404);
    throw new Error('Student not found');
  }

  const [assignments, mySubmissions] = await Promise.all([
    Assignment.find({
      createdBy: student.addedBy,
      $and: [
        { $or: [{ campus: '' }, { campus: student.campus }] },
        { $or: [{ batch: '' }, { batch: student.batch }] },
      ],
    })
      .sort({ dueDate: 1, createdAt: -1 })
      .lean(),
    Submission.find({ studentId: student.studentId }).lean(),
  ]);

  const subMap = new Map(mySubmissions.map((s) => [s.assignmentId.toString(), s]));

  const enriched = assignments.map((a) => {
    const sub = subMap.get(a._id.toString()) || null;
    const total = Number(a.totalMarks) || 100;
    if (sub) {
      sub.maxMarks = total;
    }
    return {
      ...a,
      totalMarks: total,
      mySubmission: sub,
    };
  });

  res.json(enriched);
});

const normalizeExternalUrl = (raw) => {
  if (!raw || typeof raw !== 'string') return '';
  let trimmed = raw.trim().replace(/^['"]+|['"]+$/g, '');
  if (!trimmed) return '';
  // Block dangerous URI schemes
  if (/^(javascript|data|vbscript):/i.test(trimmed)) return '';
  if (!/^https?:\/\//i.test(trimmed)) {
    if (/^(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/i.test(trimmed)) {
      trimmed = `http://${trimmed}`;
    } else {
      trimmed = `https://${trimmed}`;
    }
  }
  return trimmed;
};

const submitAssignment = asyncHandler(async (req, res) => {
  const { id: assignmentId, studentId } = req.params;
  const {
    driveLink,
    liveUrl,
    githubUrl,
    assignmentTitle,
    assignmentDetails,
  } = req.body || {};

  const assignment = await Assignment.findById(assignmentId).lean();
  if (!assignment) {
    res.status(404);
    throw new Error('Assignment not found');
  }

  const cleanDrive = normalizeExternalUrl(driveLink);
  const cleanLive = normalizeExternalUrl(liveUrl);
  const cleanGithub = normalizeExternalUrl(githubUrl);

  let submission = await Submission.findOne({ assignmentId, studentId });
  if (submission && submission.status === 'graded') {
    res.status(400);
    throw new Error('This assignment has already been graded and cannot be resubmitted.');
  }

  const hasExistingFile = Boolean(submission?.fileUrl);
  if (!req.file && !hasExistingFile && !cleanDrive && !cleanLive && !cleanGithub) {
    res.status(400);
    throw new Error('Please provide a valid live deployment link, GitHub link, Drive link, or upload a file.');
  }

  const isLate = new Date() > new Date(assignment.dueDate);
  if (isLate && assignment.allowLateSubmission === false) {
    res.status(400);
    throw new Error('The due date for this assignment has passed and late submissions are disabled.');
  }

  const student = await Student.findOne({ studentId }).select('-passwordHash').lean();
  if (!student) {
    res.status(404);
    throw new Error('Student not found');
  }

  const assignmentTotal = Number(assignment.totalMarks) || 100;

  let fileUrl = submission?.fileUrl || null;
  let filePublicId = submission?.filePublicId || null;
  let originalFileName = submission?.originalFileName || null;
  let fileSizeBytes = submission?.fileSizeBytes || null;

  if (req.file) {
    const folder = `quiz-portal/assignments/${student.campus || 'General'}/${student.batch || 'General'}`;
    const uploadResult = await uploadToCloudinary(req.file.buffer, folder, req.file.originalname);
    fileUrl = uploadResult.secure_url;
    filePublicId = uploadResult.public_id;
    originalFileName = req.file.originalname;
    fileSizeBytes = req.file.size;
  }

  const nextLive = liveUrl !== undefined ? cleanLive : submission?.liveUrl || '';
  const nextGithub = githubUrl !== undefined ? cleanGithub : submission?.githubUrl || '';
  const nextDrive =
    driveLink !== undefined
      ? cleanDrive
      : cleanLive && !submission?.driveLink
      ? cleanLive
      : submission?.driveLink || '';

  const subType =
    assignment.projectType === 'document'
      ? 'document'
      : nextLive
      ? 'deployed'
      : req.file || fileUrl
      ? 'file'
      : 'link';

  if (submission) {
    submission.studentName = student.fullName;
    submission.campus = student.campus;
    submission.batch = student.batch;
    submission.submissionType = subType;
    submission.fileUrl = fileUrl;
    submission.filePublicId = filePublicId;
    submission.originalFileName = originalFileName;
    submission.fileSizeBytes = fileSizeBytes;
    submission.liveUrl = nextLive;
    submission.githubUrl = nextGithub;
    submission.driveLink = nextDrive;
    if (assignmentTitle !== undefined) submission.assignmentTitle = String(assignmentTitle).trim();
    if (assignmentDetails !== undefined) submission.assignmentDetails = String(assignmentDetails).trim();
    submission.isLate = isLate;
    submission.status = isLate ? 'late' : 'submitted';
    submission.maxMarks = assignmentTotal;
    submission.submittedAt = Date.now();
    await submission.save();
    const resObj = submission.toObject();
    resObj.assignmentTotalMarks = assignmentTotal;
    return res.status(200).json(resObj);
  }

  submission = await Submission.create({
    assignmentId,
    studentId,
    studentName: student.fullName,
    campus: student.campus,
    batch: student.batch,
    submissionType: subType,
    fileUrl,
    filePublicId,
    originalFileName,
    fileSizeBytes,
    liveUrl: nextLive,
    githubUrl: nextGithub,
    driveLink: nextDrive,
    assignmentTitle: (assignmentTitle || '').trim(),
    assignmentDetails: (assignmentDetails || '').trim(),
    isLate,
    status: isLate ? 'late' : 'submitted',
    maxMarks: assignmentTotal,
    submittedAt: Date.now(),
  });

  const resObj = submission.toObject();
  resObj.assignmentTotalMarks = assignmentTotal;
  res.status(200).json(resObj);
});

const getMySubmissionStatus = asyncHandler(async (req, res) => {
  const { id: assignmentId, studentId } = req.params;
  const submission = await Submission.findOne({ assignmentId, studentId }).lean();
  if (submission) {
    res.json({ exists: true, submission });
  } else {
    res.json({ exists: false });
  }
});

const submitIdeAssignment = asyncHandler(async (req, res) => {
  const { id: assignmentId, studentId } = req.params;
  const { projectData } = req.body;

  if (!projectData) {
    res.status(400);
    throw new Error('Project data is required for IDE submission');
  }

  const assignment = await Assignment.findById(assignmentId).lean();
  if (!assignment) {
    res.status(404);
    throw new Error('Assignment not found');
  }

  const isLate = new Date() > new Date(assignment.dueDate);
  if (isLate && assignment.allowLateSubmission === false) {
    res.status(400);
    throw new Error('The due date for this assignment has passed and late submissions are disabled.');
  }

  const student = await Student.findOne({ studentId }).select('-passwordHash').lean();
  if (!student) {
    res.status(404);
    throw new Error('Student not found');
  }

  const assignmentTotal = Number(assignment.totalMarks) || 100;

  let submission = await Submission.findOne({ assignmentId, studentId });
  if (submission) {
    if (submission.status === 'graded') {
      res.status(400);
      throw new Error('This assignment has already been graded and cannot be resubmitted.');
    }
    submission.studentName = student.fullName;
    submission.campus = student.campus;
    submission.batch = student.batch;
    submission.submissionType = 'ide';
    submission.projectData = projectData;
    submission.isLate = isLate;
    submission.status = isLate ? 'late' : 'submitted';
    submission.maxMarks = assignmentTotal;
    submission.submittedAt = Date.now();
    await submission.save();
    const resObj = submission.toObject();
    resObj.assignmentTotalMarks = assignmentTotal;
    return res.status(200).json(resObj);
  }

  submission = await Submission.create({
    assignmentId,
    studentId,
    studentName: student.fullName,
    campus: student.campus,
    batch: student.batch,
    submissionType: 'ide',
    projectData,
    isLate,
    status: isLate ? 'late' : 'submitted',
    maxMarks: assignmentTotal,
    submittedAt: Date.now(),
    fileUrl: null,
    filePublicId: null,
    originalFileName: null,
    fileSizeBytes: null,
  });

  const resObj = submission.toObject();
  resObj.assignmentTotalMarks = assignmentTotal;
  res.status(200).json(resObj);
});

const uploadIdeImage = asyncHandler(async (req, res) => {
  if (!req.file) {
    res.status(400);
    throw new Error('No image uploaded');
  }

  const folder = `quiz-portal/ide_images`;

  const uploadPromise = new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'auto' },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    const readableStream = new Readable();
    readableStream.push(req.file.buffer);
    readableStream.push(null);
    readableStream.pipe(stream);
  });

  try {
    const result = await uploadPromise;
    res.status(200).json({ url: result.secure_url });
  } catch (error) {
    res.status(500).json({
      message: `Failed to upload image to Cloudinary: ${error.message || error}`,
    });
  }
});

const deleteSubmission = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const submission = await Submission.findById(id);
  if (!submission) {
    res.status(404);
    throw new Error('Assignment submission not found');
  }

  // Extra Security Check: Ensure admin is authorized (superadmin or creator of this assignment)
  const assignment = await Assignment.findById(submission.assignmentId);
  if (assignment && req.admin.role !== 'superadmin') {
    if (assignment.createdBy && assignment.createdBy.toString() !== req.admin._id.toString()) {
      res.status(403);
      throw new Error('Not authorized to delete submissions for assignments created by another admin');
    }
  }

  // If there's an uploaded file in Cloudinary, clean it up
  if (submission.filePublicId) {
    try {
      await cloudinary.uploader.destroy(submission.filePublicId, { resource_type: 'raw' });
    } catch (cErr) {
      console.warn('Cloudinary cleanup warning on deleteSubmission:', cErr?.message || cErr);
    }
  }

  // Permanently delete the submission document from database
  await Submission.deleteOne({ _id: submission._id });

  res.json({
    message: 'Assignment submission permanently deleted from database. Student can now re-submit.',
  });
});

module.exports = {
  createAssignment,
  getAssignments,
  updateAssignment,
  deleteAssignment,
  getSubmissionsForAssignment,
  gradeSubmission,
  getAssignmentsForStudent,
  submitAssignment,
  submitIdeAssignment,
  uploadIdeImage,
  getMySubmissionStatus,
  deleteSubmission,
};
