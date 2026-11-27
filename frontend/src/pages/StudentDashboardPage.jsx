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
  Code2,
} from 'lucide-react';
import { useLiveRefresh, subscribeLiveUpdate } from '../utils/liveSync';
import { clientCache } from '../utils/clientCache';

const StudentDashboardPage = () => {
  const initialStudent = (() => {
    try {
      return JSON.parse(localStorage.getItem('studentInfo') || 'null');
    } catch {
      return null;
    }
  })();

  const [student, setStudent] = useState(initialStudent);
  const cacheKey = initialStudent?.studentId
    ? `student_dashboard_${initialStudent.studentId}`
    : null;
  const cached = cacheKey ? clientCache.get(cacheKey) : null;

  const [dashboard, setDashboard] = useState(cached);
  const [loading, setLoading] = useState(!cached);
  const navigate = useNavigate();

  const fetchDashboard = useCallback(
    async (silent = false) => {
      const hasCache = cacheKey && clientCache.has(cacheKey);
      if (!silent && !hasCache) setLoading(true);
      try {
        const stored = JSON.parse(localStorage.getItem('studentInfo') || '{}');
        const sid = stored?.studentId;
        if (!sid) return;
        const { data } = await api.get(`/student/dashboard/${sid}`);
        setDashboard(data);
        if (cacheKey) clientCache.set(cacheKey, data);
      } catch (error) {
        console.error('Failed to load student dashboard:', error);
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [cacheKey]
  );

  useEffect(() => {
    const raw = localStorage.getItem('studentInfo');
    if (!raw) {
      navigate('/');
      return;
    }
    const parsed = JSON.parse(raw);
    setStudent(parsed);
    fetchDashboard(cacheKey && clientCache.has(cacheKey) ? true : false);
  }, [navigate, fetchDashboard, cacheKey]);

  useEffect(() => {
    const unsubscribe = subscribeLiveUpdate((event) => {
      if (event?.type === 'STUDENT_PROFILE_UPDATED' && event.payload) {
        setStudent((prev) => ({ ...prev, ...event.payload }));
      }
    });
    return unsubscribe;
  }, []);

  useLiveRefresh(fetchDashboard, 12000, [
    'ATTENDANCE_UPDATED',
    'ASSIGNMENT_GRADED',
    'ASSIGNMENT_SUBMITTED',
    'ASSIGNMENT_SUBMISSION_DELETED',
    'QUIZ_SUBMITTED',
    'QUIZ_PUBLISHED',
    'QUIZ_RESULT_DELETED',
    'STUDENT_PROFILE_UPDATED',
  ]);

  const attendancePct = dashboard?.attendanceSummary?.percentage || 0;

  return (
    <div className="student-portal min-h-screen pb-14">
      <StudentNavbar student={student} />

      <main className="lg:pl-60">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8 space-y-6">
          {/* Welcome Overview Card */}
          <div className="card p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)]">
                Welcome, {student?.fullName || 'Student'}
              </h1>
              <p className="text-sm text-[var(--text-secondary)] mt-1">
                Student ID:{' '}
                <span className="font-mono font-semibold text-[var(--text-primary)]">
                  {student?.studentId}
                </span>
                {student?.campus ? ` · ${student.campus}` : ''}
                {student?.batch ? ` (${student.batch})` : ''}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                to="/practice-ide"
                className="btn-secondary flex items-center gap-1.5 text-xs py-2 px-3.5"
              >
                <Code2 size={15} /> Practice IDE
              </Link>
              <Link
                to="/student-lectures"
                className="btn-secondary flex items-center gap-1.5 text-xs py-2 px-3.5"
              >
                <Video size={15} /> Video Lectures
              </Link>
              <Link
                to="/quizzes"
                className="btn-primary flex items-center gap-1.5 text-xs py-2 px-3.5"
              >
                <BookOpen size={15} /> Open Quizzes
              </Link>
            </div>
          </div>

          {/* Academic Metric Summary Row */}
          {loading ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((n) => (
                <div
                  key={n}
                  className="h-24 rounded-md bg-[var(--bg-surface)] border border-[var(--border)] animate-pulse p-4"
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Link
                to="/student-attendance"
                className="card p-4 hover:border-[var(--brand-secondary)] transition-colors"
              >
                <div className="flex items-center justify-between text-xs font-medium text-[var(--text-secondary)]">
                  <span>Attendance Rate</span>
                  <CalendarCheck size={16} className="text-[var(--accent)]" />
                </div>
                <p className="text-2xl font-bold mt-2 text-[var(--text-primary)]">
                  {attendancePct}%
                </p>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  {dashboard?.attendanceSummary?.attended || 0} of{' '}
                  {dashboard?.attendanceSummary?.totalLectures || 0} sessions
                </p>
              </Link>

              <Link
                to="/quizzes"
                className="card p-4 hover:border-[var(--brand-secondary)] transition-colors"
              >
                <div className="flex items-center justify-between text-xs font-medium text-[var(--text-secondary)]">
                  <span>Available Quizzes</span>
                  <BookOpen size={16} className="text-[var(--accent)]" />
                </div>
                <p className="text-2xl font-bold mt-2 text-[var(--text-primary)]">
                  {dashboard?.activeQuizzes?.length || 0}
                </p>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  {dashboard?.stats?.quizzesCompleted || 0} completed
                </p>
              </Link>

              <Link
                to="/student-assignments"
                className="card p-4 hover:border-[var(--brand-secondary)] transition-colors"
              >
                <div className="flex items-center justify-between text-xs font-medium text-[var(--text-secondary)]">
                  <span>Pending Assignments</span>
                  <FileArchive size={16} className="text-[var(--accent)]" />
                </div>
                <p className="text-2xl font-bold mt-2 text-[var(--text-primary)]">
                  {dashboard?.pendingAssignments?.length || 0}
                </p>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  {dashboard?.stats?.assignmentsSubmitted || 0} submitted
                </p>
              </Link>

              <Link
                to="/student-lectures"
                className="card p-4 hover:border-[var(--brand-secondary)] transition-colors"
              >
                <div className="flex items-center justify-between text-xs font-medium text-[var(--text-secondary)]">
                  <span>Lectures Completed</span>
                  <Video size={16} className="text-[var(--accent)]" />
                </div>
                <p className="text-2xl font-bold mt-2 text-[var(--text-primary)]">
                  {dashboard?.stats?.lecturesWatched || 0}
                </p>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  Recorded course archive
                </p>
              </Link>
            </div>
          )}

          {/* Main 2-Column Academic Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Available Quizzes */}
            <div className="card p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-[var(--border)]">
                  <h2 className="text-sm sm:text-base font-bold flex items-center gap-2">
                    <BookOpen size={16} className="text-[var(--accent)]" /> Available Quizzes
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
                      <div key={n} className="h-14 rounded bg-[var(--bg-muted)] animate-pulse" />
                    ))}
                  </div>
                ) : dashboard?.activeQuizzes?.length === 0 ? (
                  <div className="py-8 text-center text-sm text-[var(--text-secondary)]">
                    No pending quizzes right now.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {dashboard?.activeQuizzes?.map((q) => (
                      <div
                        key={q._id}
                        className="flex items-center justify-between gap-3 p-3 rounded-md border border-[var(--border)] bg-[var(--bg-primary)]"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate">{q.title}</p>
                          <p className="text-xs text-[var(--text-secondary)] flex items-center gap-2 mt-0.5">
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
            <div className="card p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-[var(--border)]">
                  <h2 className="text-sm sm:text-base font-bold flex items-center gap-2">
                    <FileArchive size={16} className="text-[var(--accent)]" /> Pending Assignments
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
                      <div key={n} className="h-14 rounded bg-[var(--bg-muted)] animate-pulse" />
                    ))}
                  </div>
                ) : dashboard?.pendingAssignments?.length === 0 ? (
                  <div className="py-8 text-center text-sm text-[var(--text-secondary)]">
                    All assignments are submitted.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {dashboard?.pendingAssignments?.map((a) => (
                      <div
                        key={a._id}
                        className="flex items-center justify-between gap-3 p-3 rounded-md border border-[var(--border)] bg-[var(--bg-primary)]"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate">{a.title}</p>
                          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                            {a.deadline
                              ? `Due ${new Date(a.deadline).toLocaleDateString()}`
                              : 'Open submission'}{' '}
                            · {a.maxMarks || 100} marks
                          </p>
                        </div>
                        <Link
                          to="/student-assignments"
                          className="btn-secondary text-xs px-3 py-1.5 shrink-0"
                        >
                          Open
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Recent Video Lectures */}
            <div className="card p-5">
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-[var(--border)]">
                <h2 className="text-sm sm:text-base font-bold flex items-center gap-2">
                  <Video size={16} className="text-[var(--accent)]" /> Recent Video Lectures
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
                    <div key={n} className="h-14 rounded bg-[var(--bg-muted)] animate-pulse" />
                  ))}
                </div>
              ) : dashboard?.recentLectures?.length === 0 ? (
                <div className="py-8 text-center text-sm text-[var(--text-secondary)]">
                  No lectures published yet.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {dashboard?.recentLectures?.map((l) => (
                    <Link
                      key={l._id}
                      to="/student-lectures"
                      className="flex items-center justify-between gap-3 p-3 rounded-md border border-[var(--border)] bg-[var(--bg-primary)] hover:border-[var(--brand-secondary)] transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2 rounded bg-[var(--accent-subtle)] text-[var(--accent)] shrink-0">
                          <Play size={13} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate">{l.title}</p>
                          <p className="text-xs text-[var(--text-secondary)] truncate">
                            {l.courseModule || 'General'}
                          </p>
                        </div>
                      </div>
                      {l.watched && (
                        <span className="academic-badge academic-badge-success shrink-0">
                          <CheckCircle2 size={12} /> Watched
                        </span>
                      )}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Attendance Summary */}
            <div className="card p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-[var(--border)]">
                  <h2 className="text-sm sm:text-base font-bold flex items-center gap-2">
                    <CalendarCheck size={16} className="text-[var(--accent)]" /> Attendance Summary
                  </h2>
                  <Link
                    to="/student-attendance"
                    className="text-xs font-semibold text-[var(--accent)] hover:underline flex items-center gap-1"
                  >
                    Full log <ArrowRight size={13} />
                  </Link>
                </div>

                <div className="p-4 rounded-md bg-[var(--bg-primary)] border border-[var(--border)] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-[var(--text-secondary)]">
                      Cumulative Attendance
                    </span>
                    <span className="text-sm font-bold text-[var(--text-primary)]">
                      {attendancePct}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-[var(--bg-muted)] rounded-sm overflow-hidden">
                    <div
                      className="h-full transition-all duration-300"
                      style={{
                        width: `${Math.min(100, attendancePct)}%`,
                        backgroundColor:
                          attendancePct >= 75
                            ? 'var(--status-success)'
                            : attendancePct >= 50
                            ? 'var(--status-warning)'
                            : 'var(--status-danger)',
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
                    <span>Attended: {dashboard?.attendanceSummary?.attended || 0}</span>
                    <span>Total Held: {dashboard?.attendanceSummary?.totalLectures || 0}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-[var(--border)] flex items-center justify-between text-xs text-[var(--text-secondary)]">
                <span>Recommended academic standing: 75%+</span>
                <Link
                  to="/student-notes"
                  className="font-semibold text-[var(--accent)] hover:underline"
                >
                  Course Notes
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default StudentDashboardPage;
