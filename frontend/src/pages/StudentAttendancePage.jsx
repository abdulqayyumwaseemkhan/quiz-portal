import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api';
import StudentNavbar from '../components/StudentNavbar';
import { CalendarCheck, CheckCircle2, XCircle, Clock, Calendar } from 'lucide-react';
import { useLiveRefresh } from '../utils/liveSync';
import { clientCache } from '../utils/clientCache';

const StudentAttendancePage = () => {
  const student = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('studentInfo'));
    } catch {
      return null;
    }
  }, []);

  const cacheKey = student?.studentId ? `student_attendance_${student.studentId}` : null;
  const cached = cacheKey ? clientCache.get(cacheKey) : null;

  const [data, setData] = useState(
    cached || {
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
    }
  );
  const [loading, setLoading] = useState(!cached);
  const navigate = useNavigate();

  useEffect(() => {
    if (!student) {
      navigate('/', { replace: true });
    }
  }, [student, navigate]);

  const fetchAttendance = useCallback(
    async (silent = false) => {
      const hasCache = cacheKey && clientCache.has(cacheKey);
      if (!silent && !hasCache) setLoading(true);
      try {
        const res = await API.get(`/student/attendance/${student.studentId}`);
        setData(res.data);
        if (cacheKey) clientCache.set(cacheKey, res.data);
      } catch (error) {
        console.error(error);
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [student, cacheKey]
  );

  useEffect(() => {
    if (student) fetchAttendance(cacheKey && clientCache.has(cacheKey) ? true : false);
  }, [student, fetchAttendance, cacheKey]);

  useLiveRefresh(fetchAttendance, 10000, ['ATTENDANCE_UPDATED']);

  const { summary, history } = data;

  const getBadgeClass = (status) => {
    if (status === 'Present') return 'academic-badge academic-badge-success';
    if (status === 'Late') return 'academic-badge academic-badge-warning';
    if (status === 'Leave') return 'academic-badge academic-badge-info';
    return 'academic-badge academic-badge-danger';
  };

  return (
    <div className="student-portal min-h-screen pb-16">
      <StudentNavbar student={student} />
      <main className="lg:pl-60">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8 space-y-6">
          <header>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)]">
              Attendance Record
            </h1>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              Session-by-session attendance register for {student?.campus} ({student?.batch})
            </p>
          </header>

          {/* Attendance Summary Card */}
          <div className="card p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                  Cumulative Attendance Rate
                </p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl font-bold text-[var(--text-primary)]">
                    {summary.percentage}%
                  </span>
                  <span className="text-xs text-[var(--text-secondary)]">
                    ({summary.attended} of {summary.totalLectures} lectures attended)
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="academic-badge academic-badge-success py-1 px-2.5">
                  <CheckCircle2 size={13} /> Present: {summary.present}
                </span>
                <span className="academic-badge academic-badge-warning py-1 px-2.5">
                  <Clock size={13} /> Late: {summary.late}
                </span>
                <span className="academic-badge academic-badge-danger py-1 px-2.5">
                  <XCircle size={13} /> Absent: {summary.absent}
                </span>
                <span className="academic-badge academic-badge-info py-1 px-2.5">
                  Leave: {summary.leave}
                </span>
              </div>
            </div>

            <div className="w-full h-2.5 bg-[var(--bg-muted)] rounded-sm overflow-hidden">
              <div
                className="h-full transition-all duration-500"
                style={{
                  width: `${Math.min(100, summary.percentage)}%`,
                  backgroundColor:
                    summary.percentage >= 75
                      ? 'var(--status-success)'
                      : summary.percentage >= 50
                      ? 'var(--status-warning)'
                      : 'var(--status-danger)',
                }}
              />
            </div>
          </div>

          {/* Session History Table / List */}
          <div className="card p-0 overflow-hidden">
            <div className="px-5 py-4 border-b border-[var(--border)] bg-[var(--bg-muted)]/50 flex justify-between items-center">
              <h2 className="text-sm sm:text-base font-bold text-[var(--text-primary)]">
                Session Log
              </h2>
              <span className="text-xs font-medium text-[var(--text-secondary)]">
                {history.length} Recorded Sessions
              </span>
            </div>

            {loading ? (
              <div className="p-6 space-y-3">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="h-12 rounded bg-[var(--bg-muted)] animate-pulse" />
                ))}
              </div>
            ) : history.length === 0 ? (
              <div className="p-12 text-center">
                <CalendarCheck className="mx-auto text-[var(--text-secondary)] mb-3" size={34} />
                <p className="font-semibold text-base text-[var(--text-primary)]">
                  No attendance sessions recorded yet
                </p>
                <p className="text-xs text-[var(--text-secondary)] mt-1">
                  Class attendance records marked by your instructor will appear here.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[var(--border)]">
                {history.map((item) => (
                  <div
                    key={item.sessionId}
                    className="px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-[var(--bg-hover)]/40 transition-colors"
                  >
                    <div>
                      <p className="font-semibold text-sm text-[var(--text-primary)]">
                        {item.lectureTitle}
                      </p>
                      <p className="text-xs text-[var(--text-secondary)] flex items-center gap-2 mt-0.5">
                        <Calendar size={12} />
                        <span>{new Date(item.date).toLocaleDateString()}</span>
                        {item.time && <span>· {item.time}</span>}
                      </p>
                    </div>
                    <div>
                      <span className={getBadgeClass(item.status)}>{item.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default StudentAttendancePage;
