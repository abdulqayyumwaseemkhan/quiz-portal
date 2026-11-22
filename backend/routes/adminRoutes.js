const express = require('express');
const router = express.Router();
const {
  loginAdmin,
  verifyAdmin2FA,
  get2FAStatus,
  setupTotp,
  enableTotp,
  disableTotp,
  getSecurityKeyChallenge,
  registerSecurityKey,
  removeSecurityKey,
  registerAdmin,
  addStudent,
  bulkAddStudents,
  getStudents,
  updateStudent,
  resetStudentPassword,
  bulkRegeneratePasswords,
  sendCredentialsChunk,
  getStudentMeta,
  deleteStudent,
  addCampus,
  updateCampus,
  getCampuses,
  deleteCampus,
  getMasterStudentReport,
  getTeachers,
  addTeacher,
  updateTeacher,
  deleteTeacher,
} = require('../controllers/adminController');
const { getAllResults } = require('../controllers/quizController');
const { protectAdmin } = require('../middleware/auth');

router.post('/login', loginAdmin);
router.post('/login/verify-2fa', verifyAdmin2FA);

// Admin 2FA Management (Google Authenticator & Windows Security Key)
router.get('/2fa/status', protectAdmin, get2FAStatus);
router.post('/2fa/totp/setup', protectAdmin, setupTotp);
router.post('/2fa/totp/enable', protectAdmin, enableTotp);
router.post('/2fa/totp/disable', protectAdmin, disableTotp);
router.post('/2fa/security-key/challenge', protectAdmin, getSecurityKeyChallenge);
router.post('/2fa/security-key/register', protectAdmin, registerSecurityKey);
router.delete('/2fa/security-key/:keyId', protectAdmin, removeSecurityKey);

// Student routes (Admin scoped)
router.get('/reports/master-students', protectAdmin, getMasterStudentReport);
router.post('/students', protectAdmin, addStudent);
router.post('/students/bulk', protectAdmin, bulkAddStudents);
router.post('/students/bulk-regenerate-passwords', protectAdmin, bulkRegeneratePasswords);
router.post('/students/send-credentials', protectAdmin, sendCredentialsChunk);
router.get('/students', protectAdmin, getStudents);
router.get('/students/meta', protectAdmin, getStudentMeta);
router.put('/students/:id', protectAdmin, updateStudent);
router.post('/students/:id/reset-password', protectAdmin, resetStudentPassword);
router.delete('/students/:id', protectAdmin, deleteStudent);

// Results route
router.get('/results', protectAdmin, getAllResults);

// Teacher / Admin Management (Super Admin only)
router.get('/teachers', protectAdmin, getTeachers);
router.post('/teachers', protectAdmin, addTeacher);
router.put('/teachers/:id', protectAdmin, updateTeacher);
router.delete('/teachers/:id', protectAdmin, deleteTeacher);

// Campus & Batch routes
router.post('/campuses', protectAdmin, addCampus);
router.get('/campuses', protectAdmin, getCampuses);
router.put('/campuses/:id', protectAdmin, updateCampus);
router.delete('/campuses/:id', protectAdmin, deleteCampus);

module.exports = router;
