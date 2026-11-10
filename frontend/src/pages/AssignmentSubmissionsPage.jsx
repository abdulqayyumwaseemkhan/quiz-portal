import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import API from '../api';
import Navbar from '../components/AdminNavbar';
import {
  Filter,
  Download,
  ArrowLeft,
  Clock,
  CheckCircle,
  BookOpen,
  Award,
  ExternalLink,
  X,
} from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import WebIDE from '../components/WebIDE/WebIDE';

const formatBytes = (bytes, decimals = 1) => {
  if (!+bytes) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

const AssignmentSubmissionsPage = () => {
  const { id } = useParams();
  const [submissions, setSubmissions] = useState([]);
  const [filter, setFilter] = useState({ campus: '', batch: '' });
  const [meta, setMeta] = useState({ campuses: [], batches: [] });
  const [loading, setLoading] = useState(true);
  const [activeWorkspace, setActiveWorkspace] = useState(null);
  const [activeVideo, setActiveVideo] = useState(null);
  const [gradingSub, setGradingSub] = useState(null);
  const [gradeForm, setGradeForm] = useState({ marksObtained: '', maxMarks: 100, feedback: '' });
  const [savingGrade, setSavingGrade] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [sRes, mRes] = await Promise.all([
          API.get(`/assignments/${id}/submissions`),
          API.get('/admin/students/meta'),
        ]);
        setSubmissions(sRes.data);
        setMeta(mRes.data);
      } catch {
        toast.error('Failed to load submissions');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const handleFilter = async () => {
    setLoading(true);
    try {
      const { data } = await API.get(`/assignments/${id}/submissions`, { params: filter });
      setSubmissions(data);
    } catch {
      toast.error('Filter failed');
    } finally {
      setLoading(false);
    }
  };

  const openGradeModal = (sub) => {
    setGradingSub(sub);
    setGradeForm({
      marksObtained: sub.marksObtained ?? '',
      maxMarks: sub.maxMarks || 100,
      feedback: sub.feedback || '',
    });
  };

  const handleSaveGrade = async (e) => {
    e.preventDefault();
    if (!gradingSub) return;
    setSavingGrade(true);
    try {
      const { data } = await API.put(`/assignments/submissions/${gradingSub._id}/grade`, gradeForm);
      setSubmissions(submissions.map((s) => (s._id === data._id ? data : s)));
      setGradingSub(null);
      toast.success('Marks and feedback saved');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save grade');
    } finally {
      setSavingGrade(false);
    }
  };

  const handleExportExcel = () => {
    if (!submissions.length) return toast.error('No submissions to export');
    const rows = submissions.map((s) => ({
      'Student ID': s.studentId,
      'Student Name': s.studentName,
      Campus: s.campus || '',
      Batch: s.batch || '',
      Status: s.status || (s.isLate ? 'late' : 'submitted'),
      'Marks Obtained': s.marksObtained ?? 'Not Graded',
      'Max Marks': s.maxMarks || 100,
      Feedback: s.feedback || '',
      'Submitted At': s.submittedAt ? new Date(s.submittedAt).toLocaleString() : '',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Submissions');
    XLSX.writeFile(wb, `assignment_submissions_${id.slice(-6)}.xlsx`);
  };

  if (activeVideo) {
    let embedLink = activeVideo.driveLink;
    if (embedLink && embedLink.includes('drive.google.com/file/d/')) {
      const fileId = embedLink.split('/file/d/')[1].split('/')[0];
      embedLink = `https://drive.google.com/file/d/${fileId}/preview`;
    }

    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-slate-950">
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 border-b border-slate-800">
          <button
            onClick={() => setActiveVideo(null)}
            className="text-slate-300 font-semibold hover:text-white flex items-center gap-2 text-sm"
          >
            <ArrowLeft size={18} /> Back to Submissions
          </button>
          <h2 className="text-sm font-bold text-white">
            {activeVideo.studentName} — {activeVideo.assignmentTitle || 'Submission Preview'}
          </h2>
        </div>
        <div className="flex-1 flex items-center justify-center p-6">
          {embedLink ? (
            <iframe
              src={embedLink}
              width="100%"
              height="100%"
              allow="autoplay"
              title="Submission preview"
              className="rounded-xl max-w-5xl w-full h-[80vh] border-0"
            />
          ) : (
            <div className="text-white">Cannot embed this link directly.</div>
          )}
        </div>
      </div>
    );
  }

  if (activeWorkspace) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-[var(--bg-primary)]">
        <div className="flex items-center justify-between px-6 py-3 bg-[var(--bg-surface)] border-b border-[var(--border)]">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setActiveWorkspace(null)}
              className="text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              ← Back to Submissions
            </button>
            <h2 className="text-base font-bold">{activeWorkspace.studentName}&apos;s Workspace</h2>
          </div>
          <button
            onClick={() => {
              const sub = activeWorkspace;
              setActiveWorkspace(null);
              openGradeModal(sub);
            }}
            className="btn-primary py-1.5 px-4 text-xs"
          >
            Grade Submission
          </button>
        </div>
        <div className="flex-1 min-h-0">
          <WebIDE initialProjectData={activeWorkspace.projectData} readOnly={true} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      <Navbar />
      <main className="flex-1 lg:ml-64 p-4 sm:p-6 lg:p-8">
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <Link
              to="/admin/manage-assignments"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] mb-2"
            >
              <ArrowLeft size={15} /> Back to Assignments
            </Link>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Assignment Submissions</h1>
            <p className="text-sm text-[var(--text-secondary)] mt-0.5">
              Review student files, links, and code workspaces and assign marks & feedback
            </p>
          </div>
          <button
            onClick={handleExportExcel}
            className="btn-secondary flex items-center gap-2 text-xs sm:text-sm py-2.5 px-4"
          >
            <Download size={16} /> Export Grades (.xlsx)
          </button>
        </header>

        <div className="card p-5 mb-6 flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex-1 w-full">
            <label className="block text-xs font-semibold uppercase mb-1">Campus</label>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={15} />
              <select
                className="input-field pl-9 py-2 text-sm"
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
          </div>
          <div className="flex-1 w-full">
            <label className="block text-xs font-semibold uppercase mb-1">Batch</label>
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
          <button onClick={handleFilter} className="btn-primary py-2.5 px-6 text-sm whitespace-nowrap">
            Apply Filters
          </button>
        </div>

        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[var(--bg-muted)] text-[var(--text-secondary)] text-xs font-semibold uppercase border-b border-[var(--border)]">
                <tr>
                  <th className="px-5 py-3.5">Student</th>
                  <th className="px-5 py-3.5">Campus / Batch</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Submission</th>
                  <th className="px-5 py-3.5">Marks & Feedback</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {submissions.map((sub) => (
                  <tr key={sub._id} className="hover:bg-[var(--bg-muted)]/40 transition-colors">
                    <td className="px-5 py-4">
                      <p className="font-semibold">{sub.studentName}</p>
                      <p className="text-xs font-mono text-[var(--text-secondary)]">{sub.studentId}</p>
                    </td>
                    <td className="px-5 py-4 text-xs">
                      <p className="font-medium">{sub.campus || '—'}</p>
                      <p className="text-[var(--text-secondary)]">{sub.batch || '—'}</p>
                    </td>
                    <td className="px-5 py-4 text-xs">
                      <div className="flex flex-col gap-1">
                        {sub.marksObtained !== null && sub.marksObtained !== undefined ? (
                          <span className="inline-flex items-center gap-1 w-fit px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 font-semibold">
                            <CheckCircle size={12} /> Graded
                          </span>
                        ) : sub.isLate ? (
                          <span className="inline-flex items-center gap-1 w-fit px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-600 font-semibold">
                            <Clock size={12} /> Late
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 w-fit px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-600 font-semibold">
                            <CheckCircle size={12} /> Submitted
                          </span>
                        )}
                        <span className="text-[var(--text-muted)]">
                          {new Date(sub.submittedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-xs">
                      {sub.submissionType === 'ide' ? (
                        <span className="font-medium text-[var(--accent)]">Web IDE Project</span>
                      ) : (
                        <div className="space-y-1">
                          {sub.originalFileName && (
                            <p className="font-medium truncate max-w-[180px]" title={sub.originalFileName}>
                              {sub.originalFileName} ({formatBytes(sub.fileSizeBytes)})
                            </p>
                          )}
                          {sub.driveLink && (
                            <a
                              href={sub.driveLink}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[var(--accent)] hover:underline"
                            >
                              External Link <ExternalLink size={11} />
                            </a>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-4 text-xs">
                      {sub.marksObtained !== null && sub.marksObtained !== undefined ? (
                        <div>
                          <p className="font-bold text-sm text-emerald-600">
                            {sub.marksObtained} / {sub.maxMarks || 100}
                          </p>
                          {sub.feedback && (
                            <p className="text-[var(--text-secondary)] line-clamp-1 max-w-[180px]" title={sub.feedback}>
                              {sub.feedback}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-[var(--text-muted)]">Pending Grade</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="inline-flex flex-wrap justify-end gap-1.5">
                        {sub.submissionType === 'ide' && (
                          <button
                            onClick={() => setActiveWorkspace(sub)}
                            className="btn-secondary py-1.5 px-3 text-xs flex items-center gap-1"
                          >
                            <BookOpen size={13} /> Code
                          </button>
                        )}
                        {sub.driveLink && sub.driveLink.includes('drive.google.com') && (
                          <button
                            onClick={() => setActiveVideo(sub)}
                            className="btn-secondary py-1.5 px-3 text-xs flex items-center gap-1"
                          >
                            <BookOpen size={13} /> Preview
                          </button>
                        )}
                        {sub.fileUrl && (
                          <a
                            href={sub.fileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="btn-secondary py-1.5 px-3 text-xs flex items-center gap-1"
                          >
                            <Download size={13} /> File
                          </a>
                        )}
                        <button
                          onClick={() => openGradeModal(sub)}
                          className="btn-primary py-1.5 px-3 text-xs flex items-center gap-1"
                        >
                          <Award size={13} /> Grade
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {submissions.length === 0 && !loading && (
            <div className="p-14 text-center">
              <Download className="mx-auto text-[var(--text-muted)] mb-3" size={40} />
              <p className="text-sm text-[var(--text-secondary)]">No submissions received yet.</p>
            </div>
          )}
        </div>

        {/* Grade & Feedback Modal */}
        {gradingSub && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <form onSubmit={handleSaveGrade} className="card max-w-md w-full p-6 space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-bold">Grade Submission</h3>
                  <p className="text-xs text-[var(--text-secondary)]">
                    {gradingSub.studentName} ({gradingSub.studentId})
                  </p>
                </div>
                <button type="button" onClick={() => setGradingSub(null)}>
                  <X size={18} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase mb-1">Marks Obtained *</label>
                  <input
                    type="number"
                    min={0}
                    max={gradeForm.maxMarks || 1000}
                    step="0.5"
                    className="input-field"
                    value={gradeForm.marksObtained}
                    onChange={(e) => setGradeForm({ ...gradeForm, marksObtained: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase mb-1">Out Of (Max Marks)</label>
                  <input
                    type="number"
                    min={1}
                    className="input-field"
                    value={gradeForm.maxMarks}
                    onChange={(e) => setGradeForm({ ...gradeForm, maxMarks: Number(e.target.value) })}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase mb-1">Instructor Feedback</label>
                <textarea
                  placeholder="Constructive feedback on code quality, UI, or completeness..."
                  className="input-field min-h-[90px]"
                  value={gradeForm.feedback}
                  onChange={(e) => setGradeForm({ ...gradeForm, feedback: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border)]">
                <button type="button" onClick={() => setGradingSub(null)} className="btn-secondary text-xs">
                  Cancel
                </button>
                <button type="submit" disabled={savingGrade} className="btn-primary text-xs">
                  {savingGrade ? 'Saving...' : 'Save Grade'}
                </button>
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  );
};

export default AssignmentSubmissionsPage;
