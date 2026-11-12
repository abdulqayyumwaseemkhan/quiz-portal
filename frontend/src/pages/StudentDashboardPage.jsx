import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api';
import StudentNavbar from '../components/StudentNavbar';
import {
  BookOpen,
  Video,
  FileArchive,
  CalendarCheck,
  Clock,
  CheckCircle2,
  ArrowRight,
  Play,
} from 'lucide-react';
import { useLiveRefresh } from '../utils/liveSync';

const StudentDashboardPage = () => {
  const [student, setStudent] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchDashboard = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const stored = JSON.parse(localStorage.getItem('studentInfo') || '{}');
      const sid = stored?.studentId;
      if (!sid) return;
      const { data } = await api.get(`/student/dashboard/${sid}`);
      setDashboard(data);
    } catch (error) {
      console.error('Failed to load student dashboard:', error);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const raw = localStorage.getItem('studentInfo');
    if (!raw) {
      navigate('/');
      return;
    }
    const parsed = JSON.parse(raw);
    setStudent(parsed);
    fetchDashboard(false);
  }, [navigate, fetchDashboard]);

  // Silently re-sync dashboard when activities occur or tab is refocused
  useLiveRefresh(fetchDashboard, 12000, [
    'ATTENDANCE_UPDATED',
    'ASSIGNMENT_GRADED',
    'ASSIGNMENT_SUBMITTED',
    'QUIZ_SUBMITTED',
    'QUIZ_PUBLISHED',
  ]);

  const attendancePct = dashboard?.attendanceSummary?.percentage || 0;

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] pb-14">
      <StudentNavbar student={student} />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl p-5">
          <div>
            <h1 className="text-xl font-bold tracking-tight">
              Welcome, {student?.fullName || 'Student'}
            </h1>
            <p className="text-sm text-[var(--text-muted)] mt-1">
              Student ID: <span className="font-mono font-semibold text-[var(--text-secondary)]">{student?.studentId}</span>
              {student?.campus ? ` · ${student.campus}` : ''}
              {student?.batch ? ` (${student.batch})` : ''}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/student-lectures" className="btn-secondary flex items-center gap-1.5 text-xs">
              <Video size={15} /> Watch Lectures
            </Link>
            <Link to="/quizzes" className="btn-primary flex items-center gap-1.5 text-xs">
              <BookOpen size={15} /> Open Quizzes
            </Link>
          </div>
        </div>

        {/* Stat Summary Cards */}
        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((n) => (
              <div
                key={n}
                className="h-24 rounded-xl bg-[var(--bg-surface)] border border-[var(--border)] animate-pulse p-4"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Link
              to="/student-attendance"
              className="bg-[var(--bg-surface)] border border-[var(--border)] hover:border-[var(--accent)] rounded-xl p-4 transition-colors"
            >
              <div className="flex items-center justify-between text-xs font-medium text-[var(--text-muted)]">
                <span>Attendance Rate</span>
                <CalendarCheck size={16} className="text-[var(--accent)]" />
              </div>
              <p className="text-2xl font-bold mt-2">{attendancePct}%</p>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                {dashboard?.attendanceSummary?.attended || 0} of{' '}
                {dashboard?.attendanceSummary?.totalLectures || 0} classes
              </p>
            </Link>

            <Link
              to="/quizzes"
              className="bg-[var(--bg-surface)] border border-[var(--border)] hover:border-[var(--accent)] rounded-xl p-4 transition-colors"
            >
              <div className="flex items-center justify-between text-xs font-medium text-[var(--text-muted)]">
                <span>Active Quizzes</span>
                <BookOpen size={16} className="text-[var(--accent)]" />
              </div>
              <p className="text-2xl font-bold mt-2">{dashboard?.activeQuizzes?.length || 0}</p>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                {dashboard?.stats?.quizzesCompleted || 0} completed
              </p>
            </Link>

            <Link
              to="/student-assignments"
              className="bg-[var(--bg-surface)] border border-[var(--border)] hover:border-[var(--accent)] rounded-xl p-4 transition-colors"
            >
              <div className="flex items-center justify-between text-xs font-medium text-[var(--text-muted)]">
                <span>Pending Assignments</span>
                <FileArchive size={16} className="text-[var(--accent)]" />
              </div>
              <p className="text-2xl font-bold mt-2">{dashboard?.pendingAssignments?.length || 0}</p>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                {dashboard?.stats?.assignmentsSubmitted || 0} submitted
              </p>
            </Link>

            <Link
              to="/student-lectures"
              className="bg-[var(--bg-surface)] border border-[var(--border)] hover:border-[var(--accent)] rounded-xl p-4 transition-colors"
            >
              <div className="flex items-center justify-between text-xs font-medium text-[var(--text-muted)]">
                <span>Lectures Watched</span>
                <Video size={16} className="text-[var(--accent)]" />
              </div>
              <p className="text-2xl font-bold mt-2">{dashboard?.stats?.lecturesWatched || 0}</p>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">Course video library</p>
            </Link>
          </div>
        )}

        {/* Main 2-column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Active Quizzes */}
          <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold flex items-center gap-2">
                  <BookOpen size={17} className="text-[var(--accent)]" /> Available Quizzes
                </h2>
                <Link
                  to="/quizzes"
                  className="text-xs font-semibold text-[var(--accent)] hover:underline flex items-center gap-1"
                >
                  View all <ArrowRight size={13} />
                </Link>
              </div>

              {loading ? (
                <div className="space-y-2.5">
                  {[1, 2, 3].map((n) => (
                    <div key={n} className="h-14 rounded-lg bg-[var(--bg-muted)] animate-pulse" />
                  ))}
                </div>
              ) : dashboard?.activeQuizzes?.length === 0 ? (
                <div className="py-8 text-center text-sm text-[var(--text-muted)]">
                  No pending quizzes right now.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {dashboard?.activeQuizzes?.map((q) => (
                    <div
                      key={q._id}
                      className="flex items-center justify-between gap-3 p-3 rounded-lg border border-[var(--border)] bg-[var(--bg-primary)]"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">{q.title}</p>
                        <p className="text-xs text-[var(--text-muted)] flex items-center gap-2 mt-0.5">
                          <span className="flex items-center gap-1">
                            <Clock size={12} /> {q.duration} mins
                          </span>
                          <span>· {q.totalMarks} marks</span>
                        </p>
                      </div>
                      <Link
                        to={`/quiz/attempt/${q._id}`}
                        className="btn-primary text-xs px-3 py-1.5 shrink-0"
                      >
                        {q.attemptInfo?.inProgress ? 'Resume' : 'Start'}
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Pending Assignments */}
          <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold flex items-center gap-2">
                  <FileArchive size={17} className="text-[var(--accent)]" /> Pending Assignments
                </h2>
                <Link
                  to="/student-assignments"
                  className="text-xs font-semibold text-[var(--accent)] hover:underline flex items-center gap-1"
                >
                  View all <ArrowRight size={13} />
                </Link>
              </div>

              {loading ? (
                <div className="space-y-2.5">
                  {[1, 2, 3].map((n) => (
                    <div key={n} className="h-14 rounded-lg bg-[var(--bg-muted)] animate-pulse" />
                  ))}
                </div>
              ) : dashboard?.pendingAssignments?.length === 0 ? (
                <div className="py-8 text-center text-sm text-[var(--text-muted)]">
                  All assignments are submitted.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {dashboard?.pendingAssignments?.map((a) => (
                    <div
                      key={a._id}
                      className="flex items-center justify-between gap-3 p-3 rounded-lg border border-[var(--border)] bg-[var(--bg-primary)]"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">{a.title}</p>
                        <p className="text-xs text-[var(--text-muted)] mt-0.5">
                          {a.deadline
                            ? `Due ${new Date(a.deadline).toLocaleDateString()}`
                            : 'No deadline'}{' '}
                          · {a.maxMarks || 100} marks
                        </p>
                      </div>
                      <Link
                        to="/student-assignments"
                        className="btn-secondary text-xs px-3 py-1.5 shrink-0"
                      >
                        Submit
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Recent Lectures */}
          <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold flex items-center gap-2">
                <Video size={17} className="text-[var(--accent)]" /> Recent Video Lectures
              </h2>
              <Link
                to="/student-lectures"
                className="text-xs font-semibold text-[var(--accent)] hover:underline flex items-center gap-1"
              >
                Open player <ArrowRight size={13} />
              </Link>
            </div>

            {loading ? (
              <div className="space-y-2.5">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="h-14 rounded-lg bg-[var(--bg-muted)] animate-pulse" />
                ))}
              </div>
            ) : dashboard?.recentLectures?.length === 0 ? (
              <div className="py-8 text-center text-sm text-[var(--text-muted)]">
                No lectures published yet.
              </div>
            ) : (
              <div className="space-y-2.5">
                {dashboard?.recentLectures?.map((l) => (
                  <Link
                    key={l._id}
                    to="/student-lectures"
                    className="flex items-center justify-between gap-3 p-3 rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] hover:border-[var(--accent)] transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2 rounded-lg bg-[var(--accent-subtle)] text-[var(--accent)] shrink-0">
                        <Play size={14} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">{l.title}</p>
                        <p className="text-xs text-[var(--text-muted)] truncate">
                          {l.courseModule || 'General'}
                        </p>
                      </div>
                    </div>
                    {l.watched && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 shrink-0">
                        <CheckCircle2 size={14} /> Watched
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Attendance Overview */}
          <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold flex items-center gap-2">
                  <CalendarCheck size={17} className="text-[var(--accent)]" /> Attendance Summary
                </h2>
                <Link
                  to="/student-attendance"
                  className="text-xs font-semibold text-[var(--accent)] hover:underline flex items-center gap-1"
                >
                  Full log <ArrowRight size={13} />
                </Link>
              </div>

              <div className="p-4 rounded-xl bg-[var(--bg-primary)] border border-[var(--border)] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-[var(--text-secondary)]">
                    Overall Attendance
                  </span>
                  <span className="text-sm font-bold">{attendancePct}%</span>
                </div>
                <div className="w-full h-2.5 bg-[var(--bg-muted)] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      attendancePct >= 75
                        ? 'bg-emerald-500'
                        : attendancePct >= 50
                        ? 'bg-amber-500'
                        : 'bg-rose-500'
                    }`}
                    style={{ width: `${Math.min(100, attendancePct)}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                  <span>Attended: {dashboard?.attendanceSummary?.attended || 0}</span>
                  <span>Total Held: {dashboard?.attendanceSummary?.totalLectures || 0}</span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-[var(--border)] flex items-center justify-between text-xs text-[var(--text-muted)]">
              <span>Minimum recommended attendance: 75%</span>
              <Link to="/student-notes" className="font-semibold text-[var(--accent)] hover:underline">
                Course Notes
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboardPage;
