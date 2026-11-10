import React, { useState, useEffect } from 'react';
import API from '../api';
import Navbar from '../components/AdminNavbar';
import {
  Plus,
  Trash2,
  Edit,
  FileQuestion,
  Users,
  Award,
  BookOpen,
  Eye,
  EyeOff,
  Copy,
  Globe,
  Lock,
  X,
  Video,
  CalendarCheck,
  FileArchive,
  MapPin,
  Upload,
  ArrowRight,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

const AdminDashboard = () => {
  const [quizzes, setQuizzes] = useState([]);
  const [stats, setStats] = useState({
    totalQuizzes: 0,
    totalAttempts: 0,
    totalStudents: 0,
    totalLectures: 0,
    totalAttendanceSessions: 0,
    totalAssignments: 0,
  });
  const [studentsData, setStudentsData] = useState([]);
  const [resultsData, setResultsData] = useState([]);
  const [meta, setMeta] = useState({ campuses: [], batches: [] });
  const [loading, setLoading] = useState(true);

  // Duplicate quiz modal state
  const [duplicatingQuiz, setDuplicatingQuiz] = useState(null);
  const [dupForm, setDupForm] = useState({ title: '', campus: '', batch: '', isPublished: false });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [quizRes, resultRes, studentRes, metaRes, lectureRes, attendanceRes, assignmentRes] =
          await Promise.all([
            API.get('/quizzes'),
            API.get('/admin/results'),
            API.get('/admin/students'),
            API.get('/admin/students/meta'),
            API.get('/lectures').catch(() => ({ data: [] })),
            API.get('/attendance/sessions').catch(() => ({ data: [] })),
            API.get('/assignments').catch(() => ({ data: [] })),
          ]);
        setQuizzes(quizRes.data);
        setResultsData(resultRes.data);
        setStudentsData(studentRes.data);
        setMeta({
          campuses: metaRes.data.campuses || [],
          batches: metaRes.data.batches || [],
        });
        setStats({
          totalQuizzes: quizRes.data.length,
          totalAttempts: resultRes.data.length,
          totalStudents: studentRes.data.length,
          totalLectures: (lectureRes.data || []).length,
          totalAttendanceSessions: (attendanceRes.data || []).length,
          totalAssignments: (assignmentRes.data || []).length,
        });
      } catch {
        toast.error('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this quiz and all its questions?')) return;
    try {
      await API.delete(`/quizzes/${id}`);
      setQuizzes(quizzes.filter((q) => q._id !== id));
      toast.success('Quiz deleted');
    } catch {
      toast.error('Delete failed');
    }
  };

  const toggleRelease = async (id, currentStatus) => {
    try {
      await API.put(`/quizzes/${id}`, { resultsReleased: !currentStatus });
      setQuizzes(quizzes.map((q) => (q._id === id ? { ...q, resultsReleased: !currentStatus } : q)));
      toast.success(!currentStatus ? 'Results released to students' : 'Results hidden from students');
    } catch {
      toast.error('Update failed');
    }
  };

  const togglePublish = async (id, currentPublished) => {
    const nextState = currentPublished === false ? true : false;
    try {
      await API.put(`/quizzes/${id}`, { isPublished: nextState });
      setQuizzes(quizzes.map((q) => (q._id === id ? { ...q, isPublished: nextState } : q)));
      toast.success(nextState ? 'Quiz published' : 'Quiz unpublished');
    } catch {
      toast.error('Failed to toggle publish state');
    }
  };

  const openDuplicateModal = (quiz) => {
    setDuplicatingQuiz(quiz);
    setDupForm({
      title: `${quiz.title} (Copy)`,
      campus: quiz.campus || '',
      batch: quiz.batch || '',
      isPublished: false,
    });
  };

  const handleConfirmDuplicate = async (e) => {
    e.preventDefault();
    if (!duplicatingQuiz) return;
    try {
      const { data } = await API.post(`/quizzes/${duplicatingQuiz._id}/duplicate`, dupForm);
      setQuizzes([data, ...quizzes]);
      setDuplicatingQuiz(null);
      toast.success('Quiz duplicated with all questions');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to duplicate quiz');
    }
  };

  const moduleShortcuts = [
    {
      title: 'Students & Bulk Import',
      description: 'Upload Excel/CSV, auto-generate passwords, & send bulk credential emails',
      path: '/admin/manage-students',
      icon: Users,
      stat: `${stats.totalStudents} Students`,
    },
    {
      title: 'Video Lectures & Player',
      description: 'Publish YouTube/Google Drive lectures, modules, and course resources',
      path: '/admin/manage-lectures',
      icon: Video,
      stat: `${stats.totalLectures} Lectures`,
    },
    {
      title: 'Lecture-Wise Attendance',
      description: 'Create class sessions, mark bulk attendance, and export Excel reports',
      path: '/admin/manage-attendance',
      icon: CalendarCheck,
      stat: `${stats.totalAttendanceSessions} Sessions`,
    },
    {
      title: 'Assignments & Grading',
      description: 'Create assignments, track late status, and grade with marks & feedback',
      path: '/admin/manage-assignments',
      icon: FileArchive,
      stat: `${stats.totalAssignments} Assignments`,
    },
    {
      title: 'Campuses & Batches',
      description: 'Manage campus locations and batch cohorts for student & quiz targeting',
      path: '/admin/manage-campuses',
      icon: MapPin,
      stat: `${meta.campuses.length} Campuses`,
    },
    {
      title: 'Quiz Results & Export',
      description: 'Filter student quiz scores by campus/batch and export to Excel',
      path: '/admin/results',
      icon: Award,
      stat: `${stats.totalAttempts} Submissions`,
    },
  ];

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <Navbar />
      <main className="flex-1 lg:ml-64 p-4 sm:p-6 lg:p-8">
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Admin Dashboard</h1>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              Manage students, bulk imports, quizzes, video lectures, attendance, and assignments
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              to="/admin/manage-students"
              className="btn-secondary flex items-center justify-center gap-2 text-xs sm:text-sm py-2.5 px-4"
            >
              <Upload size={16} /> Bulk Import Students
            </Link>
            <Link
              to="/admin/create-quiz"
              className="btn-primary flex items-center justify-center gap-2 text-xs sm:text-sm py-2.5 px-4"
            >
              <Plus size={16} /> Create Quiz
            </Link>
          </div>
        </header>

        {/* Top Stat Summary Row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <StatCard title="Students" value={stats.totalStudents} icon={Users} />
          <StatCard title="Quizzes" value={stats.totalQuizzes} icon={BookOpen} />
          <StatCard title="Quiz Attempts" value={stats.totalAttempts} icon={Award} />
          <StatCard title="Video Lectures" value={stats.totalLectures} icon={Video} />
          <StatCard title="Attendance" value={stats.totalAttendanceSessions} icon={CalendarCheck} />
          <StatCard title="Assignments" value={stats.totalAssignments} icon={FileArchive} />
        </div>

        {/* LMS Quick Access Modules */}
        <div className="mb-8">
          <h2 className="text-base font-bold mb-3">LMS Management Modules</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {moduleShortcuts.map((mod) => {
              const Icon = mod.icon;
              return (
                <Link
                  key={mod.path}
                  to={mod.path}
                  className="card p-5 hover:border-[var(--accent)] transition-colors flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="p-2.5 rounded-lg bg-[var(--accent-subtle)] text-[var(--accent)]">
                        <Icon size={20} />
                      </div>
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[var(--bg-muted)] text-[var(--text-secondary)]">
                        {mod.stat}
                      </span>
                    </div>
                    <h3 className="font-bold text-sm text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors">
                      {mod.title}
                    </h3>
                    <p className="text-xs text-[var(--text-muted)] mt-1 leading-relaxed">
                      {mod.description}
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-[var(--border)] flex items-center justify-between text-xs font-semibold text-[var(--accent)]">
                    <span>Open Module</span>
                    <ArrowRight size={14} />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Campus Breakdown */}
        <div className="mb-8">
          <h2 className="text-base font-bold mb-4">Campus Overview</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...new Set(studentsData.map((s) => s.campus))].filter(Boolean).map((campus) => {
              const campusStudents = studentsData.filter((s) => s.campus === campus);
              const campusStudentIds = new Set(campusStudents.map((s) => s.studentId));
              const campusResults = resultsData.filter(
                (r) => campusStudentIds.has(r.studentId) || r.campus === campus
              );

              const avgScore = campusResults.length
                ? (
                    campusResults.reduce((sum, r) => sum + Number(r.percentage || 0), 0) /
                    campusResults.length
                  ).toFixed(1)
                : 0;

              return (
                <div key={campus} className="card p-5">
                  <h3 className="font-bold text-sm mb-3 truncate">{campus}</h3>
                  <div className="flex justify-between items-center text-xs mb-1.5">
                    <span className="text-[var(--text-secondary)]">Students</span>
                    <span className="font-bold">{campusStudents.length}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-[var(--text-secondary)]">Avg Quiz Score</span>
                    <span className="font-bold text-[var(--accent)]">{avgScore}%</span>
                  </div>
                </div>
              );
            })}
            {studentsData.length === 0 && !loading && (
              <p className="text-xs text-[var(--text-muted)]">No campus metrics yet.</p>
            )}
          </div>
        </div>

        {/* Quiz Catalog */}
        <div className="card p-0 overflow-hidden">
          <div className="p-5 border-b border-[var(--border)] flex justify-between items-center">
            <div>
              <h2 className="text-base font-bold">Quizzes & Bulk MCQ Management</h2>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Click the Questions icon on any quiz to bulk upload MCQs via Excel/CSV
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[var(--accent-subtle)] text-[var(--accent)]">
              {quizzes.length} Total
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[var(--bg-muted)] text-[var(--text-secondary)] text-xs font-semibold uppercase tracking-wider border-b border-[var(--border)]">
                <tr>
                  <th className="px-5 py-3.5">Quiz</th>
                  <th className="px-5 py-3.5">Target</th>
                  <th className="px-5 py-3.5">Config</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {quizzes.map((quiz) => (
                  <tr key={quiz._id} className="hover:bg-[var(--bg-muted)]/40 transition-colors">
                    <td className="px-5 py-4">
                      <p className="font-bold text-[var(--text-primary)]">{quiz.title}</p>
                      <p className="text-xs text-[var(--text-secondary)] line-clamp-1 max-w-xs">
                        {quiz.description}
                      </p>
                    </td>
                    <td className="px-5 py-4 text-xs">
                      <p className="font-medium">{quiz.campus || 'All Campuses'}</p>
                      <p className="text-[var(--text-secondary)]">{quiz.batch || 'All Batches'}</p>
                    </td>
                    <td className="px-5 py-4 text-xs">
                      <p className="font-medium">
                        {quiz.duration} min • {quiz.totalMarks} marks
                      </p>
                      <p className="text-[var(--text-secondary)]">
                        {quiz.questionCount ?? '—'} Qs • {quiz.attemptCount ?? 0} Submissions •{' '}
                        {quiz.attemptsAllowed || 1} Attempt(s)
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-col gap-1">
                        <span
                          className={`inline-flex items-center gap-1 w-fit px-2 py-0.5 rounded-full text-[11px] font-medium ${
                            quiz.isPublished !== false
                              ? 'bg-emerald-500/10 text-emerald-600'
                              : 'bg-amber-500/10 text-amber-600'
                          }`}
                        >
                          {quiz.isPublished !== false ? 'Published' : 'Draft'}
                        </span>
                        <span className="text-[11px] text-[var(--text-muted)]">
                          Results: {quiz.resultsReleased ? 'Released' : 'Hidden'}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => togglePublish(quiz._id, quiz.isPublished)}
                          className="p-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--accent)] hover:bg-[var(--bg-muted)]"
                          title={quiz.isPublished !== false ? 'Unpublish Quiz' : 'Publish Quiz'}
                        >
                          {quiz.isPublished !== false ? <Globe size={16} /> : <Lock size={16} />}
                        </button>
                        <button
                          onClick={() => toggleRelease(quiz._id, quiz.resultsReleased)}
                          className={`p-2 rounded-lg hover:bg-[var(--bg-muted)] ${
                            quiz.resultsReleased ? 'text-emerald-600' : 'text-[var(--text-secondary)]'
                          }`}
                          title={quiz.resultsReleased ? 'Hide Results' : 'Release Results'}
                        >
                          {quiz.resultsReleased ? <Eye size={16} /> : <EyeOff size={16} />}
                        </button>
                        <button
                          onClick={() => openDuplicateModal(quiz)}
                          className="p-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--accent)] hover:bg-[var(--bg-muted)]"
                          title="Duplicate Quiz for Another Campus/Batch"
                        >
                          <Copy size={16} />
                        </button>
                        <Link
                          to={`/admin/manage-questions/${quiz._id}`}
                          className="p-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--accent)] hover:bg-[var(--bg-muted)]"
                          title="Manage & Bulk Upload Questions"
                        >
                          <FileQuestion size={16} />
                        </Link>
                        <Link
                          to={`/admin/edit-quiz/${quiz._id}`}
                          className="p-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--accent)] hover:bg-[var(--bg-muted)]"
                          title="Edit Quiz"
                        >
                          <Edit size={16} />
                        </Link>
                        <button
                          onClick={() => handleDelete(quiz._id)}
                          className="p-2 rounded-lg text-[var(--text-secondary)] hover:text-rose-600 hover:bg-[var(--bg-muted)]"
                          title="Delete Quiz"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {quizzes.length === 0 && !loading && (
            <div className="p-14 text-center">
              <FileQuestion className="mx-auto text-[var(--text-muted)] mb-3" size={40} />
              <p className="font-semibold text-base">No quizzes created yet</p>
              <p className="text-xs text-[var(--text-secondary)] mt-1">
                Create your first quiz to get started.
              </p>
            </div>
          )}
        </div>

        {/* Duplicate Quiz Modal */}
        {duplicatingQuiz && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <form onSubmit={handleConfirmDuplicate} className="card max-w-md w-full p-6 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold">Duplicate Quiz</h3>
                <button type="button" onClick={() => setDuplicatingQuiz(null)}>
                  <X size={18} />
                </button>
              </div>
              <p className="text-xs text-[var(--text-secondary)]">
                Clones <strong>{duplicatingQuiz.title}</strong> and all its questions so you can assign it to another campus or batch.
              </p>
              <div>
                <label className="block text-xs font-semibold uppercase mb-1">New Quiz Title *</label>
                <input
                  type="text"
                  className="input-field"
                  value={dupForm.title}
                  onChange={(e) => setDupForm({ ...dupForm, title: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase mb-1">Target Campus</label>
                <select
                  className="input-field"
                  value={dupForm.campus}
                  onChange={(e) => setDupForm({ ...dupForm, campus: e.target.value })}
                >
                  <option value="">All Campuses</option>
                  {meta.campuses.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase mb-1">Target Batch</label>
                <select
                  className="input-field"
                  value={dupForm.batch}
                  onChange={(e) => setDupForm({ ...dupForm, batch: e.target.value })}
                >
                  <option value="">All Batches</option>
                  {meta.batches.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={dupForm.isPublished}
                  onChange={(e) => setDupForm({ ...dupForm, isPublished: e.target.checked })}
                />
                <span>Publish immediately</span>
              </label>
              <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border)]">
                <button type="button" onClick={() => setDuplicatingQuiz(null)} className="btn-secondary text-xs">
                  Cancel
                </button>
                <button type="submit" className="btn-primary text-xs">
                  Duplicate Quiz
                </button>
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  );
};

// eslint-disable-next-line no-unused-vars
const StatCard = ({ title, value, icon: Icon }) => (
  <div className="card p-4 flex items-center gap-3">
    <div className="p-2.5 rounded-lg bg-[var(--accent-subtle)] text-[var(--accent)] shrink-0">
      <Icon size={20} />
    </div>
    <div className="min-w-0">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-secondary)] truncate">
        {title}
      </p>
      <p className="text-xl font-bold mt-0.5">{value}</p>
    </div>
  </div>
);

export default AdminDashboard;
