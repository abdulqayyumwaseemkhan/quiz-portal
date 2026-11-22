import * as XLSX from 'xlsx';
import API from '../api';
import toast from 'react-hot-toast';

/**
 * Fetches all student records, quizzes, results, assignments, submissions, and attendance
 * and exports a comprehensive, multi-sheet Master Excel report.
 */
export async function exportMasterStudentReport() {
  const toastId = toast.loading('Generating complete student report...');
  try {
    const { data } = await API.get('/admin/reports/master-students');
    const {
      students = [],
      quizzes = [],
      assignments = [],
      results = [],
      submissions = [],
      attendanceRecords = [],
    } = data;

    if (!students.length) {
      toast.error('No student records found to export', { id: toastId });
      return;
    }

    // 1. Pre-index quiz results: Map<"studentId_quizId", Result>
    const quizResultMap = new Map();
    results.forEach((r) => {
      const key = `${r.studentId}_${r.quizId}`;
      // Keep the best or latest score if multiple attempts
      const prev = quizResultMap.get(key);
      if (!prev || (r.score ?? 0) > (prev.score ?? 0)) {
        quizResultMap.set(key, r);
      }
    });

    // 2. Pre-index assignment submissions: Map<"studentId_assignmentId", Submission>
    const subMap = new Map();
    submissions.forEach((sub) => {
      const key = `${sub.studentId}_${sub.assignmentId}`;
      subMap.set(key, sub);
    });

    // 3. Pre-index attendance records by studentId: Map<studentId, AttendanceRecord[]>
    const attendanceMap = new Map();
    attendanceRecords.forEach((att) => {
      if (!attendanceMap.has(att.studentId)) {
        attendanceMap.set(att.studentId, []);
      }
      attendanceMap.get(att.studentId).push(att);
    });

    // --- Build Sheet 1: Master Consolidated Student Performance ---
    const masterRows = students.map((s) => {
      const studentAtt = attendanceMap.get(s.studentId) || [];
      const presentCount = studentAtt.filter((a) => a.status === 'Present' || a.status === 'Late').length;
      const absentCount = studentAtt.filter((a) => a.status === 'Absent').length;
      const leaveCount = studentAtt.filter((a) => a.status === 'Leave').length;
      const totalAttSessions = presentCount + absentCount + leaveCount;
      const attPct = totalAttSessions > 0 ? Math.round((presentCount / totalAttSessions) * 100) : 0;

      // Count attempted quizzes & calculate scores
      let quizzesAttempted = 0;
      let totalQuizScoreObtained = 0;
      let totalQuizMarksAvailable = 0;

      const dynamicQuizCols = {};
      quizzes.forEach((q) => {
        const qKey = `${s.studentId}_${q._id}`;
        const res = quizResultMap.get(qKey);
        const qTotal = Number(q.totalMarks) || (Array.isArray(q.questions) ? q.questions.length : 100);

        if (res) {
          quizzesAttempted += 1;
          totalQuizScoreObtained += Number(res.score) || 0;
          totalQuizMarksAvailable += qTotal;
          dynamicQuizCols[`Quiz: ${q.title}`] = `${res.score} / ${qTotal}`;
        } else {
          dynamicQuizCols[`Quiz: ${q.title}`] = 'Not Attempted';
        }
      });

      // Count assignment submissions & scores
      let assignmentsSubmitted = 0;
      let totalAssignmentMarksObtained = 0;
      let totalAssignmentMaxMarks = 0;

      const dynamicAssignmentCols = {};
      assignments.forEach((a) => {
        const aKey = `${s.studentId}_${a._id}`;
        const sub = subMap.get(aKey);
        const aMax = Number(a.totalMarks) || 100;

        if (sub) {
          assignmentsSubmitted += 1;
          if (sub.marksObtained !== null && sub.marksObtained !== undefined) {
            totalAssignmentMarksObtained += Number(sub.marksObtained) || 0;
            totalAssignmentMaxMarks += aMax;
            dynamicAssignmentCols[`Assignment: ${a.title} (Marks)`] = `${sub.marksObtained} / ${aMax}`;
          } else {
            dynamicAssignmentCols[`Assignment: ${a.title} (Marks)`] = 'Submitted (Pending Grade)';
          }
          dynamicAssignmentCols[`Assignment: ${a.title} (Remarks)`] = sub.remarks || sub.feedback || '-';
        } else {
          dynamicAssignmentCols[`Assignment: ${a.title} (Marks)`] = 'Not Submitted';
          dynamicAssignmentCols[`Assignment: ${a.title} (Remarks)`] = '-';
        }
      });

      return {
        'Student ID': s.studentId,
        'Full Name': s.fullName,
        Contact: s.contact || '-',
        Email: s.email || '-',
        Campus: s.campus || '-',
        Batch: s.batch || '-',
        Status: s.isActive === false ? 'Deactivated' : 'Active',
        'Attendance: Present': presentCount,
        'Attendance: Absent': absentCount,
        'Attendance: Leave': leaveCount,
        'Attendance: Total Sessions': totalAttSessions,
        'Attendance %': totalAttSessions > 0 ? `${attPct}%` : 'N/A',
        'Quizzes Attempted': `${quizzesAttempted} / ${quizzes.length}`,
        'Quiz Total Score': totalQuizMarksAvailable > 0 ? `${totalQuizScoreObtained} / ${totalQuizMarksAvailable}` : `${totalQuizScoreObtained}`,
        ...dynamicQuizCols,
        'Assignments Submitted': `${assignmentsSubmitted} / ${assignments.length}`,
        'Assignments Total Score': totalAssignmentMaxMarks > 0 ? `${totalAssignmentMarksObtained} / ${totalAssignmentMaxMarks}` : `${totalAssignmentMarksObtained}`,
        ...dynamicAssignmentCols,
        'Registered Date': s.createdAt ? new Date(s.createdAt).toLocaleDateString() : '',
      };
    });

    // --- Build Sheet 2: Quiz Results Breakdown ---
    const quizRows = [];
    results.forEach((res) => {
      const q = quizzes.find((item) => item._id === res.quizId || item._id.toString() === res.quizId?.toString());
      const s = students.find((item) => item.studentId === res.studentId);
      const qTotal = q ? Number(q.totalMarks) || (Array.isArray(q.questions) ? q.questions.length : 100) : 100;
      const pct = qTotal > 0 ? Math.round(((Number(res.score) || 0) / qTotal) * 100) : 0;

      quizRows.push({
        'Student ID': res.studentId,
        'Student Name': s ? s.fullName : res.studentName || '-',
        Campus: s ? s.campus : res.campus || '-',
        Batch: s ? s.batch : res.batch || '-',
        'Quiz Title': q ? q.title : 'Quiz',
        'Score Obtained': Number(res.score) || 0,
        'Total Marks': qTotal,
        'Score %': `${pct}%`,
        'Attempt No': res.attemptNo || 1,
        'Attempt Date': res.createdAt ? new Date(res.createdAt).toLocaleString() : '',
      });
    });

    // --- Build Sheet 3: Assignment Submissions Breakdown ---
    const assignmentRows = [];
    submissions.forEach((sub) => {
      const a = assignments.find((item) => item._id === sub.assignmentId || item._id.toString() === sub.assignmentId?.toString());
      const s = students.find((item) => item.studentId === sub.studentId);
      const aMax = a ? Number(a.totalMarks) || sub.maxMarks || 100 : sub.maxMarks || 100;

      assignmentRows.push({
        'Student ID': sub.studentId,
        'Student Name': s ? s.fullName : sub.studentName || '-',
        Campus: s ? s.campus : sub.campus || '-',
        Batch: s ? s.batch : sub.batch || '-',
        'Assignment Title': a ? a.title : 'Assignment',
        'Submission Type': sub.submissionType || 'file',
        'Marks Obtained': sub.marksObtained !== null && sub.marksObtained !== undefined ? sub.marksObtained : 'Ungraded',
        'Max Marks': aMax,
        'Status': sub.status || 'submitted',
        'Instructor Remarks': sub.remarks || sub.feedback || '-',
        'Live Project URL': sub.liveUrl || '-',
        'GitHub URL': sub.githubUrl || '-',
        'Submitted At': sub.submittedAt ? new Date(sub.submittedAt).toLocaleString() : '',
      });
    });

    // --- Build Sheet 4: Attendance Log ---
    const attendanceRows = [];
    attendanceRecords.forEach((att) => {
      const s = students.find((item) => item.studentId === att.studentId);
      attendanceRows.push({
        'Student ID': att.studentId,
        'Student Name': s ? s.fullName : att.studentName || '-',
        Campus: s ? s.campus : att.campus || '-',
        Batch: s ? s.batch : att.batch || '-',
        Status: att.status || 'Present',
        Remarks: att.remarks || '-',
        Date: att.createdAt ? new Date(att.createdAt).toLocaleDateString() : '',
      });
    });

    // Create Excel Workbook
    const wb = XLSX.utils.book_new();

    // 1. Master Sheet
    const wsMaster = XLSX.utils.json_to_sheet(masterRows);
    XLSX.utils.book_append_sheet(wb, wsMaster, 'Master Performance');

    // 2. Quiz Breakdown Sheet
    if (quizRows.length > 0) {
      const wsQuiz = XLSX.utils.json_to_sheet(quizRows);
      XLSX.utils.book_append_sheet(wb, wsQuiz, 'Quiz Results');
    }

    // 3. Assignment Breakdown Sheet
    if (assignmentRows.length > 0) {
      const wsAssignment = XLSX.utils.json_to_sheet(assignmentRows);
      XLSX.utils.book_append_sheet(wb, wsAssignment, 'Assignments');
    }

    // 4. Attendance Log Sheet
    if (attendanceRows.length > 0) {
      const wsAttendance = XLSX.utils.json_to_sheet(attendanceRows);
      XLSX.utils.book_append_sheet(wb, wsAttendance, 'Attendance Log');
    }

    const dateStr = new Date().toISOString().slice(0, 10);
    const fileName = `complete_student_master_report_${dateStr}.xlsx`;
    XLSX.writeFile(wb, fileName);

    toast.success(`Complete student report exported (${fileName})!`, { id: toastId });
  } catch (error) {
    console.error('Master export error:', error);
    toast.error(error.response?.data?.message || 'Failed to generate master report', { id: toastId });
  }
}
