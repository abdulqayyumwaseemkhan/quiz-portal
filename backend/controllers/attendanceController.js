const asyncHandler = require('express-async-handler');
const AttendanceSession = require('../models/AttendanceSession');
const AttendanceRecord = require('../models/AttendanceRecord');
const Student = require('../models/Student');
const { getAdminScope } = require('../middleware/auth');

// @desc    Create a new lecture attendance session & return roster for that campus/batch
// @route   POST /api/attendance/sessions
const createSession = asyncHandler(async (req, res) => {
  const { lectureTitle, date, time, campus, batch } = req.body;
  if (!lectureTitle || !date || !campus || !batch) {
    res.status(400);
    throw new Error('Lecture title, date, campus, and batch are required');
  }

  const session = await AttendanceSession.create({
    lectureTitle: lectureTitle.trim(),
    date: new Date(date),
    time: (time || '').trim(),
    campus: campus.trim(),
    batch: batch.trim(),
    createdBy: req.admin._id,
  });

  // Fetch active students of this campus/batch for this admin
  const students = await Student.find({
    addedBy: req.admin._id,
    campus: session.campus,
    batch: session.batch,
    isActive: { $ne: false },
  })
    .select('_id studentId fullName campus batch')
    .sort({ fullName: 1 })
    .lean();

  res.status(201).json({
    session,
    students,
    records: [],
  });
});

// @desc    List attendance sessions for admin with summary counts
// @route   GET /api/attendance/sessions
const getSessions = asyncHandler(async (req, res) => {
  const { campus, batch, fromDate, toDate } = req.query;
  const query = { ...getAdminScope(req, 'createdBy') };

  if (campus) query.campus = campus;
  if (batch) query.batch = batch;
  if (fromDate || toDate) {
    query.date = {};
    if (fromDate) query.date.$gte = new Date(fromDate);
    if (toDate) {
      const end = new Date(toDate);
      end.setHours(23, 59, 59, 999);
      query.date.$lte = end;
    }
  }

  const sessions = await AttendanceSession.find(query)
    .sort({ date: -1, createdAt: -1 })
    .lean();

  if (sessions.length === 0) {
    return res.json([]);
  }

  const sessionIds = sessions.map((s) => s._id);
  const stats = await AttendanceRecord.aggregate([
    { $match: { sessionId: { $in: sessionIds } } },
    {
      $group: {
        _id: { sessionId: '$sessionId', status: '$status' },
        count: { $sum: 1 },
      },
    },
  ]);

  const countsMap = new Map();
  stats.forEach((item) => {
    const sid = item._id.sessionId.toString();
    if (!countsMap.has(sid)) {
      countsMap.set(sid, { Present: 0, Absent: 0, Late: 0, Leave: 0, totalMarked: 0 });
    }
    const entry = countsMap.get(sid);
    entry[item._id.status] = item.count;
    entry.totalMarked += item.count;
  });

  const enriched = sessions.map((s) => ({
    ...s,
    summary: countsMap.get(s._id.toString()) || {
      Present: 0,
      Absent: 0,
      Late: 0,
      Leave: 0,
      totalMarked: 0,
    },
  }));

  res.json(enriched);
});

// @desc    Get single session details + student roster + existing attendance records
// @route   GET /api/attendance/sessions/:id
const getSessionById = asyncHandler(async (req, res) => {
  const scope = getAdminScope(req, 'createdBy');
  const session = await AttendanceSession.findOne({ _id: req.params.id, ...scope }).lean();
  if (!session) {
    res.status(404);
    throw new Error('Attendance session not found');
  }

  const [students, records] = await Promise.all([
    Student.find({
      addedBy: session.createdBy,
      campus: session.campus,
      batch: session.batch,
      isActive: { $ne: false },
    })
      .select('_id studentId fullName campus batch')
      .sort({ fullName: 1 })
      .lean(),
    AttendanceRecord.find({ sessionId: session._id }).lean(),
  ]);

  res.json({
    session,
    students,
    records,
  });
});

// @desc    Bulk mark or update attendance for a session using bulkWrite
// @route   POST /api/attendance/sessions/:id/mark
const markSessionAttendance = asyncHandler(async (req, res) => {
  const scope = getAdminScope(req, 'createdBy');
  const session = await AttendanceSession.findOne({ _id: req.params.id, ...scope });
  if (!session) {
    res.status(404);
    throw new Error('Attendance session not found');
  }

  const { entries, lectureTitle, date, time } = req.body;
  if (lectureTitle) session.lectureTitle = lectureTitle.trim();
  if (date) session.date = new Date(date);
  if (time !== undefined) session.time = time.trim();
  await session.save();

  if (!Array.isArray(entries) || entries.length === 0) {
    res.status(400);
    throw new Error('No attendance entries provided');
  }

  const validStatuses = new Set(['Present', 'Absent', 'Late', 'Leave']);

  const bulkOps = entries
    .filter((e) => e && e.studentId)
    .map((entry) => {
      const status = validStatuses.has(entry.status) ? entry.status : 'Present';
      return {
        updateOne: {
          filter: {
            sessionId: session._id,
            studentId: String(entry.studentId).trim(),
          },
          update: {
            $set: {
              studentName: String(entry.studentName || entry.fullName || entry.studentId).trim(),
              campus: session.campus,
              batch: session.batch,
              status,
              remarks: String(entry.remarks || '').trim(),
              markedBy: req.admin._id,
            },
          },
          upsert: true,
        },
      };
    });

  if (bulkOps.length > 0) {
    await AttendanceRecord.bulkWrite(bulkOps, { ordered: false });
  }

  const updatedRecords = await AttendanceRecord.find({ sessionId: session._id }).lean();

  res.json({
    message: 'Attendance saved',
    savedCount: bulkOps.length,
    session,
    records: updatedRecords,
  });
});

// @desc    Delete attendance session and its records
// @route   DELETE /api/attendance/sessions/:id
const deleteSession = asyncHandler(async (req, res) => {
  const scope = getAdminScope(req, 'createdBy');
  const session = await AttendanceSession.findOne({ _id: req.params.id, ...scope });
  if (!session) {
    res.status(404);
    throw new Error('Attendance session not found');
  }

  await Promise.all([
    AttendanceRecord.deleteMany({ sessionId: session._id }),
    AttendanceSession.deleteOne({ _id: session._id }),
  ]);

  res.json({ message: 'Attendance session deleted' });
});

// @desc    Admin attendance report (filter by campus, batch, date range, student)
// @route   GET /api/attendance/report
const getAttendanceReport = asyncHandler(async (req, res) => {
  const { campus, batch, fromDate, toDate, studentId } = req.query;
  const sessionQuery = { ...getAdminScope(req, 'createdBy') };

  if (campus) sessionQuery.campus = campus;
  if (batch) sessionQuery.batch = batch;
  if (fromDate || toDate) {
    sessionQuery.date = {};
    if (fromDate) sessionQuery.date.$gte = new Date(fromDate);
    if (toDate) {
      const end = new Date(toDate);
      end.setHours(23, 59, 59, 999);
      sessionQuery.date.$lte = end;
    }
  }

  const sessions = await AttendanceSession.find(sessionQuery).sort({ date: 1 }).lean();
  const sessionIds = sessions.map((s) => s._id);

  const studentQuery = { ...getAdminScope(req, 'addedBy') };
  if (campus) studentQuery.campus = campus;
  if (batch) studentQuery.batch = batch;
  if (studentId) {
    const regex = new RegExp(String(studentId).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    studentQuery.$or = [{ studentId: regex }, { fullName: regex }];
  }

  const [students, records] = await Promise.all([
    Student.find(studentQuery).select('_id studentId fullName campus batch').sort({ fullName: 1 }).lean(),
    sessionIds.length > 0
      ? AttendanceRecord.find({ sessionId: { $in: sessionIds } }).lean()
      : Promise.resolve([]),
  ]);

  const recordsByStudent = new Map();
  records.forEach((r) => {
    if (!recordsByStudent.has(r.studentId)) {
      recordsByStudent.set(r.studentId, []);
    }
    recordsByStudent.get(r.studentId).push(r);
  });

  // Count how many sessions were held per campus+batch
  const sessionsPerGroup = new Map();
  sessions.forEach((s) => {
    const key = `${s.campus}__${s.batch}`;
    sessionsPerGroup.set(key, (sessionsPerGroup.get(key) || 0) + 1);
  });

  const studentSummary = students.map((st) => {
    const stRecords = recordsByStudent.get(st.studentId) || [];
    const present = stRecords.filter((r) => r.status === 'Present').length;
    const late = stRecords.filter((r) => r.status === 'Late').length;
    const absent = stRecords.filter((r) => r.status === 'Absent').length;
    const leave = stRecords.filter((r) => r.status === 'Leave').length;
    const totalHeld = sessionsPerGroup.get(`${st.campus}__${st.batch}`) || stRecords.length;
    const attended = present + late;
    const percentage = totalHeld > 0 ? Number(((attended / totalHeld) * 100).toFixed(1)) : 0;

    return {
      studentId: st.studentId,
      fullName: st.fullName,
      campus: st.campus,
      batch: st.batch,
      totalLectures: totalHeld,
      present,
      late,
      absent,
      leave,
      attended,
      percentage,
    };
  });

  res.json({
    totalSessions: sessions.length,
    students: studentSummary,
  });
});

// @desc    Student attendance view (date-wise lecture list + summary)
// @route   GET /api/student/attendance/:studentId
const getStudentAttendance = asyncHandler(async (req, res) => {
  const { studentId } = req.params;
  const student = req.student?.studentId === studentId
    ? req.student
    : await Student.findOne({ studentId }).select('-passwordHash').lean();

  if (!student) {
    res.status(404);
    throw new Error('Student not found');
  }

  const sessions = await AttendanceSession.find({
    createdBy: student.addedBy,
    campus: student.campus,
    batch: student.batch,
  })
    .sort({ date: -1 })
    .lean();

  if (sessions.length === 0) {
    return res.json({
      summary: {
        totalLectures: 0,
        attended: 0,
        present: 0,
        late: 0,
        absent: 0,
        leave: 0,
        percentage: 0,
      },
      history: [],
    });
  }

  const sessionIds = sessions.map((s) => s._id);
  const records = await AttendanceRecord.find({
    sessionId: { $in: sessionIds },
    studentId: student.studentId,
  }).lean();

  const recordMap = new Map(records.map((r) => [r.sessionId.toString(), r]));

  let present = 0;
  let late = 0;
  let absent = 0;
  let leave = 0;

  const history = sessions.map((s) => {
    const rec = recordMap.get(s._id.toString());
    const status = rec?.status || 'Absent';
    if (status === 'Present') present++;
    else if (status === 'Late') late++;
    else if (status === 'Leave') leave++;
    else absent++;

    return {
      sessionId: s._id,
      lectureTitle: s.lectureTitle,
      date: s.date,
      time: s.time,
      status,
      remarks: rec?.remarks || '',
    };
  });

  const totalLectures = sessions.length;
  const attended = present + late;
  const percentage = totalLectures > 0 ? Number(((attended / totalLectures) * 100).toFixed(1)) : 0;

  res.json({
    summary: {
      totalLectures,
      attended,
      present,
      late,
      absent,
      leave,
      percentage,
    },
    history,
  });
});

module.exports = {
  createSession,
  getSessions,
  getSessionById,
  markSessionAttendance,
  deleteSession,
  getAttendanceReport,
  getStudentAttendance,
};
