const asyncHandler = require('express-async-handler');
const { z } = require('zod');
const Admin = require('../models/Admin');
const Student = require('../models/Student');
const Campus = require('../models/Campus');
const jwt = require('jsonwebtoken');
const {
  generateSecurePassword,
  hashPassword,
  encryptStudentPassword,
  decryptStudentPassword,
} = require('../utils/password');
const {
  generateBase32Secret,
  buildOtpAuthUri,
  verifyTotpToken,
  generateWebAuthnChallenge,
  verifyWebAuthnAssertion,
} = require('../utils/twoFactor');
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
  password: z.string().trim().optional().or(z.literal('')),
});

// @desc    Auth admin & get token (or 2FA challenge if enabled)
// @route   POST /api/admin/login
const loginAdmin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400);
    throw new Error('Please provide email and password');
  }

  const admin = await Admin.findOne({ email: email.toLowerCase().trim() });

  if (!admin || !(await admin.comparePassword(password))) {
    res.status(401);
    throw new Error('Invalid email or password');
  }

  const hasTotp = Boolean(admin.totpEnabled && admin.totpSecret);
  const hasSecurityKey = Array.isArray(admin.securityKeys) && admin.securityKeys.length > 0;

  if (hasTotp || hasSecurityKey) {
    const challenge = generateWebAuthnChallenge();
    admin.currentChallenge = challenge;
    await admin.save();

    const tempToken = jwt.sign(
      { id: admin._id, role: admin.role, purpose: '2fa' },
      process.env.JWT_SECRET,
      { expiresIn: '5m' }
    );

    return res.json({
      requires2FA: true,
      tempToken,
      email: admin.email,
      methods: {
        totp: hasTotp,
        securityKey: hasSecurityKey,
      },
      challenge,
      allowCredentials: (admin.securityKeys || []).map((k) => k.credentialId),
    });
  }

  res.json({
    _id: admin._id,
    email: admin.email,
    role: admin.role,
    token: generateToken(admin._id, admin.role),
  });
});

// @desc    Verify Admin 2FA (Google Authenticator TOTP or Windows Security Key)
// @route   POST /api/admin/login/verify-2fa
const verifyAdmin2FA = asyncHandler(async (req, res) => {
  const {
    tempToken,
    method,
    code,
    credentialId,
    authenticatorData,
    clientDataJSON,
    signature,
  } = req.body;

  if (!tempToken) {
    res.status(400);
    throw new Error('Missing two-factor session token');
  }

  let decoded;
  try {
    decoded = jwt.verify(tempToken, process.env.JWT_SECRET);
  } catch {
    res.status(401);
    throw new Error('Two-factor session expired. Please sign in again.');
  }

  if (decoded.purpose !== '2fa') {
    res.status(401);
    throw new Error('Invalid two-factor token');
  }

  const admin = await Admin.findById(decoded.id);
  if (!admin) {
    res.status(404);
    throw new Error('Admin account not found');
  }

  if (method === 'totp') {
    if (!admin.totpEnabled || !admin.totpSecret) {
      res.status(400);
      throw new Error('Google Authenticator is not enabled on this account');
    }
    const isValid = verifyTotpToken(admin.totpSecret, code);
    if (!isValid) {
      res.status(401);
      throw new Error('Invalid 6-digit authenticator code');
    }
  } else if (method === 'securityKey') {
    const keyDoc = (admin.securityKeys || []).find((k) => k.credentialId === credentialId);
    if (!keyDoc) {
      res.status(401);
      throw new Error('Unrecognized security key');
    }
    const isValid = verifyWebAuthnAssertion({
      publicKeySpkiBase64: keyDoc.publicKeySpki,
      alg: keyDoc.alg,
      expectedChallenge: admin.currentChallenge,
      authenticatorDataBase64: authenticatorData,
      clientDataJSONBase64: clientDataJSON,
      signatureBase64: signature,
    });
    if (!isValid) {
      res.status(401);
      throw new Error('Windows Security Key verification failed');
    }
    admin.currentChallenge = '';
    await admin.save();
  } else {
    res.status(400);
    throw new Error('Unsupported 2FA verification method');
  }

  res.json({
    _id: admin._id,
    email: admin.email,
    role: admin.role,
    token: generateToken(admin._id, admin.role),
  });
});

// --- Admin 2FA Management (Google Authenticator + Windows Security Key) ---

const get2FAStatus = asyncHandler(async (req, res) => {
  const admin = await Admin.findById(req.admin._id).lean();
  if (!admin) {
    res.status(404);
    throw new Error('Admin not found');
  }
  res.json({
    totpEnabled: Boolean(admin.totpEnabled && admin.totpSecret),
    securityKeys: (admin.securityKeys || []).map((k) => ({
      _id: k._id,
      label: k.label,
      createdAt: k.createdAt,
    })),
  });
});

const setupTotp = asyncHandler(async (req, res) => {
  const admin = await Admin.findById(req.admin._id);
  if (!admin) {
    res.status(404);
    throw new Error('Admin not found');
  }
  const secret = generateBase32Secret(20);
  admin.totpPendingSecret = secret;
  await admin.save();

  const otpauthUri = buildOtpAuthUri({
    secret,
    email: admin.email,
    issuer: 'BanoQabil LMS',
  });

  res.json({ secret, otpauthUri });
});

const enableTotp = asyncHandler(async (req, res) => {
  const { code } = req.body;
  const admin = await Admin.findById(req.admin._id);
  if (!admin || !admin.totpPendingSecret) {
    res.status(400);
    throw new Error('No pending Google Authenticator setup found');
  }

  if (!verifyTotpToken(admin.totpPendingSecret, code)) {
    res.status(400);
    throw new Error('Invalid 6-digit code. Please check Google Authenticator and try again.');
  }

  admin.totpSecret = admin.totpPendingSecret;
  admin.totpPendingSecret = '';
  admin.totpEnabled = true;
  await admin.save();

  res.json({ totpEnabled: true, message: 'Google Authenticator enabled successfully' });
});

const disableTotp = asyncHandler(async (req, res) => {
  const admin = await Admin.findById(req.admin._id);
  if (!admin) {
    res.status(404);
    throw new Error('Admin not found');
  }
  admin.totpEnabled = false;
  admin.totpSecret = '';
  admin.totpPendingSecret = '';
  await admin.save();

  res.json({ totpEnabled: false, message: 'Google Authenticator disabled' });
});

const getSecurityKeyChallenge = asyncHandler(async (req, res) => {
  const admin = await Admin.findById(req.admin._id);
  if (!admin) {
    res.status(404);
    throw new Error('Admin not found');
  }
  const challenge = generateWebAuthnChallenge();
  admin.currentChallenge = challenge;
  await admin.save();

  res.json({
    challenge,
    user: {
      id: String(admin._id),
      email: admin.email,
      displayName: admin.email,
    },
  });
});

const registerSecurityKey = asyncHandler(async (req, res) => {
  const { credentialId, publicKeySpki, alg = -7, label = 'Windows Hello / Security Key' } = req.body;
  if (!credentialId || !publicKeySpki) {
    res.status(400);
    throw new Error('Missing security key credential data');
  }

  const admin = await Admin.findById(req.admin._id);
  if (!admin) {
    res.status(404);
    throw new Error('Admin not found');
  }

  const alreadyExists = (admin.securityKeys || []).some((k) => k.credentialId === credentialId);
  if (!alreadyExists) {
    admin.securityKeys.push({
      credentialId,
      publicKeySpki,
      alg: Number(alg) || -7,
      label: String(label || 'Windows Hello / Security Key').trim(),
      createdAt: new Date(),
    });
  }
  admin.currentChallenge = '';
  await admin.save();

  res.status(201).json({
    securityKeys: admin.securityKeys.map((k) => ({
      _id: k._id,
      label: k.label,
      createdAt: k.createdAt,
    })),
  });
});

const removeSecurityKey = asyncHandler(async (req, res) => {
  const admin = await Admin.findById(req.admin._id);
  if (!admin) {
    res.status(404);
    throw new Error('Admin not found');
  }
  admin.securityKeys = (admin.securityKeys || []).filter(
    (k) => String(k._id) !== String(req.params.keyId)
  );
  await admin.save();

  res.json({
    securityKeys: admin.securityKeys.map((k) => ({
      _id: k._id,
      label: k.label,
      createdAt: k.createdAt,
    })),
  });
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

  const { studentId, fullName, email, campus, batch, contact, password: customPassword } = parsed.data;

  const studentExists = await Student.findOne({ studentId, addedBy: req.admin._id }).lean();
  if (studentExists) {
    res.status(400);
    throw new Error('Student ID already exists in your account');
  }

  const plainPassword = customPassword && customPassword.length >= 4
    ? customPassword
    : generateSecurePassword(9);
  const passwordHash = await hashPassword(plainPassword);
  const passwordCipher = encryptStudentPassword(plainPassword);

  const student = await Student.create({
    studentId,
    fullName,
    email: email || '',
    contact: contact || '',
    campus,
    batch,
    passwordHash,
    passwordCipher,
    mustChangePassword: !customPassword,
    isActive: true,
    emailStatus: 'pending',
    addedBy: req.admin._id,
  });

  const responseObj = student.toObject();
  delete responseObj.passwordHash;
  delete responseObj.passwordCipher;
  responseObj.plainPassword = plainPassword;
  responseObj.generatedPassword = plainPassword;

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

  for (let idx = 0; idx < students.length; idx++) {
    const raw = students[idx];
    const parsed = studentInputSchema.safeParse({
      studentId: String(raw.studentId || '').trim(),
      fullName: String(raw.fullName || raw.name || '').trim(),
      email: String(raw.email || '').trim().toLowerCase(),
      campus: String(raw.campus || '').trim(),
      batch: String(raw.batch || '').trim(),
      contact: String(raw.contact || '').trim(),
      password: String(raw.password || '').trim(),
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
    const generatedPassword = data.password && data.password.length >= 4
      ? data.password
      : generateSecurePassword(9);
    validDocs.push({ data, generatedPassword, hasCustomPassword: Boolean(data.password) });
  }

  if (validDocs.length === 0) {
    res.status(400);
    throw new Error(errors[0]?.message || 'No valid students to import');
  }

  const docsToInsert = await Promise.all(
    validDocs.map(async ({ data, generatedPassword, hasCustomPassword }) => {
      const passwordHash = await hashPassword(generatedPassword);
      const passwordCipher = encryptStudentPassword(generatedPassword);
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
        passwordCipher,
        mustChangePassword: !hasCustomPassword,
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

  const credMap = new Map(plainCredentials.map(c => [c.studentId, c.generatedPassword]));
  const resultStudents = insertedDocs.map(doc => {
    const obj = doc.toObject ? doc.toObject() : { ...doc };
    delete obj.passwordHash;
    delete obj.passwordCipher;
    const pw = credMap.get(obj.studentId) || '';
    obj.generatedPassword = pw;
    obj.plainPassword = pw;
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
    .select('+passwordCipher -passwordHash')
    .sort({ createdAt: -1 })
    .lean();

  const formatted = students.map((s) => {
    const plainPassword = decryptStudentPassword(s.passwordCipher);
    const copy = { ...s, plainPassword };
    delete copy.passwordCipher;
    return copy;
  });

  res.json(formatted);
});

const updateStudent = asyncHandler(async (req, res) => {
  const scope = getAdminScope(req, 'addedBy');
  const student = await Student.findOne({ _id: req.params.id, ...scope }).select('+passwordCipher');

  if (!student) {
    res.status(404);
    throw new Error('Student not found');
  }

  const { studentId, fullName, email, campus, batch, contact, isActive, password, mustChangePassword } = req.body;

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

  if (password && String(password).trim().length > 0) {
    const cleanPass = String(password).trim();
    if (cleanPass.length < 4) {
      res.status(400);
      throw new Error('Password must be at least 4 characters');
    }
    student.passwordHash = await hashPassword(cleanPass);
    student.passwordCipher = encryptStudentPassword(cleanPass);
    student.mustChangePassword = typeof mustChangePassword === 'boolean' ? mustChangePassword : false;
  }

  const updated = await student.save();
  const obj = updated.toObject();
  const plainPassword = decryptStudentPassword(student.passwordCipher);
  delete obj.passwordHash;
  delete obj.passwordCipher;
  obj.plainPassword = plainPassword;

  res.json(obj);
});

const resetStudentPassword = asyncHandler(async (req, res) => {
  const scope = getAdminScope(req, 'addedBy');
  const student = await Student.findOne({ _id: req.params.id, ...scope });

  if (!student) {
    res.status(404);
    throw new Error('Student not found');
  }

  const customPassword = req.body?.password ? String(req.body.password).trim() : '';
  if (customPassword && customPassword.length < 4) {
    res.status(400);
    throw new Error('Password must be at least 4 characters');
  }

  const plainPassword = customPassword || generateSecurePassword(9);
  student.passwordHash = await hashPassword(plainPassword);
  student.passwordCipher = encryptStudentPassword(plainPassword);
  student.mustChangePassword = req.body?.mustChangePassword !== undefined
    ? Boolean(req.body.mustChangePassword)
    : !customPassword;
  student.emailStatus = 'pending';
  await student.save();

  res.json({
    _id: student._id,
    studentId: student.studentId,
    fullName: student.fullName,
    email: student.email,
    plainPassword,
    generatedPassword: plainPassword,
  });
});

const bulkRegeneratePasswords = asyncHandler(async (req, res) => {
  const { studentIds, customPassword } = req.body;
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

  const cleanCustom = customPassword ? String(customPassword).trim() : '';
  const credentials = [];
  const bulkOps = await Promise.all(
    students.map(async (st) => {
      const generatedPassword = cleanCustom.length >= 4 ? cleanCustom : generateSecurePassword(9);
      const passwordHash = await hashPassword(generatedPassword);
      const passwordCipher = encryptStudentPassword(generatedPassword);
      credentials.push({
        _id: st._id,
        studentId: st.studentId,
        fullName: st.fullName,
        email: st.email || '',
        campus: st.campus,
        batch: st.batch,
        generatedPassword,
        plainPassword: generatedPassword,
      });
      return {
        updateOne: {
          filter: { _id: st._id },
          update: {
            $set: {
              passwordHash,
              passwordCipher,
              mustChangePassword: !cleanCustom,
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

  const chunkIds = studentIds.slice(0, 25);
  const scope = getAdminScope(req, 'addedBy');

  const students = await Student.find({
    ...scope,
    $or: [
      { _id: { $in: chunkIds.filter(id => /^[0-9a-fA-F]{24}$/.test(id)) } },
      { studentId: { $in: chunkIds } },
    ],
  })
    .select('+passwordCipher')
    .lean();

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

    let plainPassword =
      credentialsMap[st.studentId] ||
      credentialsMap[st._id?.toString()] ||
      decryptStudentPassword(st.passwordCipher);
    let newPasswordHash = null;
    let newPasswordCipher = null;

    if (!plainPassword) {
      plainPassword = generateSecurePassword(9);
      newPasswordHash = await hashPassword(plainPassword);
      newPasswordCipher = encryptStudentPassword(plainPassword);
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
        updateFields.passwordCipher = newPasswordCipher;
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
        plainPassword,
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
};
