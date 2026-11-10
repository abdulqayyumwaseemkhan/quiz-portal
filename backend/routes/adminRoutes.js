const express = require('express');
const router = express.Router();
const {
  loginAdmin,
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
} = require('../controllers/adminController');
const { getAllResults } = require('../controllers/quizController');
const { protectAdmin } = require('../middleware/auth');

router.post('/login', loginAdmin);
// router.post('/register', protectAdmin, registerAdmin); // Blocked as per requirement

// Student routes (Admin scoped)
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

// Campus & Batch routes
router.post('/campuses', protectAdmin, addCampus);
router.get('/campuses', protectAdmin, getCampuses);
router.put('/campuses/:id', protectAdmin, updateCampus);
router.delete('/campuses/:id', protectAdmin, deleteCampus);

module.exports = router;
