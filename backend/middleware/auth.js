const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const Student = require('../models/Student');
const asyncHandler = require('express-async-handler');

const protectAdmin = asyncHandler(async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.admin = await Admin.findById(decoded.id).select('-password').lean();
      
      if (!req.admin) {
        res.status(401);
        throw new Error('Not authorized, admin not found');
      }
      
      return next();
    } catch (error) {
      res.status(401);
      throw new Error('Not authorized, token failed');
    }
  }

  if (!token) {
    res.status(401);
    throw new Error('Not authorized, no token');
  }
});

const protectStudent = asyncHandler(async (req, res, next) => {
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      const token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (decoded.role === 'student' && decoded.id) {
        const student = await Student.findById(decoded.id).select('-passwordHash').lean();
        if (!student) {
          res.status(401);
          throw new Error('Not authorized, student not found');
        }
        if (student.isActive === false) {
          res.status(403);
          throw new Error('Your student account has been deactivated.');
        }
        req.student = student;
        return next();
      }
    } catch (error) {
      if (error.message === 'Your student account has been deactivated.') {
        throw error;
      }
      res.status(401);
      throw new Error('Not authorized, invalid student token');
    }
  }

  // Fallback for legacy endpoints using studentId param or body
  const fallbackStudentId = req.params?.studentId || req.body?.studentId;
  if (fallbackStudentId) {
    const student = await Student.findOne({ studentId: fallbackStudentId }).select('-passwordHash').lean();
    if (!student) {
      res.status(404);
      throw new Error('Student not found');
    }
    if (student.isActive === false) {
      res.status(403);
      throw new Error('Your student account has been deactivated.');
    }
    req.student = student;
    return next();
  }

  res.status(401);
  throw new Error('Not authorized, student authentication required');
});

/**
 * Helper to scope queries by admin.
 * Regular admins only ever access their own documents.
 * Super admins can optionally filter by ?adminId=... or view their own by default.
 */
const getAdminScope = (req, fieldName = 'addedBy') => {
  if (req.admin?.role === 'superadmin') {
    if (req.query?.adminId === 'all') return {};
    if (req.query?.adminId) return { [fieldName]: req.query.adminId };
  }
  return { [fieldName]: req.admin._id };
};

module.exports = { protectAdmin, protectStudent, getAdminScope };
