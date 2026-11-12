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
  res.json(submissions);
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

  submission.marksObtained = marksObtained !== '' && marksObtained !== null && marksObtained !== undefined
    ? Number(marksObtained)
    : null;

  if (maxMarks !== undefined) {
    submission.maxMarks = Number(maxMarks) || assignment.totalMarks || 100;
  } else if (!submission.maxMarks) {
    submission.maxMarks = assignment.totalMarks || 100;
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
  res.json(updated);
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

  const enriched = assignments.map((a) => ({
    ...a,
    mySubmission: subMap.get(a._id.toString()) || null,
  }));

  res.json(enriched);
});

const submitAssignment = asyncHandler(async (req, res) => {
  const { id: assignmentId, studentId } = req.params;
  const { driveLink, liveUrl, githubUrl, assignmentTitle, assignmentDetails } = req.body;

  const assignment = await Assignment.findById(assignmentId).lean();
  if (!assignment) {
    res.status(404);
    throw new Error('Assignment not found');
  }

  const cleanDrive = (driveLink || '').trim();
  const cleanLive = (liveUrl || '').trim();
  const cleanGithub = (githubUrl || '').trim();

  if (!req.file && !cleanDrive && !cleanLive && !cleanGithub) {
    res.status(400);
    throw new Error('Please upload a file or provide a live deployment link / GitHub link.');
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

  const existing = await Submission.findOne({ assignmentId, studentId }).lean();
  if (existing) {
    res.status(400);
    throw new Error('You have already submitted this assignment.');
  }

  let fileUrl = null;
  let filePublicId = null;
  let originalFileName = null;
  let fileSizeBytes = null;

  if (req.file) {
    const folder = `quiz-portal/assignments/${student.campus || 'General'}/${student.batch || 'General'}`;
    const uploadResult = await uploadToCloudinary(req.file.buffer, folder, req.file.originalname);
    fileUrl = uploadResult.secure_url;
    filePublicId = uploadResult.public_id;
    originalFileName = req.file.originalname;
    fileSizeBytes = req.file.size;
  }

  const subType =
    assignment.projectType === 'document'
      ? 'document'
      : cleanLive
      ? 'deployed'
      : req.file
      ? 'file'
      : 'link';

  const submission = await Submission.create({
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
    liveUrl: cleanLive,
    githubUrl: cleanGithub,
    driveLink: cleanDrive || cleanLive,
    assignmentTitle: (assignmentTitle || '').trim(),
    assignmentDetails: (assignmentDetails || '').trim(),
    isLate,
    status: isLate ? 'late' : 'submitted',
    maxMarks: assignment.totalMarks || 100,
    submittedAt: Date.now(),
  });

  res.status(200).json(submission);
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

  const existing = await Submission.findOne({ assignmentId, studentId }).lean();
  if (existing) {
    res.status(400);
    throw new Error('You have already submitted this assignment.');
  }

  const submission = await Submission.create({
    assignmentId,
    studentId,
    studentName: student.fullName,
    campus: student.campus,
    batch: student.batch,
    submissionType: 'ide',
    projectData,
    isLate,
    status: isLate ? 'late' : 'submitted',
    maxMarks: assignment.totalMarks || 100,
    submittedAt: Date.now(),
    fileUrl: null,
    filePublicId: null,
    originalFileName: null,
    fileSizeBytes: null,
  });

  res.status(200).json(submission);
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
};
