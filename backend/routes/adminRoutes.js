const express = require('express');
const router = express.Router();
const { loginAdmin, registerAdmin, addStudent, getStudents, getStudentMeta, deleteStudent } = require('../controllers/adminController');
const { getAllResults } = require('../controllers/quizController');
const { protectAdmin } = require('../middleware/auth');

router.post('/login', loginAdmin);
// router.post('/register', protectAdmin, registerAdmin); // Blocked as per requirement
router.post('/students', protectAdmin, addStudent);
router.get('/students', protectAdmin, getStudents);
router.get('/students/meta', protectAdmin, getStudentMeta);
router.delete('/students/:id', protectAdmin, deleteStudent);
router.get('/results', protectAdmin, getAllResults);

module.exports = router;
