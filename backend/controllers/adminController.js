const asyncHandler = require('express-async-handler');
const Admin = require('../models/Admin');
const Student = require('../models/Student');
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
  const { studentId, fullName } = req.body;
  
  const studentExists = await Student.findOne({ studentId });
  if (studentExists) {
    res.status(400);
    throw new Error('Student ID already exists');
  }
  
  const student = await Student.create({ 
    studentId, 
    fullName, 
    addedBy: req.admin?._id 
  });
  
  res.status(201).json(student);
});

const getStudents = asyncHandler(async (req, res) => {
  const students = await Student.find({}).sort({ createdAt: -1 });
  res.json(students);
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
  deleteStudent 
};
