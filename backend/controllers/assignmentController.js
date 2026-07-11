const asyncHandler = require('express-async-handler');
const Assignment = require('../models/Assignment');
const Submission = require('../models/Submission');
const Student = require('../models/Student');
const cloudinary = require('../config/cloudinary');
const { Readable } = require('stream');

// --- Helper for Cloudinary Buffer Upload ---
const uploadToCloudinary = (buffer, folder, originalFilename) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { 
        resource_type: 'raw', 
        folder,
        public_id: originalFilename, // Cloudinary will sanitize this
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
  const { title, description, dueDate, campus, batch, projectType } = req.body;
  const assignment = await Assignment.create({
    title,
    description,
    dueDate,
    campus: campus || '',
    batch: batch || '',
    projectType: projectType || 'vanilla',
    createdBy: req.admin._id,
  });
  res.status(201).json(assignment);
});

const getAssignments = asyncHandler(async (req, res) => {
  const { campus, batch } = req.query;
  let query = {};
  if (campus) query.campus = campus;
  if (batch) query.batch = batch;

  const assignments = await Assignment.find(query).sort({ createdAt: -1 });
  res.json(assignments);
});

const updateAssignment = asyncHandler(async (req, res) => {
  const assignment = await Assignment.findByIdAndUpdate(
    req.params.id,
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
  const assignment = await Assignment.findById(req.params.id);
  if (!assignment) {
    res.status(404);
    throw new Error('Assignment not found');
  }

  // Find all submissions
  const submissions = await Submission.find({ assignmentId: assignment._id });
  
  // Delete all Cloudinary assets
  for (const sub of submissions) {
    try {
      await cloudinary.uploader.destroy(sub.filePublicId, { resource_type: 'raw' });
    } catch (err) {
      console.error(`Failed to delete Cloudinary asset ${sub.filePublicId}`, err);
    }
  }

  // Delete all submissions from DB
  await Submission.deleteMany({ assignmentId: assignment._id });

  // Delete assignment
  await assignment.deleteOne();

  res.json({ message: 'Assignment and related submissions deleted' });
});

const getSubmissionsForAssignment = asyncHandler(async (req, res) => {
  const { campus, batch } = req.query;
  let query = { assignmentId: req.params.id };
  if (campus) query.campus = campus;
  if (batch) query.batch = batch;

  const submissions = await Submission.find(query).sort({ submittedAt: -1 });
  res.json(submissions);
});

// --- Student Controllers ---

const getAssignmentsForStudent = asyncHandler(async (req, res) => {
  const { studentId } = req.params;
  const student = await Student.findOne({ studentId });
  
  if (!student) {
    res.status(404);
    throw new Error('Student not found');
  }

  const assignments = await Assignment.find({
    $and: [
      { $or: [{ campus: '' }, { campus: student.campus }] },
      { $or: [{ batch: '' }, { batch: student.batch }] }
    ]
  }).sort({ createdAt: -1 });

  res.json(assignments);
});

const submitAssignment = asyncHandler(async (req, res) => {
  const { id: assignmentId, studentId } = req.params;
  
  if (!req.file) {
    res.status(400);
    throw new Error('No file uploaded or invalid file type');
  }

  const assignment = await Assignment.findById(assignmentId);
  if (!assignment) {
    res.status(404);
    throw new Error('Assignment not found');
  }

  const isLate = new Date() > new Date(assignment.dueDate);
  if (isLate) {
    res.status(400);
    throw new Error('The due date for this assignment has passed. Submission is no longer allowed.');
  }

  const student = await Student.findOne({ studentId });
  if (!student) {
    res.status(404);
    throw new Error('Student not found');
  }

  // Check existing submission
  let submission = await Submission.findOne({ assignmentId, studentId });

  // If exists, throw error to prevent resubmission
  if (submission) {
    res.status(400);
    throw new Error('You have already submitted this assignment. Resubmission is not allowed.');
  }

  // Upload to Cloudinary
  const folder = `quiz-portal/assignments/${student.campus || 'General'}/${student.batch || 'General'}`;
  const uploadResult = await uploadToCloudinary(req.file.buffer, folder, req.file.originalname);

  const submissionData = {
    assignmentId,
    studentId,
    studentName: student.fullName,
    campus: student.campus,
    batch: student.batch,
    fileUrl: uploadResult.secure_url,
    filePublicId: uploadResult.public_id,
    originalFileName: req.file.originalname,
    fileSizeBytes: req.file.size,
    isLate,
    submittedAt: Date.now(),
  };

  submission = await Submission.create(submissionData);

  res.status(200).json(submission);
});

const getMySubmissionStatus = asyncHandler(async (req, res) => {
  const { id: assignmentId, studentId } = req.params;
  
  const submission = await Submission.findOne({ assignmentId, studentId });
  
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

  const assignment = await Assignment.findById(assignmentId);
  if (!assignment) {
    res.status(404);
    throw new Error('Assignment not found');
  }

  const isLate = new Date() > new Date(assignment.dueDate);
  if (isLate) {
    res.status(400);
    throw new Error('The due date for this assignment has passed. Submission is no longer allowed.');
  }

  const student = await Student.findOne({ studentId });
  if (!student) {
    res.status(404);
    throw new Error('Student not found');
  }

  // Check existing submission
  let submission = await Submission.findOne({ assignmentId, studentId });

  // If exists, throw error to prevent resubmission
  if (submission) {
    res.status(400);
    throw new Error('You have already submitted this assignment. Resubmission is not allowed.');
  }

  const submissionData = {
    assignmentId,
    studentId,
    studentName: student.fullName,
    campus: student.campus,
    batch: student.batch,
    submissionType: 'ide',
    projectData,
    isLate,
    submittedAt: Date.now(),
    // Clear out file fields if overriding a previous file submission (redundant now but safe)
    fileUrl: null,
    filePublicId: null,
    originalFileName: null,
    fileSizeBytes: null,
  };

  submission = await Submission.create(submissionData);

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
    res.status(500);
    throw new Error('Failed to upload image to Cloudinary');
  }
});

module.exports = {
  createAssignment,
  getAssignments,
  updateAssignment,
  deleteAssignment,
  getSubmissionsForAssignment,
  getAssignmentsForStudent,
  submitAssignment,
  submitIdeAssignment,
  uploadIdeImage,
  getMySubmissionStatus,
};
