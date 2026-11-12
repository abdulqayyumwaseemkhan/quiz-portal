import React, { useState, useEffect, useMemo, useCallback } from 'react';
import * as XLSX from 'xlsx';
import API from '../api';
import Navbar from '../components/AdminNavbar';
import {
  Filter,
  Download,
  ArrowLeft,
  Clock,
  CheckCircle,
  CheckCircle2,
  BookOpen,
  Award,
  ExternalLink,
  Globe,
  Code2,
  Monitor,
  Tablet,
  Smartphone,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  X,
  MessageSquare,
  FileArchive,
  Search,
  Eye,
  Check,
} from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import WebIDE from '../components/WebIDE/WebIDE';
import { broadcastLiveUpdate, useLiveRefresh } from '../utils/liveSync';

const formatBytes = (bytes, decimals = 1) => {
  if (!+bytes) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

const SCORE_PRESETS = [100, 95, 90, 85, 80, 75, 50, 0];

const AssignmentSubmissionsPage = () => {
  const { id } = useParams();
  const [submissions, setSubmissions] = useState([]);
  const [filter, setFilter] = useState({ campus: '', batch: '' });
  const [meta, setMeta] = useState({ campuses: [], batches: [] });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Live Inspection Studio & Quick Grading
  const [inspectingSub, setInspectingSub] = useState(null);
  const [previewDevice, setPreviewDevice] = useState('desktop'); // 'desktop' | 'tablet' | 'mobile'
  const [iframeKey, setIframeKey] = useState(0);

  // Grade state
  const [gradeForm, setGradeForm] = useState({ marksObtained: '', maxMarks: 100, feedback: '' });
  const [savingGrade, setSavingGrade] = useState(false);

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [sRes, mRes] = await Promise.all([
        API.get(`/assignments/${id}/submissions`, { params: filter }),
        API.get('/admin/students/meta'),
      ]);
      setSubmissions(sRes.data);
      setMeta(mRes.data);
    } catch {
      if (!silent) toast.error('Failed to load submissions');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [id, filter]);

  useEffect(() => {
    fetchData(false);
  }, [fetchData]);

  // Live silent background sync: revalidates when a student submits an assignment or when admin re-focuses tab
  useLiveRefresh(fetchData, 8000, ['ASSIGNMENT_SUBMITTED']);

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

  const filteredSubmissions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return submissions;
    return submissions.filter(
      (s) =>
        s.studentName.toLowerCase().includes(q) ||
        s.studentId.toLowerCase().includes(q)
    );
  }, [submissions, searchQuery]);

  const currentIndex = useMemo(() => {
    if (!inspectingSub) return -1;
    return filteredSubmissions.findIndex((s) => s._id === inspectingSub._id);
  }, [inspectingSub, filteredSubmissions]);

  const openInspectStudio = (sub) => {
    setInspectingSub(sub);
    const resolvedMax = sub.assignmentTotalMarks || sub.maxMarks || 20;
    setGradeForm({
      marksObtained: sub.marksObtained ?? '',
      maxMarks: resolvedMax,
      feedback: sub.remarks || sub.feedback || '',
    });
    setIframeKey((prev) => prev + 1);
  };

  const switchInspectingStudent = (direction) => {
    if (currentIndex === -1) return;
    const targetIdx = currentIndex + direction;
    if (targetIdx >= 0 && targetIdx < filteredSubmissions.length) {
      openInspectStudio(filteredSubmissions[targetIdx]);
    }
  };

  const handleSaveGrade = async (e, shouldGoNext = false) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!inspectingSub) return;
    setSavingGrade(true);
    try {
      const payload = {
        marksObtained: gradeForm.marksObtained !== '' ? Number(gradeForm.marksObtained) : null,
        maxMarks: Number(gradeForm.maxMarks) || 100,
        feedback: gradeForm.feedback,
        remarks: gradeForm.feedback,
      };
      const { data } = await API.put(`/assignments/submissions/${inspectingSub._id}/grade`, payload);
      setSubmissions((prev) => prev.map((s) => (s._id === data._id ? data : s)));
      broadcastLiveUpdate('ASSIGNMENT_GRADED', {
        submissionId: data._id,
        studentId: data.studentId,
        assignmentId: data.assignmentId,
      });
      toast.success(`Grade saved for ${data.studentName}`);

      if (shouldGoNext) {
        if (currentIndex < filteredSubmissions.length - 1) {
          openInspectStudio(filteredSubmissions[currentIndex + 1]);
        } else {
          toast.success('All submissions reviewed!');
          setInspectingSub(null);
        }
      } else {
        setInspectingSub(data);
      }
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
      'Live URL (Vercel)': s.liveUrl || '',
      'GitHub URL': s.githubUrl || '',
      'Marks Obtained': s.marksObtained ?? 'Not Graded',
      'Max Marks': s.maxMarks || 100,
      'Remarks / Feedback': s.remarks || s.feedback || '',
      'Submitted At': s.submittedAt ? new Date(s.submittedAt).toLocaleString() : '',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Submissions');
    XLSX.writeFile(wb, `assignment_submissions_${id.slice(-6)}.xlsx`);
  };

  // Determine active preview URL
  const activeLiveUrl = inspectingSub?.liveUrl || (
    inspectingSub?.driveLink && !inspectingSub?.driveLink.includes('drive.google.com')
      ? inspectingSub.driveLink
      : ''
  );

  let activeGoogleDriveEmbed = null;
  if (inspectingSub?.driveLink && inspectingSub.driveLink.includes('drive.google.com/file/d/')) {
    const fileId = inspectingSub.driveLink.split('/file/d/')[1].split('/')[0];
    activeGoogleDriveEmbed = `https://drive.google.com/file/d/${fileId}/preview`;
  }

  // --- Fullscreen Live Review & Grading Studio ---
  if (inspectingSub) {
    const hasNext = currentIndex < filteredSubmissions.length - 1;
    const hasPrev = currentIndex > 0;

    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-[var(--bg-primary)] overflow-hidden">
        {/* Top Control Bar */}
        <header className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-[var(--bg-surface)] border-b border-[var(--border)] shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setInspectingSub(null)}
              className="text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-1.5 py-1.5 px-2.5 rounded-lg hover:bg-[var(--bg-muted)]"
            >
              <ArrowLeft size={16} /> Back
            </button>
            <div className="h-4 w-px bg-[var(--border)] hidden sm:block" />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold truncate">
                  {inspectingSub.studentName}
                </h2>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-[var(--bg-muted)] text-[var(--text-secondary)]">
                  {inspectingSub.studentId}
                </span>
                {inspectingSub.campus && (
                  <span className="text-xs text-[var(--text-muted)] hidden md:inline">
                    • {inspectingSub.campus} ({inspectingSub.batch})
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Viewport Width Controls (For Live URL) */}
          {activeLiveUrl && (
            <div className="hidden lg:flex items-center gap-1 p-1 bg-[var(--bg-muted)] rounded-lg border border-[var(--border)]">
              <button
                type="button"
                onClick={() => setPreviewDevice('desktop')}
                className={`py-1 px-2.5 rounded text-xs font-medium flex items-center gap-1.5 transition-colors ${
                  previewDevice === 'desktop'
                    ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
                title="Desktop (100% Width)"
              >
                <Monitor size={14} /> Desktop
              </button>
              <button
                type="button"
                onClick={() => setPreviewDevice('tablet')}
                className={`py-1 px-2.5 rounded text-xs font-medium flex items-center gap-1.5 transition-colors ${
                  previewDevice === 'tablet'
                    ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
                title="Tablet View (768px)"
              >
                <Tablet size={14} /> Tablet
              </button>
              <button
                type="button"
                onClick={() => setPreviewDevice('mobile')}
                className={`py-1 px-2.5 rounded text-xs font-medium flex items-center gap-1.5 transition-colors ${
                  previewDevice === 'mobile'
                    ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
                title="Mobile View (375px)"
              >
                <Smartphone size={14} /> Mobile
              </button>
            </div>
          )}

          {/* Navigation & Direct Open Controls */}
          <div className="flex items-center gap-2">
            {activeLiveUrl && (
              <a
                href={activeLiveUrl}
                target="_blank"
                rel="noreferrer"
                className="btn-secondary py-1.5 px-3 text-xs flex items-center gap-1.5"
                title="Open deployed application in new tab"
              >
                <Globe size={14} className="text-emerald-500" />
                <span className="hidden sm:inline">Open Live App</span>
                <ExternalLink size={12} />
              </a>
            )}

            {inspectingSub.githubUrl && (
              <a
                href={inspectingSub.githubUrl}
                target="_blank"
                rel="noreferrer"
                className="btn-secondary py-1.5 px-3 text-xs flex items-center gap-1.5"
                title="Open GitHub repository in new tab"
              >
                <Code2 size={14} />
                <span className="hidden sm:inline">GitHub</span>
                <ExternalLink size={12} />
              </a>
            )}

            <div className="flex items-center gap-1 pl-1 border-l border-[var(--border)]">
              <button
                type="button"
                disabled={!hasPrev}
                onClick={() => switchInspectingStudent(-1)}
                className="p-1.5 rounded-lg border border-[var(--border)] hover:bg-[var(--bg-muted)] disabled:opacity-30 disabled:pointer-events-none"
                title="Previous Student"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-xs font-mono text-[var(--text-muted)] px-1">
                {currentIndex + 1}/{filteredSubmissions.length}
              </span>
              <button
                type="button"
                disabled={!hasNext}
                onClick={() => switchInspectingStudent(1)}
                className="p-1.5 rounded-lg border border-[var(--border)] hover:bg-[var(--bg-muted)] disabled:opacity-30 disabled:pointer-events-none"
                title="Next Student"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            <button
              onClick={() => setInspectingSub(null)}
              className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-muted)]"
            >
              <X size={18} />
            </button>
          </div>
        </header>

        {/* Main Workspace Area (Split Screen) */}
        <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
          {/* Live Preview Screen (Left Pane) */}
          <div className="flex-1 bg-[var(--bg-primary)] flex flex-col min-h-0 overflow-hidden border-b lg:border-b-0 lg:border-r border-[var(--border)]">
            {activeLiveUrl ? (
              <div className="flex-1 flex flex-col min-h-0 bg-[#0c0c0e]">
                {/* Browser Address Bar Mockup */}
                <div className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-surface)] border-b border-[var(--border)] text-xs text-[var(--text-secondary)] shrink-0">
                  <div className="flex items-center gap-1.5 text-[var(--text-muted)]">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 inline-block" />
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block" />
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block" />
                  </div>
                  <div className="flex-1 flex items-center gap-2 bg-[var(--bg-primary)] border border-[var(--border)] px-3 py-1 rounded-md font-mono text-[11px] truncate">
                    <Globe size={12} className="text-emerald-500 shrink-0" />
                    <span className="truncate">{activeLiveUrl}</span>
                  </div>
                  <button
                    onClick={() => setIframeKey((k) => k + 1)}
                    className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    title="Reload frame"
                  >
                    <RotateCcw size={13} />
                  </button>
                  <a
                    href={activeLiveUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    title="Open in new window"
                  >
                    <ExternalLink size={13} />
                  </a>
                </div>

                {/* Resizable Preview Container */}
                <div className="flex-1 flex items-center justify-center p-2 sm:p-4 min-h-0 overflow-auto">
                  <div
                    className={`h-full bg-white rounded-lg shadow-2xl overflow-hidden transition-all duration-300 border border-[var(--border)] ${
                      previewDevice === 'mobile'
                        ? 'w-[375px]'
                        : previewDevice === 'tablet'
                        ? 'w-[768px]'
                        : 'w-full'
                    }`}
                  >
                    <iframe
                      key={iframeKey}
                      src={activeLiveUrl}
                      title="Student Project Live Preview"
                      className="w-full h-full border-0 bg-white"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      sandbox="allow-forms allow-modals allow-popups allow-presentation allow-same-origin allow-scripts"
                    />
                  </div>
                </div>

                <div className="px-4 py-2 bg-[var(--bg-surface)]/80 border-t border-[var(--border)] flex items-center justify-between text-[11px] text-[var(--text-muted)] shrink-0">
                  <span>
                    Viewing live deployed project.{' '}
                    <span className="hidden sm:inline">
                      If the site prevents embedding, click the link to open in a new tab.
                    </span>
                  </span>
                  <a
                    href={activeLiveUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[var(--accent)] hover:underline font-semibold flex items-center gap-1"
                  >
                    Direct Link <ExternalLink size={11} />
                  </a>
                </div>
              </div>
            ) : inspectingSub.submissionType === 'ide' && inspectingSub.projectData ? (
              <div className="flex-1 min-h-0">
                <WebIDE initialProjectData={inspectingSub.projectData} readOnly={true} />
              </div>
            ) : activeGoogleDriveEmbed ? (
              <div className="flex-1 flex flex-col p-4 bg-slate-950">
                <iframe
                  src={activeGoogleDriveEmbed}
                  width="100%"
                  height="100%"
                  allow="autoplay"
                  title="Submission Preview"
                  className="rounded-xl w-full h-full border-0"
                />
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                <div className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] mb-4">
                  <FileArchive size={36} className="text-[var(--accent)]" />
                </div>
                <h3 className="text-base font-bold mb-1">
                  {inspectingSub.originalFileName || 'File / Archive Submission'}
                </h3>
                <p className="text-xs text-[var(--text-secondary)] max-w-sm mb-4">
                  {inspectingSub.fileSizeBytes
                    ? `File Size: ${formatBytes(inspectingSub.fileSizeBytes)}`
                    : 'Download the source file to review the project locally.'}
                </p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {inspectingSub.fileUrl && (
                    <a
                      href={inspectingSub.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-primary py-2 px-4 text-xs flex items-center gap-2"
                    >
                      <Download size={14} /> Download Submitted File
                    </a>
                  )}
                  {inspectingSub.githubUrl && (
                    <a
                      href={inspectingSub.githubUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-secondary py-2 px-4 text-xs flex items-center gap-2"
                    >
                      <Code2 size={14} /> View GitHub Repo
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Quick Grading & Feedback Panel (Right Pane) */}
          <aside className="w-full lg:w-96 bg-[var(--bg-surface)] flex flex-col shrink-0 overflow-y-auto border-t lg:border-t-0">
            <div className="p-5 space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-1.5">
                  <Award size={14} className="text-[var(--accent)]" /> Grading & Evaluation
                </span>
                {inspectingSub.marksObtained !== null && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 size={12} /> Graded
                  </span>
                )}
              </div>

              {/* Submission Information Cards */}
              <div className="p-3.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border)] space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-[var(--text-muted)]">Student</span>
                  <span className="font-semibold">{inspectingSub.studentName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[var(--text-muted)]">Roll No / ID</span>
                  <span className="font-mono">{inspectingSub.studentId}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[var(--text-muted)]">Campus / Batch</span>
                  <span>{inspectingSub.campus || '—'} · {inspectingSub.batch || '—'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[var(--text-muted)]">Submitted On</span>
                  <span>{new Date(inspectingSub.submittedAt).toLocaleString()}</span>
                </div>
                {inspectingSub.isLate && (
                  <div className="text-rose-500 font-semibold text-[11px] pt-1">
                    Submitted after due date
                  </div>
                )}
              </div>

              {/* Grading Form */}
              <form onSubmit={(e) => handleSaveGrade(e, false)} className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                      Marks Obtained
                    </label>
                    <span className="text-xs text-[var(--text-muted)]">
                      Out of {gradeForm.maxMarks}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      max={gradeForm.maxMarks || 100}
                      step="0.5"
                      placeholder="e.g. 95"
                      className="input-field text-base font-bold font-mono py-2"
                      value={gradeForm.marksObtained}
                      onChange={(e) =>
                        setGradeForm({ ...gradeForm, marksObtained: e.target.value })
                      }
                      required
                    />
                    <span className="text-sm font-semibold text-[var(--text-muted)]">/</span>
                    <input
                      type="number"
                      min={1}
                      className="input-field w-20 text-center font-mono py-2 text-xs"
                      value={gradeForm.maxMarks}
                      onChange={(e) =>
                        setGradeForm({ ...gradeForm, maxMarks: Number(e.target.value) || 100 })
                      }
                      title="Max marks"
                    />
                  </div>

                  {/* Rapid Grade Preset Chips */}
                  <div className="flex flex-wrap gap-1.5 mt-2.5">
                    {SCORE_PRESETS.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() =>
                          setGradeForm({
                            ...gradeForm,
                            marksObtained: Math.round((preset / 100) * (gradeForm.maxMarks || 100)),
                          })
                        }
                        className={`px-2 py-0.5 rounded text-[11px] font-mono border transition-all ${
                          Number(gradeForm.marksObtained) ===
                          Math.round((preset / 100) * (gradeForm.maxMarks || 100))
                            ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                            : 'border-[var(--border)] bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:bg-[var(--bg-muted)]'
                        }`}
                      >
                        {preset}%
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5 flex items-center gap-1.5">
                    <MessageSquare size={13} /> Remarks / Feedback
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Write constructive remarks or comments for the student..."
                    className="input-field text-xs leading-relaxed"
                    value={gradeForm.feedback}
                    onChange={(e) => setGradeForm({ ...gradeForm, feedback: e.target.value })}
                  />
                  <p className="text-[11px] text-[var(--text-muted)] mt-1">
                    Student will see these remarks in their portal under assignment score.
                  </p>
                </div>

                <div className="space-y-2 pt-2">
                  <button
                    type="button"
                    disabled={savingGrade}
                    onClick={() => handleSaveGrade(null, true)}
                    className="btn-primary w-full py-2.5 text-xs flex items-center justify-center gap-1.5"
                  >
                    <Check size={14} />
                    {savingGrade ? 'Saving...' : hasNext ? 'Save & Next Student →' : 'Save Grade'}
                  </button>

                  <button
                    type="submit"
                    disabled={savingGrade}
                    className="btn-secondary w-full py-2 text-xs flex items-center justify-center gap-1.5"
                  >
                    Save Grade Only
                  </button>
                </div>
              </form>
            </div>
          </aside>
        </div>
      </div>
    );
  }

  // --- Normal Submissions Table View ---
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
              Review live Vercel deployments, GitHub repos, and code submissions with rapid grading
            </p>
          </div>
          <button
            onClick={handleExportExcel}
            className="btn-secondary flex items-center gap-2 text-xs sm:text-sm py-2.5 px-4"
          >
            <Download size={16} /> Export Grades (.xlsx)
          </button>
        </header>

        {/* Filter & Search Bar */}
        <div className="card p-5 mb-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            <div>
              <label className="block text-xs font-semibold uppercase mb-1">Search Student</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={15} />
                <input
                  type="text"
                  placeholder="Filter by name or roll..."
                  className="input-field pl-9 py-2 text-sm"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <div>
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

            <div>
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
        </div>

        {/* Submissions Table */}
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[var(--bg-muted)] text-[var(--text-secondary)] text-xs font-semibold uppercase border-b border-[var(--border)]">
                <tr>
                  <th className="px-5 py-3.5">Student</th>
                  <th className="px-5 py-3.5">Campus / Batch</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Submission Artifacts</th>
                  <th className="px-5 py-3.5">Evaluation</th>
                  <th className="px-5 py-3.5 text-right">Review Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {filteredSubmissions.map((sub) => (
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
                        <span className="text-[var(--text-muted)] text-[11px]">
                          {new Date(sub.submittedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </td>

                    <td className="px-5 py-4 text-xs">
                      <div className="flex flex-col gap-1">
                        {sub.liveUrl && (
                          <span className="inline-flex items-center gap-1 font-semibold text-emerald-600">
                            <Globe size={13} /> Live Deployment (Vercel)
                          </span>
                        )}
                        {sub.githubUrl && (
                          <span className="inline-flex items-center gap-1 text-[var(--text-secondary)]">
                            <Code2 size={13} /> GitHub Repo
                          </span>
                        )}
                        {sub.submissionType === 'ide' && (
                          <span className="font-medium text-[var(--accent)]">Web IDE Workspace</span>
                        )}
                        {sub.originalFileName && (
                          <span className="text-[var(--text-muted)] truncate max-w-[180px]">
                            {sub.originalFileName} ({formatBytes(sub.fileSizeBytes)})
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="px-5 py-4 text-xs">
                      {sub.marksObtained !== null && sub.marksObtained !== undefined ? (
                        <div>
                          <p className="font-bold text-sm text-emerald-600">
                            {sub.marksObtained} / {sub.assignmentTotalMarks || sub.maxMarks || 20}
                          </p>
                          {(sub.remarks || sub.feedback) && (
                            <p
                              className="text-[var(--text-secondary)] line-clamp-1 max-w-[180px]"
                              title={sub.remarks || sub.feedback}
                            >
                              {sub.remarks || sub.feedback}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-[var(--text-muted)]">Pending Grade</span>
                      )}
                    </td>

                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => openInspectStudio(sub)}
                        className="btn-primary py-1.5 px-3.5 text-xs inline-flex items-center gap-1.5 shadow-sm"
                      >
                        <Eye size={13} />
                        <span>Inspect & Grade</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredSubmissions.length === 0 && !loading && (
            <div className="p-14 text-center">
              <Download className="mx-auto text-[var(--text-muted)] mb-3" size={40} />
              <p className="text-sm text-[var(--text-secondary)]">No submissions found matching filters.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default AssignmentSubmissionsPage;
