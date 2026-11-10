const asyncHandler = require('express-async-handler');
const { z } = require('zod');
const Admin = require('../models/Admin');
const Student = require('../models/Student');
const Campus = require('../models/Campus');
const jwt = require('jsonwebtoken');
const { generateSecurePassword, hashPassword } = require('../utils/password');
const { sendStudentCredentialsEmail } = require('../utils/email');
const { getAdminScope } = require('../middleware/auth');

const generateToken = (id, role = 'admin') => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

const studentInputSchema = z.object({
  studentId: z.string().trim().min(1, 'Student ID is required'),
  fullName: z.string().trim().min(1, 'Full Name is required'),
  email: z.string().trim().email('Invalid email address').optional().or(z.literal('')),
  campus: z.string().trim().min(1, 'Campus is required'),
  batch: z.string().trim().min(1, 'Batch is required'),
  contact: z.string().trim().optional().or(z.literal('')),
});

// @desc    Auth admin & get token
// @route   POST /api/admin/login
const loginAdmin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400);
    throw new Error('Please provide email and password');
  }

  const admin = await Admin.findOne({ email: email.toLowerCase().trim() });

  if (admin && (await admin.comparePassword(password))) {
    res.json({
      _id: admin._id,
      email: admin.email,
      role: admin.role,
      token: generateToken(admin._id, admin.role),
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

  const adminExists = await Admin.findOne({ email: email?.toLowerCase()?.trim() });

  if (adminExists) {
    res.status(400);
    throw new Error('Admin already exists');
  }

  const admin = await Admin.create({ email: email?.toLowerCase()?.trim(), password });

  if (admin) {
    res.status(201).json({
      _id: admin._id,
      email: admin.email,
      role: admin.role,
      token: generateToken(admin._id, admin.role),
    });
  } else {
    res.status(400);
    throw new Error('Invalid admin data');
  }
});

// --- Student Management (Admin) ---

const addStudent = asyncHandler(async (req, res) => {
  const parsed = studentInputSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400);
    throw new Error(parsed.error.issues.map(i => i.message).join(', '));
  }

  const { studentId, fullName, email, campus, batch, contact } = parsed.data;

  const studentExists = await Student.findOne({ studentId, addedBy: req.admin._id }).lean();
  if (studentExists) {
    res.status(400);
    throw new Error('Student ID already exists in your account');
  }

  const generatedPassword = generateSecurePassword(9);
  const passwordHash = await hashPassword(generatedPassword);

  const student = await Student.create({
    studentId,
    fullName,
    email: email || '',
    contact: contact || '',
    campus,
    batch,
    passwordHash,
    mustChangePassword: true,
    isActive: true,
    emailStatus: 'pending',
    addedBy: req.admin._id,
  });

  const responseObj = student.toObject();
  delete responseObj.passwordHash;
  responseObj.generatedPassword = generatedPassword; // Shown once at creation

  res.status(201).json(responseObj);
});

const bulkAddStudents = asyncHandler(async (req, res) => {
  const { students } = req.body;
  if (!Array.isArray(students) || students.length === 0) {
    res.status(400);
    throw new Error('No students provided for bulk import');
  }

  if (students.length > 2000) {
    res.status(400);
    throw new Error('Maximum 2000 students allowed per import batch');
  }

  const adminId = req.admin._id;

  // Check existing studentIds for this admin
  const incomingIds = students.map(s => String(s.studentId || '').trim()).filter(Boolean);
  const existingStudents = await Student.find({
    addedBy: adminId,
    studentId: { $in: incomingIds },
  }).select('studentId').lean();

  const existingIdSet = new Set(existingStudents.map(s => s.studentId.toLowerCase()));
  const seenInBatch = new Set();

  const validDocs = [];
  const plainCredentials = [];
  const errors = [];

  // Prepare documents and hash passwords in parallel batches
  for (let idx = 0; idx < students.length; idx++) {
    const raw = students[idx];
    const parsed = studentInputSchema.safeParse({
      studentId: String(raw.studentId || '').trim(),
      fullName: String(raw.fullName || raw.name || '').trim(),
      email: String(raw.email || '').trim().toLowerCase(),
      campus: String(raw.campus || '').trim(),
      batch: String(raw.batch || '').trim(),
      contact: String(raw.contact || '').trim(),
    });

    if (!parsed.success) {
      errors.push({
        row: idx + 1,
        studentId: raw.studentId || '',
        message: parsed.error.issues.map(i => i.message).join('; '),
      });
      continue;
    }

    const data = parsed.data;
    const idLower = data.studentId.toLowerCase();

    if (existingIdSet.has(idLower)) {
      errors.push({
        row: idx + 1,
        studentId: data.studentId,
        message: 'Student ID already exists in database',
      });
      continue;
    }

    if (seenInBatch.has(idLower)) {
      errors.push({
        row: idx + 1,
        studentId: data.studentId,
        message: 'Duplicate Student ID within uploaded file',
      });
      continue;
    }

    seenInBatch.add(idLower);
    const generatedPassword = generateSecurePassword(9);
    validDocs.push({ data, generatedPassword });
  }

  if (validDocs.length === 0) {
    res.status(400);
    throw new Error(errors[0]?.message || 'No valid students to import');
  }

  // Hash passwords with concurrency control
  const docsToInsert = await Promise.all(
    validDocs.map(async ({ data, generatedPassword }) => {
      const passwordHash = await hashPassword(generatedPassword);
      plainCredentials.push({
        studentId: data.studentId,
        fullName: data.fullName,
        email: data.email || '',
        campus: data.campus,
        batch: data.batch,
        contact: data.contact || '',
        generatedPassword,
      });
      return {
        studentId: data.studentId,
        fullName: data.fullName,
        email: data.email || '',
        contact: data.contact || '',
        campus: data.campus,
        batch: data.batch,
        passwordHash,
        mustChangePassword: true,
        isActive: true,
        emailStatus: 'pending',
        addedBy: adminId,
        createdAt: new Date(),
      };
    })
  );

  let insertedDocs = [];
  try {
    insertedDocs = await Student.insertMany(docsToInsert, { ordered: false });
  } catch (bulkErr) {
    // With ordered: false, partial insertions succeed and are in bulkErr.insertedDocs
    insertedDocs = bulkErr.insertedDocs || [];
    if (bulkErr.writeErrors) {
      bulkErr.writeErrors.forEach(we => {
        errors.push({
          studentId: we.err?.op?.studentId || '',
          message: we.err?.errmsg || 'Insert failed',
        });
      });
    }
  }

  // Map one-time generated passwords back onto inserted student records
  const credMap = new Map(plainCredentials.map(c => [c.studentId, c.generatedPassword]));
  const resultStudents = insertedDocs.map(doc => {
    const obj = doc.toObject ? doc.toObject() : { ...doc };
    delete obj.passwordHash;
    obj.generatedPassword = credMap.get(obj.studentId) || '';
    return obj;
  });

  res.status(201).json({
    insertedCount: resultStudents.length,
    errorCount: errors.length,
    students: resultStudents,
    errors,
  });
});

const getStudents = asyncHandler(async (req, res) => {
  const { campus, batch, emailStatus, isActive, search } = req.query;
  const query = { ...getAdminScope(req, 'addedBy') };

  if (campus) query.campus = campus;
  if (batch) query.batch = batch;
  if (emailStatus) query.emailStatus = emailStatus;
  if (isActive !== undefined && isActive !== '') {
    query.isActive = isActive === 'true';
  }
  if (search) {
    const regex = new RegExp(String(search).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    query.$or = [
      { fullName: regex },
      { studentId: regex },
      { email: regex },
    ];
  }

  const students = await Student.find(query)
    .select('-passwordHash')
    .sort({ createdAt: -1 })
    .lean();

  res.json(students);
});

const updateStudent = asyncHandler(async (req, res) => {
  const scope = getAdminScope(req, 'addedBy');
  const student = await Student.findOne({ _id: req.params.id, ...scope });

  if (!student) {
    res.status(404);
    throw new Error('Student not found');
  }

  const { studentId, fullName, email, campus, batch, contact, isActive } = req.body;

  if (studentId && studentId.trim() !== student.studentId) {
    const duplicate = await Student.findOne({
      studentId: studentId.trim(),
      addedBy: student.addedBy,
      _id: { $ne: student._id },
    }).lean();
    if (duplicate) {
      res.status(400);
      throw new Error('Another student with this Student ID already exists');
    }
    student.studentId = studentId.trim();
  }

  if (fullName !== undefined) student.fullName = fullName.trim();
  if (email !== undefined) student.email = email.trim().toLowerCase();
  if (campus !== undefined) student.campus = campus.trim();
  if (batch !== undefined) student.batch = batch.trim();
  if (contact !== undefined) student.contact = contact.trim();
  if (typeof isActive === 'boolean') student.isActive = isActive;

  const updated = await student.save();
  const obj = updated.toObject();
  delete obj.passwordHash;

  res.json(obj);
});

const resetStudentPassword = asyncHandler(async (req, res) => {
  const scope = getAdminScope(req, 'addedBy');
  const student = await Student.findOne({ _id: req.params.id, ...scope });

  if (!student) {
    res.status(404);
    throw new Error('Student not found');
  }

  const generatedPassword = generateSecurePassword(9);
  student.passwordHash = await hashPassword(generatedPassword);
  student.mustChangePassword = true;
  student.emailStatus = 'pending';
  await student.save();

  res.json({
    _id: student._id,
    studentId: student.studentId,
    fullName: student.fullName,
    email: student.email,
    generatedPassword, // Shown once
  });
});

const bulkRegeneratePasswords = asyncHandler(async (req, res) => {
  const { studentIds } = req.body; // array of Student _id or studentId
  if (!Array.isArray(studentIds) || studentIds.length === 0) {
    res.status(400);
    throw new Error('Please select at least one student');
  }

  const scope = getAdminScope(req, 'addedBy');
  const students = await Student.find({
    ...scope,
    $or: [
      { _id: { $in: studentIds.filter(id => /^[0-9a-fA-F]{24}$/.test(id)) } },
      { studentId: { $in: studentIds } },
    ],
  }).select('_id studentId fullName email campus batch').lean();

  if (students.length === 0) {
    res.status(404);
    throw new Error('No matching students found');
  }

  const credentials = [];
  const bulkOps = await Promise.all(
    students.map(async (st) => {
      const generatedPassword = generateSecurePassword(9);
      const passwordHash = await hashPassword(generatedPassword);
      credentials.push({
        _id: st._id,
        studentId: st.studentId,
        fullName: st.fullName,
        email: st.email || '',
        campus: st.campus,
        batch: st.batch,
        generatedPassword,
      });
      return {
        updateOne: {
          filter: { _id: st._id },
          update: {
            $set: {
              passwordHash,
              mustChangePassword: true,
              emailStatus: 'pending',
            },
          },
        },
      };
    })
  );

  await Student.bulkWrite(bulkOps, { ordered: false });

  res.json({
    updatedCount: credentials.length,
    credentials,
  });
});

const sendCredentialsChunk = asyncHandler(async (req, res) => {
  const { studentIds, credentialsMap = {}, loginUrl } = req.body;
  if (!Array.isArray(studentIds) || studentIds.length === 0) {
    res.status(400);
    throw new Error('No students selected for sending credentials');
  }

  // Enforce chunk size max 25 per serverless invocation
  const chunkIds = studentIds.slice(0, 25);
  const scope = getAdminScope(req, 'addedBy');

  const students = await Student.find({
    ...scope,
    $or: [
      { _id: { $in: chunkIds.filter(id => /^[0-9a-fA-F]{24}$/.test(id)) } },
      { studentId: { $in: chunkIds } },
    ],
  }).lean();

  const results = [];
  const bulkOps = [];
  let sentCount = 0;
  let failedCount = 0;

  for (const st of students) {
    if (!st.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(st.email)) {
      failedCount++;
      const emailError = 'Missing or invalid email address';
      bulkOps.push({
        updateOne: {
          filter: { _id: st._id },
          update: { $set: { emailStatus: 'failed', emailError } },
        },
      });
      results.push({
        _id: st._id,
        studentId: st.studentId,
        emailStatus: 'failed',
        emailError,
      });
      continue;
    }

    // Use in-memory password if just generated, otherwise generate a fresh password and hash it
    let plainPassword = credentialsMap[st.studentId] || credentialsMap[st._id?.toString()];
    let newPasswordHash = null;

    if (!plainPassword) {
      plainPassword = generateSecurePassword(9);
      newPasswordHash = await hashPassword(plainPassword);
    }

    try {
      await sendStudentCredentialsEmail({
        to: st.email,
        fullName: st.fullName,
        studentId: st.studentId,
        password: plainPassword,
        campus: st.campus,
        batch: st.batch,
        loginUrl,
      });

      sentCount++;
      const now = new Date();
      const updateFields = {
        emailStatus: 'sent',
        emailSentAt: now,
        emailError: '',
      };
      if (newPasswordHash) {
        updateFields.passwordHash = newPasswordHash;
        updateFields.mustChangePassword = true;
      }

      bulkOps.push({
        updateOne: {
          filter: { _id: st._id },
          update: { $set: updateFields },
        },
      });

      results.push({
        _id: st._id,
        studentId: st.studentId,
        emailStatus: 'sent',
        emailSentAt: now,
        emailError: '',
      });
    } catch (err) {
      failedCount++;
      const emailError = err.message || 'Email delivery failed';
      bulkOps.push({
        updateOne: {
          filter: { _id: st._id },
          update: { $set: { emailStatus: 'failed', emailError } },
        },
      });
      results.push({
        _id: st._id,
        studentId: st.studentId,
        emailStatus: 'failed',
        emailError,
      });
    }
  }

  if (bulkOps.length > 0) {
    await Student.bulkWrite(bulkOps, { ordered: false });
  }

  res.json({
    totalProcessed: results.length,
    sentCount,
    failedCount,
    results,
  });
});

const getStudentMeta = asyncHandler(async (req, res) => {
  const scope = getAdminScope(req, 'addedBy');

  const [campusDocs, studentCampuses, studentBatches, studentIds] = await Promise.all([
    Campus.find(scope).sort({ name: 1 }).lean(),
    Student.find(scope).distinct('campus'),
    Student.find(scope).distinct('batch'),
    Student.find(scope).distinct('studentId'),
  ]);

  const explicitCampuses = campusDocs.map(c => c.name);
  const explicitBatches = campusDocs.flatMap(c => c.batches || []);
  const allCampuses = [...new Set([...explicitCampuses, ...studentCampuses])].filter(Boolean).sort();
  const allBatches = [...new Set([...explicitBatches, ...studentBatches])].filter(Boolean).sort();

  let admins = [];
  if (req.admin.role === 'superadmin') {
    admins = await Admin.find({}).select('_id email role').lean();
  }

  res.json({
    campuses: allCampuses,
    batches: allBatches,
    campusDocs,
    existingStudentIds: studentIds,
    admins,
  });
});

const addCampus = asyncHandler(async (req, res) => {
  const { name, batches } = req.body;
  if (!name || !name.trim()) {
    res.status(400);
    throw new Error('Campus name is required');
  }
  const cleanName = name.trim();
  const exists = await Campus.findOne({ name: cleanName, addedBy: req.admin._id });
  if (exists) {
    res.status(400);
    throw new Error('Campus already exists in your account');
  }
  const cleanBatches = Array.isArray(batches)
    ? [...new Set(batches.map(b => String(b).trim()).filter(Boolean))]
    : [];

  const campus = await Campus.create({
    name: cleanName,
    batches: cleanBatches,
    addedBy: req.admin._id,
  });
  res.status(201).json(campus);
});

const updateCampus = asyncHandler(async (req, res) => {
  const scope = getAdminScope(req, 'addedBy');
  const campus = await Campus.findOne({ _id: req.params.id, ...scope });
  if (!campus) {
    res.status(404);
    throw new Error('Campus not found');
  }

  if (req.body.name && req.body.name.trim()) {
    campus.name = req.body.name.trim();
  }
  if (Array.isArray(req.body.batches)) {
    campus.batches = [...new Set(req.body.batches.map(b => String(b).trim()).filter(Boolean))];
  }

  const updated = await campus.save();
  res.json(updated);
});

const getCampuses = asyncHandler(async (req, res) => {
  const query = getAdminScope(req, 'addedBy');
  const campuses = await Campus.find(query).sort({ name: 1 }).lean();
  res.json(campuses);
});

const deleteCampus = asyncHandler(async (req, res) => {
  const scope = getAdminScope(req, 'addedBy');
  const campus = await Campus.findOne({ _id: req.params.id, ...scope });
  if (campus) {
    await Campus.deleteOne({ _id: campus._id });
    res.json({ message: 'Campus removed' });
  } else {
    res.status(404);
    throw new Error('Campus not found');
  }
});

const deleteStudent = asyncHandler(async (req, res) => {
  const scope = getAdminScope(req, 'addedBy');
  const student = await Student.findOne({ _id: req.params.id, ...scope });
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
};
