import React, { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import API from '../api';
import Navbar from '../components/AdminNavbar';
import {
  Search,
  Filter,
  Download,
  Users,
  Trash2,
  AlertTriangle,
  X,
  CheckCircle2,
  Clock,
  Eye,
  FileCheck,
  Code2,
  Play,
  RotateCcw,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { broadcastLiveUpdate } from '../utils/liveSync';

function buildPreviewDocument(code, lang) {
  if (lang === 'react') {
    return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
    <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>body { font-family: sans-serif; padding: 12px; margin: 0; background: #fff; color: #111; }</style>
  </head>
  <body>
    <div id="root"></div>
    <script type="text/babel">
      try {
        ${code || ''}
        if (typeof App !== 'undefined') {
          ReactDOM.createRoot(document.getElementById('root')).render(<App />);
        }
      } catch(e) {
        document.getElementById('root').innerHTML = '<div style="color:red;font-family:monospace;padding:10px;">Runtime Error: ' + e.message + '</div>';
      }
    </script>
  </body>
</html>`;
  }
  if (lang === 'javascript') {
    return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>body { font-family: monospace; padding: 12px; margin: 0; background: #0f172a; color: #4ade80; white-space: pre-wrap; font-size: 13px; line-height: 1.5; }</style>
  </head>
  <body>
    <div id="log"></div>
    <script>
      const logEl = document.getElementById('log');
      const log = (...args) => { logEl.innerText += args.join(' ') + '\\n'; };
      console.log = log;
      console.error = (...args) => { logEl.innerHTML += '<span style="color:#f87171;">' + args.join(' ') + '</span>\\n'; };
      try {
        ${code || ''}
      } catch(e) {
        console.error('Error: ' + e.message);
      }
    </script>
  </body>
</html>`;
  }
  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <style>body { font-family: sans-serif; margin: 0; padding: 12px; box-sizing: border-box; }</style>
  </head>
  <body>
    ${code || ''}
  </body>
</html>`;
}

const AdminResultsPage = () => {
  const [results, setResults] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [filter, setFilter] = useState({ quizId: '', studentId: '', campus: '', batch: '' });
  const [meta, setMeta] = useState({ campuses: [], batches: [] });
  const [loading, setLoading] = useState(true);
  const [deletingResult, setDeletingResult] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Manual Grading Studio states
  const [gradingResult, setGradingResult] = useState(null);
  const [gradingLoading, setGradingLoading] = useState(false);
  const [savingGrades, setSavingGrades] = useState(false);
  const [gradeAnswers, setGradeAnswers] = useState({});
  const [codeTabs, setCodeTabs] = useState({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [rRes, qRes, mRes] = await Promise.all([
          API.get('/admin/results'),
          API.get('/quizzes'),
          API.get('/admin/students/meta'),
        ]);
        setResults(rRes.data);
        setQuizzes(qRes.data);
        setMeta(mRes.data);
      } catch {
        toast.error('Failed to load results');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleFilter = async () => {
    setLoading(true);
    try {
      const { data } = await API.get('/admin/results', { params: filter });
      setResults(data);
    } catch {
      toast.error('Search failed');
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = () => {
    if (results.length === 0) {
      toast.error('No results to export');
      return;
    }
    const rows = results.map((r) => ({
      'Student Name': r.studentName,
      'Student ID': r.studentId,
      Campus: r.campus || '',
      Batch: r.batch || '',
      'Quiz Title': r.quizId?.title || 'Deleted Quiz',
      'Attempt #': r.attemptNo || 1,
      Score: r.score,
      'Total Marks': r.totalPossibleMarks,
      'Percentage (%)': r.percentage,
      Status: r.gradingStatus === 'pending_manual_grading' ? 'Pending Review' : 'Graded',
      'Submitted At': r.submittedAt ? new Date(r.submittedAt).toLocaleString() : '',
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Quiz Results');
    XLSX.writeFile(wb, `quiz_results_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handleOpenGrading = async (res) => {
    setGradingLoading(true);
    try {
      const { data } = await API.get(`/admin/results/${res._id}`);
      setGradingResult(data);
      const initialMap = {};
      const initialTabs = {};
      (data.answers || []).forEach((a) => {
        const qId = a.questionId?._id || a.questionId;
        initialMap[qId] = {
          marksObtained: a.marksObtained ?? (a.isCorrect ? (a.questionId?.marks || 1) : 0),
          teacherRemarks: a.teacherRemarks || '',
        };
        initialTabs[qId] = 'code';
      });
      setGradeAnswers(initialMap);
      setCodeTabs(initialTabs);
    } catch {
      toast.error('Failed to load quiz attempt details');
    } finally {
      setGradingLoading(false);
    }
  };

  const handleSaveGrades = async () => {
    if (!gradingResult) return;
    setSavingGrades(true);
    try {
      const payload = Object.entries(gradeAnswers).map(([qId, val]) => ({
        questionId: qId,
        marksObtained: Number(val.marksObtained) || 0,
        teacherRemarks: val.teacherRemarks || '',
      }));

      const { data } = await API.put(`/admin/results/${gradingResult._id}/grade`, {
        gradedAnswers: payload,
      });

      setResults((prev) =>
        prev.map((r) =>
          r._id === gradingResult._id
            ? {
                ...r,
                score: data.result.score,
                percentage: data.result.percentage,
                gradingStatus: 'graded',
              }
            : r
        )
      );

      toast.success('Grades saved and published successfully!');
      broadcastLiveUpdate('QUIZ_RESULT_GRADED', {
        resultId: gradingResult._id,
        score: data.result.score,
        percentage: data.result.percentage,
      });
      setGradingResult(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save grades');
    } finally {
      setSavingGrades(false);
    }
  };

  const handleDeleteQuizResult = async () => {
    if (!deletingResult) return;
    setDeleting(true);
    try {
      await API.delete(`/admin/results/${deletingResult._id}`);
      setResults((prev) => prev.filter((r) => r._id !== deletingResult._id));
      toast.success(
        `Deleted attempt for ${deletingResult.studentName}. Student can now re-attempt the quiz.`
      );
      broadcastLiveUpdate('QUIZ_RESULT_DELETED', {
        resultId: deletingResult._id,
        studentId: deletingResult.studentId,
        quizId: deletingResult.quizId?._id || deletingResult.quizId,
      });
      setDeletingResult(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete quiz result');
    } finally {
      setDeleting(false);
    }
  };

  const calculatedGradeSummary = useMemo(() => {
    if (!gradingResult || !gradingResult.answers) return { score: 0, percentage: 0 };
    let score = 0;
    gradingResult.answers.forEach((ans) => {
      const qId = ans.questionId?._id || ans.questionId;
      const g = gradeAnswers[qId];
      if (g) {
        score += Number(g.marksObtained) || 0;
      } else {
        score += ans.marksObtained || 0;
      }
    });
    const totalPossibleMarks = gradingResult.totalPossibleMarks || 1;
    const percentage = Number(((score / totalPossibleMarks) * 100).toFixed(2));
    return { score: Number(score.toFixed(2)), percentage };
  }, [gradingResult, gradeAnswers]);

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      <Navbar />
      <main className="flex-1 lg:ml-64 p-4 sm:p-6 lg:p-8">
        <header className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Quiz Results</h1>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              Filter and export student quiz performance across campuses and batches
            </p>
          </div>
          <button
            onClick={handleExportExcel}
            className="btn-secondary flex items-center gap-2 text-sm py-2.5 px-4"
          >
            <Download size={16} /> Export Excel (.xlsx)
          </button>
        </header>

        <div className="card p-5 mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
          <div>
            <label className="block text-xs font-semibold uppercase mb-1 text-[var(--text-secondary)]">
              Student ID
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={16} />
              <input
                className="input-field pl-9 py-2 text-sm"
                placeholder="e.g. BQ-WD-001"
                value={filter.studentId}
                onChange={(e) => setFilter({ ...filter, studentId: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase mb-1 text-[var(--text-secondary)]">
              Quiz
            </label>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={16} />
              <select
                className="input-field pl-9 py-2 text-sm"
                value={filter.quizId}
                onChange={(e) => setFilter({ ...filter, quizId: e.target.value })}
              >
                <option value="">All Quizzes</option>
                {quizzes.map((q) => (
                  <option key={q._id} value={q._id}>
                    {q.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase mb-1 text-[var(--text-secondary)]">
              Campus
            </label>
            <select
              className="input-field py-2 text-sm"
              value={filter.campus}
              onChange={(e) => setFilter({ ...filter, campus: e.target.value })}
            >
              <option value="">All Campuses</option>
              {meta.campuses?.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase mb-1 text-[var(--text-secondary)]">
              Batch
            </label>
            <select
              className="input-field py-2 text-sm"
              value={filter.batch}
              onChange={(e) => setFilter({ ...filter, batch: e.target.value })}
            >
              <option value="">All Batches</option>
              {meta.batches?.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          <button onClick={handleFilter} className="btn-primary py-2.5 text-sm">
            Apply Filters
          </button>
        </div>

        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[var(--bg-muted)] text-[var(--text-secondary)] text-xs font-semibold uppercase tracking-wider border-b border-[var(--border)]">
                <tr>
                  <th className="px-5 py-3.5">Student</th>
                  <th className="px-5 py-3.5">Campus / Batch</th>
                  <th className="px-5 py-3.5">Quiz</th>
                  <th className="px-5 py-3.5">Attempt</th>
                  <th className="px-5 py-3.5">Score</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Submitted</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {results.map((res) => (
                  <tr key={res._id} className="hover:bg-[var(--bg-muted)]/40 transition-colors">
                    <td className="px-5 py-3.5">
                      <p className="font-semibold">{res.studentName}</p>
                      <p className="text-xs font-mono text-[var(--text-secondary)]">{res.studentId}</p>
                    </td>
                    <td className="px-5 py-3.5 text-xs">
                      <p className="font-medium">{res.campus || '—'}</p>
                      <p className="text-[var(--text-secondary)]">{res.batch || '—'}</p>
                    </td>
                    <td className="px-5 py-3.5 font-medium">
                      {res.quizId?.title || 'Deleted Quiz'}
                    </td>
                    <td className="px-5 py-3.5 text-xs font-mono">
                      #{res.attemptNo || 1}
                    </td>
                    <td className="px-5 py-3.5 font-mono font-semibold">
                      <span className={res.percentage >= 50 ? 'text-emerald-600' : 'text-rose-600'}>
                        {res.score} / {res.totalPossibleMarks}
                      </span>
                      <span className="block text-[11px] font-normal text-[var(--text-muted)]">
                        {res.percentage}%
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      {res.gradingStatus === 'pending_manual_grading' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-600 border border-amber-500/30">
                          <Clock size={12} /> Needs Grading
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-600 border border-emerald-500/30">
                          <CheckCircle2 size={12} /> Graded
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-[var(--text-secondary)]">
                      {res.submittedAt ? new Date(res.submittedAt).toLocaleString() : '—'}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenGrading(res)}
                          className="py-1 px-2.5 rounded-lg text-blue-600 hover:bg-blue-500/10 transition-colors inline-flex items-center gap-1 text-xs font-semibold"
                          title="Review & Grade Student Answers"
                        >
                          <FileCheck size={14} />
                          <span>Review & Grade</span>
                        </button>
                        <button
                          onClick={() => setDeletingResult(res)}
                          className="py-1 px-2 rounded-lg text-rose-500 hover:bg-rose-500/10 hover:text-rose-600 transition-colors inline-flex items-center gap-1 text-xs font-semibold"
                          title="Delete Quiz Attempt"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {results.length === 0 && !loading && (
            <div className="p-14 text-center">
              <Users className="mx-auto text-[var(--text-muted)] mb-3" size={40} />
              <p className="text-sm text-[var(--text-secondary)]">No quiz results match the selected criteria.</p>
            </div>
          )}
        </div>

        {/* Delete Confirmation Modal with Safety Checks */}
        {deletingResult && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="card max-w-md w-full p-6 shadow-2xl border border-[var(--border)] bg-[var(--bg-surface)] relative">
              <button
                onClick={() => !deleting && setDeletingResult(null)}
                className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                disabled={deleting}
              >
                <X size={18} />
              </button>

              <div className="flex items-start gap-3.5 mb-4">
                <div className="w-10 h-10 rounded-xl bg-rose-500/15 text-rose-600 flex items-center justify-center shrink-0">
                  <AlertTriangle size={22} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[var(--text-primary)]">
                    Delete Quiz Attempt?
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                    Permanent database deletion action
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[var(--bg-muted)] border border-[var(--border)] mb-4 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-[var(--text-secondary)]">Student:</span>
                  <span className="font-semibold text-[var(--text-primary)]">
                    {deletingResult.studentName} ({deletingResult.studentId})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-secondary)]">Quiz:</span>
                  <span className="font-medium text-[var(--text-primary)]">
                    {deletingResult.quizId?.title || 'Quiz'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-secondary)]">Attempt #:</span>
                  <span className="font-mono">{deletingResult.attemptNo || 1}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-secondary)]">Current Score:</span>
                  <span className="font-bold text-rose-600">
                    {deletingResult.score} / {deletingResult.totalPossibleMarks} ({deletingResult.percentage}%)
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-700 dark:text-amber-300 mb-5 leading-relaxed">
                <strong>Extra Check & Effect:</strong> Deleting this attempt removes it completely from MongoDB. The student will immediately be able to take this quiz again from their portal.
              </div>

              <div className="flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setDeletingResult(null)}
                  disabled={deleting}
                  className="btn-secondary py-2 px-4 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteQuizResult}
                  disabled={deleting}
                  className="bg-rose-600 hover:bg-rose-700 text-white font-semibold py-2 px-4 rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50"
                >
                  <Trash2 size={14} />
                  <span>{deleting ? 'Deleting from DB...' : 'Yes, Delete & Allow Re-attempt'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Manual Grading Studio Modal */}
        {(gradingResult || gradingLoading) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
            <div className="card max-w-4xl w-full max-h-[92vh] flex flex-col p-0 shadow-2xl border border-[var(--border)] bg-[var(--bg-surface)] overflow-hidden">
              {/* Studio Header */}
              <div className="p-5 border-b border-[var(--border)] flex items-center justify-between gap-4 bg-[var(--bg-muted)]/50">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-500/15 text-blue-600">
                      Instructor Grading Studio
                    </span>
                    <span className="text-xs text-[var(--text-secondary)] font-mono">
                      Attempt #{gradingResult?.attemptNo || 1}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-[var(--text-primary)] mt-0.5">
                    {gradingResult?.quizId?.title || 'Quiz Evaluation'}
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)]">
                    Student: <strong className="text-[var(--text-primary)]">{gradingResult?.studentName}</strong> ({gradingResult?.studentId}) • {gradingResult?.campus || 'Campus'} • {gradingResult?.batch || 'Batch'}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  {gradingResult && (
                    <div className="text-right hidden sm:block">
                      <div className="text-xs text-[var(--text-secondary)]">Calculated Score</div>
                      <div className="text-lg font-mono font-bold text-blue-600 dark:text-blue-400">
                        {calculatedGradeSummary.score} / {gradingResult.totalPossibleMarks}{' '}
                        <span className="text-xs text-[var(--text-secondary)] font-normal">
                          ({calculatedGradeSummary.percentage}%)
                        </span>
                      </div>
                    </div>
                  )}
                  <button
                    onClick={() => !savingGrades && setGradingResult(null)}
                    disabled={savingGrades}
                    className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-muted)] transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Studio Body */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
                {gradingLoading ? (
                  <div className="py-20 text-center text-sm text-[var(--text-secondary)]">
                    <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                    Loading student submission and questions...
                  </div>
                ) : (
                  gradingResult?.answers?.map((ans, idx) => {
                    const q = ans.questionId || {};
                    const qId = q._id || ans.questionId;
                    const maxMarks = q.marks || 1;
                    const gradeVal = gradeAnswers[qId] || { marksObtained: 0, teacherRemarks: '' };
                    const currentTab = codeTabs[qId] || 'code';

                    return (
                      <div
                        key={idx}
                        className="p-4 sm:p-5 rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] space-y-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <span className="w-7 h-7 rounded-lg bg-[var(--bg-muted)] font-bold text-xs flex items-center justify-center shrink-0">
                              {idx + 1}
                            </span>
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                                  q.type === 'code'
                                    ? 'bg-emerald-500/15 text-emerald-600'
                                    : q.type === 'long'
                                    ? 'bg-purple-500/15 text-purple-600'
                                    : q.type === 'short'
                                    ? 'bg-amber-500/15 text-amber-600'
                                    : 'bg-blue-500/15 text-blue-600'
                                }`}>
                                  {q.type === 'code'
                                    ? `Code Challenge (${q.codeLanguage?.toUpperCase() || 'HTML/CSS'})`
                                    : q.type === 'long'
                                    ? 'Long Theory'
                                    : q.type === 'short'
                                    ? 'Short Q&A'
                                    : 'MCQ'}
                                </span>
                                <span className="text-xs text-[var(--text-secondary)]">
                                  Max: {maxMarks} {maxMarks === 1 ? 'Mark' : 'Marks'}
                                </span>
                              </div>
                              <h4 className="text-sm sm:text-base font-semibold text-[var(--text-primary)]">
                                {q.questionText}
                              </h4>
                            </div>
                          </div>
                        </div>

                        {/* MCQ Response */}
                        {q.type === 'mcq' && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                            <div className="p-3 rounded-xl bg-[var(--bg-muted)] border border-[var(--border)]">
                              <span className="text-[var(--text-secondary)] font-semibold block mb-0.5 uppercase">
                                Student Answer
                              </span>
                              <span className={ans.isCorrect ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
                                {ans.answer || '(No answer provided)'}
                              </span>
                            </div>
                            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                              <span className="font-semibold block mb-0.5 uppercase">Correct Option</span>
                              <span className="font-bold">{q.correctAnswer}</span>
                            </div>
                          </div>
                        )}

                        {/* Short / Long Written Response */}
                        {(q.type === 'short' || q.type === 'long') && (
                          <div className="space-y-3">
                            {q.correctAnswer && (
                              <div className="p-2.5 rounded-lg bg-[var(--bg-muted)] border border-[var(--border)] text-xs text-[var(--text-secondary)]">
                                <strong className="text-[var(--text-primary)]">Grading Rubric / Model Answer:</strong> {q.correctAnswer}
                              </div>
                            )}
                            <div className="p-3.5 rounded-xl bg-[var(--bg-muted)]/60 border border-[var(--border)]">
                              <span className="text-[11px] font-semibold uppercase text-[var(--text-secondary)] block mb-1">
                                Student's Written Response:
                              </span>
                              <div className="text-xs sm:text-sm text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed">
                                {ans.answer ? ans.answer : <em className="text-[var(--text-muted)]">No response submitted by student.</em>}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Code Response with Live Interactive Sandbox Preview */}
                        {q.type === 'code' && (
                          <div className="space-y-2.5">
                            <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => setCodeTabs((prev) => ({ ...prev, [qId]: 'code' }))}
                                  className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                                    currentTab === 'code'
                                      ? 'bg-[var(--accent)] text-white'
                                      : 'bg-[var(--bg-muted)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                  }`}
                                >
                                  <Code2 size={13} />
                                  <span>Submitted Code</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setCodeTabs((prev) => ({ ...prev, [qId]: 'preview' }))}
                                  className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                                    currentTab === 'preview'
                                      ? 'bg-emerald-600 text-white'
                                      : 'bg-[var(--bg-muted)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                  }`}
                                >
                                  <Play size={13} />
                                  <span>Live Output Preview</span>
                                </button>
                              </div>
                              <span className="text-[11px] text-[var(--text-muted)] font-mono">
                                {q.codeLanguage === 'react' ? 'React JSX' : q.codeLanguage === 'javascript' ? 'JavaScript' : 'HTML5 & CSS3'}
                              </span>
                            </div>

                            {currentTab === 'code' ? (
                              <div className="rounded-xl border border-[var(--border)] bg-[#0b1220] p-3 overflow-x-auto max-h-72">
                                <pre className="font-mono text-xs text-slate-100 whitespace-pre-wrap leading-relaxed">
                                  {ans.answer || '// Student did not submit any code.'}
                                </pre>
                              </div>
                            ) : (
                              <div className="rounded-xl border border-[var(--border)] bg-white overflow-hidden shadow-inner">
                                <div className="p-1.5 bg-slate-100 border-b text-[10px] text-slate-500 font-mono flex items-center gap-2">
                                  <div className="flex gap-1">
                                    <div className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                                    <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                                  </div>
                                  <span>Live Evaluator Preview (Isolated Sandbox)</span>
                                </div>
                                <iframe
                                  title={`Preview-${idx}`}
                                  srcDoc={buildPreviewDocument(ans.answer, q.codeLanguage)}
                                  sandbox="allow-scripts"
                                  className="w-full h-64 border-0"
                                />
                              </div>
                            )}
                          </div>
                        )}

                        {/* Grading Controls (For Subjective and Code questions, and editable for MCQ if override is needed) */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-[var(--border)]/60 items-center">
                          <div>
                            <label className="block text-[11px] font-semibold uppercase text-[var(--text-secondary)] mb-1">
                              Marks Awarded (Max {maxMarks})
                            </label>
                            <input
                              type="number"
                              min={0}
                              max={maxMarks}
                              step="0.5"
                              value={gradeVal.marksObtained}
                              onChange={(e) => {
                                const val = Math.min(maxMarks, Math.max(0, Number(e.target.value) || 0));
                                setGradeAnswers((prev) => ({
                                  ...prev,
                                  [qId]: { ...gradeVal, marksObtained: val },
                                }));
                              }}
                              className="input-field text-sm font-bold font-mono py-1.5"
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <label className="block text-[11px] font-semibold uppercase text-[var(--text-secondary)] mb-1">
                              Teacher Feedback / Remarks (Optional)
                            </label>
                            <input
                              type="text"
                              placeholder="e.g. Excellent solution; clean state handling."
                              value={gradeVal.teacherRemarks}
                              onChange={(e) => {
                                setGradeAnswers((prev) => ({
                                  ...prev,
                                  [qId]: { ...gradeVal, teacherRemarks: e.target.value },
                                }));
                              }}
                              className="input-field text-xs py-1.5"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Studio Footer */}
              <div className="p-4 border-t border-[var(--border)] bg-[var(--bg-muted)] flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[var(--text-secondary)]">Total Marks:</span>
                  <span className="text-base font-bold font-mono text-[var(--text-primary)]">
                    {calculatedGradeSummary.score} / {gradingResult?.totalPossibleMarks || 0}
                  </span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[var(--accent-subtle)] text-[var(--accent)]">
                    {calculatedGradeSummary.percentage}%
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setGradingResult(null)}
                    disabled={savingGrades}
                    className="btn-secondary py-2 px-4 text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveGrades}
                    disabled={savingGrades || gradingLoading}
                    className="btn-primary py-2 px-5 text-xs font-semibold flex items-center gap-2"
                  >
                    <CheckCircle2 size={15} />
                    <span>{savingGrades ? 'Publishing Grades...' : 'Save & Publish Grades'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminResultsPage;
