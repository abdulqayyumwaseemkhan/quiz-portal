import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api';
import StudentNavbar from '../components/StudentNavbar';
import { CalendarCheck, CheckCircle2, XCircle, Clock, Calendar } from 'lucide-react';
import { useLiveRefresh } from '../utils/liveSync';

const StudentAttendancePage = () => {
  const [data, setData] = useState({
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
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const student = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('studentInfo'));
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    if (!student) {
      navigate('/', { replace: true });
    }
  }, [student, navigate]);

  const fetchAttendance = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await API.get(`/student/attendance/${student.studentId}`);
      setData(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [student]);

  useEffect(() => {
    if (student) fetchAttendance(false);
  }, [student, fetchAttendance]);

  // Silently revalidates when admin updates attendance or student focuses window
  useLiveRefresh(fetchAttendance, 10000, ['ATTENDANCE_UPDATED']);

  const { summary, history } = data;

  const getBadgeStyle = (status) => {
    if (status === 'Present') return 'bg-emerald-500/15 text-emerald-600';
    if (status === 'Late') return 'bg-amber-500/15 text-amber-600';
    if (status === 'Leave') return 'bg-sky-500/15 text-sky-600';
    return 'bg-rose-500/15 text-rose-600';
  };

  return (
    <div className="min-h-screen pb-20 md:pb-12">
      <StudentNavbar student={student} />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8 space-y-6">
        <header>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">My Attendance</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Lecture-wise attendance record for {student?.campus} ({student?.batch})
          </p>
        </header>

        {/* Attendance Summary Cards & Progress Indicator */}
        <div className="card p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                Overall Attendance Rate
              </p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl sm:text-4xl font-bold">{summary.percentage}%</span>
                <span className="text-xs text-[var(--text-secondary)]">
                  ({summary.attended} of {summary.totalLectures} lectures attended)
                </span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 text-xs font-semibold">
              <span className="px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center gap-1">
                <CheckCircle2 size={14} /> Present: {summary.present}
              </span>
              <span className="px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-600 flex items-center gap-1">
                <Clock size={14} /> Late: {summary.late}
              </span>
              <span className="px-3 py-1.5 rounded-lg bg-rose-500/10 text-rose-600 flex items-center gap-1">
                <XCircle size={14} /> Absent: {summary.absent}
              </span>
              <span className="px-3 py-1.5 rounded-lg bg-sky-500/10 text-sky-600">
                Leave: {summary.leave}
              </span>
            </div>
          </div>

          <div className="w-full h-3 bg-[var(--bg-muted)] rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                summary.percentage >= 75
                  ? 'bg-emerald-500'
                  : summary.percentage >= 50
                  ? 'bg-amber-500'
                  : 'bg-rose-500'
              }`}
              style={{ width: `${Math.min(100, summary.percentage)}%` }}
            />
          </div>
        </div>

        {/* Date-wise Lecture History */}
        <div className="card p-0 overflow-hidden">
          <div className="p-5 border-b border-[var(--border)] flex justify-between items-center">
            <h2 className="text-base font-bold">Lecture History</h2>
            <span className="text-xs text-[var(--text-secondary)]">
              {history.length} Sessions
            </span>
          </div>

          {loading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3].map((n) => (
                <div key={n} className="h-14 rounded-xl bg-[var(--bg-muted)] animate-pulse" />
              ))}
            </div>
          ) : history.length === 0 ? (
            <div className="p-14 text-center">
              <CalendarCheck className="mx-auto text-[var(--text-muted)] mb-3" size={40} />
              <p className="font-semibold text-base">No attendance sessions recorded yet</p>
              <p className="text-xs text-[var(--text-secondary)] mt-1">
                Once your instructor records class attendance for your batch, it will appear here.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {history.map((item) => (
                <div
                  key={item.sessionId}
                  className="p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                >
                  <div>
                    <p className="font-semibold text-sm sm:text-base">{item.lectureTitle}</p>
                    <p className="text-xs text-[var(--text-secondary)] flex items-center gap-2 mt-0.5">
                      <Calendar size={13} />
                      <span>{new Date(item.date).toLocaleDateString()}</span>
                      {item.time && <span>• {item.time}</span>}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${getBadgeStyle(
                        item.status
                      )}`}
                    >
                      {item.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentAttendancePage;
