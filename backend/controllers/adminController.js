const asyncHandler = require('express-async-handler');
const Admin = require('../models/Admin');
const Student = require('../models/Student');
const Campus = require('../models/Campus');
const jwt = require('jsonwebtoken');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

// @desc    Auth admin & get token
// @route   POST /api/admin/login
const loginAdmin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const admin = await Admin.findOne({ email });

  if (admin && (await admin.comparePassword(password))) {
    res.json({
      _id: admin._id,
      email: admin.email,
      role: admin.role,
      token: generateToken(admin._id),
    });
  } else {
    res.status(401);
    throw new Error('Invalid email or password');
  }
});

// @desc    Register a new admin
// @route   POST /api/admin/register
const registerAdmin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const adminExists = await Admin.findOne({ email });

  if (adminExists) {
    res.status(400);
    throw new Error('Admin already exists');
  }

  const admin = await Admin.create({ email, password });

  if (admin) {
    res.status(201).json({
      _id: admin._id,
      email: admin.email,
      token: generateToken(admin._id),
    });
  } else {
    res.status(400);
    throw new Error('Invalid admin data');
  }
});

// --- Student Management (Admin) ---

const addStudent = asyncHandler(async (req, res) => {
  const { studentId, fullName, campus, batch } = req.body;
  
  const studentExists = await Student.findOne({ studentId, addedBy: req.admin?._id });
  if (studentExists) {
    res.status(400);
    throw new Error('Student ID already exists in your account');
  }
  
  const student = await Student.create({ 
    studentId, 
    fullName,
    campus,
    batch,
    addedBy: req.admin?._id 
  });
  
  res.status(201).json(student);
});

const getStudents = asyncHandler(async (req, res) => {
  const { campus, batch } = req.query;
  let query = { addedBy: req.admin._id };
  if (campus) query.campus = campus;
  if (batch) query.batch = batch;
  
  const students = await Student.find(query).sort({ createdAt: -1 });
  res.json(students);
});

const getStudentMeta = asyncHandler(async (req, res) => {
  let campusQuery = { addedBy: req.admin._id };
  let studentQuery = { addedBy: req.admin._id };

  const explicitCampuses = await Campus.find(campusQuery).distinct('name');
  const studentCampuses = await Student.find(studentQuery).distinct('campus');
  const allCampuses = [...new Set([...explicitCampuses, ...studentCampuses])].filter(Boolean);

  const batches = await Student.find(studentQuery).distinct('batch');

  res.json({ 
    campuses: allCampuses, 
    batches
  });
});

const addCampus = asyncHandler(async (req, res) => {
  const { name } = req.body;
  const exists = await Campus.findOne({ name, addedBy: req.admin?._id });
  if (exists) {
    res.status(400);
    throw new Error('Campus already exists in your account');
  }
  const campus = await Campus.create({ name, addedBy: req.admin?._id });
  res.status(201).json(campus);
});

const getCampuses = asyncHandler(async (req, res) => {
  let query = { addedBy: req.admin._id };
  const campuses = await Campus.find(query).sort({ name: 1 });
  res.json(campuses);
});

const deleteCampus = asyncHandler(async (req, res) => {
  const campus = await Campus.findById(req.params.id);
  if (campus) {
    await Campus.deleteOne({ _id: campus._id });
    res.json({ message: 'Campus removed' });
  } else {
    res.status(404);
    throw new Error('Campus not found');
  }
});

const deleteStudent = asyncHandler(async (req, res) => {
  const student = await Student.findById(req.params.id);
  if (student) {
    await Student.deleteOne({ _id: student._id });
    res.json({ message: 'Student removed' });
  } else {
    res.status(404);
    throw new Error('Student not found');
  }
});

module.exports = { 
  loginAdmin, 
  registerAdmin, 
  addStudent, 
  getStudents,
  getStudentMeta,
  deleteStudent,
  addCampus,
  getCampuses,
  deleteCampus
};
