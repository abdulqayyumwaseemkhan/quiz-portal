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
  FolderArchive,
  Trash2,
  AlertTriangle,
  Video,
  Image as ImageIcon,
  ZoomIn,
  ZoomOut,
  FileSpreadsheet,
  FileText,
} from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import WebIDE from '../components/WebIDE/WebIDE';
import { broadcastLiveUpdate, useLiveRefresh } from '../utils/liveSync';
import {
  extractRemoteZipToProjectFiles,
  extractGitHubRepoToProjectFiles,
  hasCachedExtraction,
  getCachedExtraction,
} from '../utils/zipAndRepoExtractor';

const formatBytes = (bytes, decimals = 1) => {
  if (!+bytes) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

const SCORE_PRESETS = [100, 95, 90, 85, 80, 75, 50, 0];

const FEEDBACK_PRESETS = [
  '🌟 Outstanding execution & depth of work!',
  '✅ Clean, well structured & meets all requirements.',
  '🎨 Excellent design & visual presentation.',
  '💡 Good progress, but needs minor improvements.',
  '⚠️ Late submission - minor mark deduction applied.',
  '❌ Incomplete deliverables. Please review guidelines.',
];

function ensureHttpsUrl(raw = '') {
  if (!raw || typeof raw !== 'string') return '';
  let trimmed = raw.trim().replace(/^['"]+|['"]+$/g, '');
  if (!trimmed) return '';
  if (/^(javascript|data|vbscript):/i.test(trimmed)) return '';
  if (!/^https?:\/\//i.test(trimmed)) {
    if (/^(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/i.test(trimmed)) {
      trimmed = `http://${trimmed}`;
    } else {
      trimmed = `https://${trimmed}`;
    }
  }
  return trimmed;
}

function isGitHubRepoUrl(url = '') {
  const clean = ensureHttpsUrl(url);
  return /^https?:\/\/(www\.)?github\.com\/[^/]+\/[^/]+/i.test(clean);
}

function getVideoEmbedUrl(url) {
  const clean = ensureHttpsUrl(url);
  if (!clean) return null;

  // YouTube
  const ytMatch = clean.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{11})/i);
  if (ytMatch) {
    return { type: 'youtube', embedUrl: `https://www.youtube-nocookie.com/embed/${ytMatch[1]}?rel=0`, rawUrl: clean };
  }

  // Loom
  const loomMatch = clean.match(/loom\.com\/(?:share|embed)\/([\w-]+)/i);
  if (loomMatch) {
    return { type: 'loom', embedUrl: `https://www.loom.com/embed/${loomMatch[1]}`, rawUrl: clean };
  }

  // Vimeo
  const vimeoMatch = clean.match(/vimeo\.com\/(\d+)/i);
  if (vimeoMatch) {
    return { type: 'vimeo', embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}`, rawUrl: clean };
  }

  // Direct MP4 / WebM
  if (/\.(mp4|webm|ogg)($|\?)/i.test(clean)) {
    return { type: 'direct', embedUrl: clean, rawUrl: clean };
  }

  return null;
}

function getGoogleOfficeEmbedUrl(url) {
  const clean = ensureHttpsUrl(url);
  if (!clean) return null;

  if (clean.includes('docs.google.com/document/d/')) {
    const docId = clean.split('/document/d/')[1]?.split(/[/?#]/)[0];
    if (docId) return { type: 'Google Docs', embedUrl: `https://docs.google.com/document/d/${docId}/preview`, rawUrl: clean };
  }

  if (clean.includes('docs.google.com/spreadsheets/d/')) {
    const sheetId = clean.split('/spreadsheets/d/')[1]?.split(/[/?#]/)[0];
    if (sheetId) return { type: 'Google Sheets', embedUrl: `https://docs.google.com/spreadsheets/d/${sheetId}/preview?rm=minimal`, rawUrl: clean };
  }

  if (clean.includes('docs.google.com/presentation/d/')) {
    const slideId = clean.split('/presentation/d/')[1]?.split(/[/?#]/)[0];
    if (slideId) return { type: 'Google Slides', embedUrl: `https://docs.google.com/presentation/d/${slideId}/preview`, rawUrl: clean };
  }

  // Figma official embed wrapper (prevents X-Frame-Options refusal)
  if (/figma\.com\/(file|design|proto|board)\//i.test(clean)) {
    return {
      type: 'Figma Design',
      embedUrl: `https://www.figma.com/embed?embed_host=lms&url=${encodeURIComponent(clean)}`,
      rawUrl: clean,
    };
  }

  // Canva official embed mode
  const canvaMatch = clean.match(/canva\.com\/design\/([\w-]+)\/([\w-]+)/i);
  if (canvaMatch) {
    return {
      type: 'Canva Design',
      embedUrl: `https://www.canva.com/design/${canvaMatch[1]}/${canvaMatch[2]}/view?embed`,
      rawUrl: clean,
    };
  }

  return null;
}

function isImageUrl(url, fileName) {
  const target = `${fileName || ''} ${url || ''}`.toLowerCase();
  return /\.(png|jpe?g|webp|svg|gif|bmp)($|\?)/i.test(target);
}

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
  const [extractedProjectData, setExtractedProjectData] = useState(null);
  const [extractingSource, setExtractingSource] = useState(false);
  const [imageZoom, setImageZoom] = useState(1);

  // Grade state
  const [gradeForm, setGradeForm] = useState({ marksObtained: '', maxMarks: 100, feedback: '' });
  const [savingGrade, setSavingGrade] = useState(false);
  const [deletingSub, setDeletingSub] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const handleDeleteSubmission = async () => {
    if (!deletingSub) return;
    setDeleting(true);
    try {
      await API.delete(`/assignments/submissions/${deletingSub._id}`);
      setSubmissions((prev) => prev.filter((s) => s._id !== deletingSub._id));
      toast.success(
        `Deleted submission for ${deletingSub.studentName}. Student can now re-submit.`
      );
      broadcastLiveUpdate('ASSIGNMENT_SUBMISSION_DELETED', {
        submissionId: deletingSub._id,
        studentId: deletingSub.studentId,
        assignmentId: id,
      });
      if (inspectingSub?._id === deletingSub._id) {
        setInspectingSub(null);
      }
      setDeletingSub(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete submission');
    } finally {
      setDeleting(false);
    }
  };

  const renderDeleteModal = () => {
    if (!deletingSub) return null;
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
        <div className="card max-w-md w-full p-6 shadow-2xl border border-[var(--border)] bg-[var(--bg-surface)] relative">
          <button
            onClick={() => !deleting && setDeletingSub(null)}
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
                Delete Assignment Submission?
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
                {deletingSub.studentName} ({deletingSub.studentId})
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text-secondary)]">Campus / Batch:</span>
              <span>
                {deletingSub.campus || '—'} ({deletingSub.batch || '—'})
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text-secondary)]">Submission Type:</span>
              <span className="font-medium text-[var(--text-primary)] capitalize">
                {deletingSub.submissionType || (deletingSub.liveUrl ? 'Live URL / Vercel' : 'File Upload')}
              </span>
            </div>
            {deletingSub.marksObtained !== null && deletingSub.marksObtained !== undefined && (
              <div className="flex justify-between">
                <span className="text-[var(--text-secondary)]">Graded Marks:</span>
                <span className="font-bold text-rose-600">
                  {deletingSub.marksObtained} / {deletingSub.assignmentTotalMarks || deletingSub.maxMarks || 20}
                </span>
              </div>
            )}
          </div>

          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-700 dark:text-amber-300 mb-5 leading-relaxed">
            <strong>Extra Check & Effect:</strong> Deleting this submission removes all submitted code/files from MongoDB. The student's portal will immediately show unsubmitted status, allowing them to re-submit fresh work.
          </div>

          <div className="flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setDeletingSub(null)}
              disabled={deleting}
              className="btn-secondary py-2 px-4 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDeleteSubmission}
              disabled={deleting}
              className="bg-rose-600 hover:bg-rose-700 text-white font-semibold py-2 px-4 rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50"
            >
              <Trash2 size={14} />
              <span>{deleting ? 'Deleting from DB...' : 'Yes, Delete & Allow Re-submit'}</span>
            </button>
          </div>
        </div>
      </div>
    );
  };

  const handleExtractZipSubmission = async (fileUrl) => {
    if (!fileUrl) return;
    setExtractingSource(true);
    const toastId = toast.loading('Extracting ZIP submission into Web IDE...');
    try {
      const filesObj = await extractRemoteZipToProjectFiles(fileUrl);
      setExtractedProjectData(filesObj);
      toast.success(`Extracted ${Object.keys(filesObj).length} files! Loaded into Web IDE.`, { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error('Failed to extract ZIP. Ensure file is accessible.', { id: toastId });
    } finally {
      setExtractingSource(false);
    }
  };

  const handleExtractGitHubSubmission = async (githubUrl) => {
    if (!githubUrl) return;
    setExtractingSource(true);
    const toastId = toast.loading('Fetching code from GitHub...');
    try {
      const filesObj = await extractGitHubRepoToProjectFiles(githubUrl);
      setExtractedProjectData(filesObj);
      toast.success(`Loaded ${Object.keys(filesObj).length} files from GitHub!`, { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Could not fetch GitHub repository files.', { id: toastId });
    } finally {
      setExtractingSource(false);
    }
  };

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
    setImageZoom(1);
    // Instant cache restore if this submission's zip/repo was previously extracted (0ms, 0 Cloudinary requests)
    if (sub.fileUrl && hasCachedExtraction(sub.fileUrl)) {
      setExtractedProjectData(getCachedExtraction(sub.fileUrl));
    } else if (sub.githubUrl && hasCachedExtraction(sub.githubUrl)) {
      setExtractedProjectData(getCachedExtraction(sub.githubUrl));
    } else {
      setExtractedProjectData(null);
    }
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

  // Determine normalized active media & preview targets
  const normLive = ensureHttpsUrl(inspectingSub?.liveUrl);
  const normDrive = ensureHttpsUrl(inspectingSub?.driveLink);
  const normGithub = ensureHttpsUrl(
    inspectingSub?.githubUrl ||
      (isGitHubRepoUrl(normLive) ? normLive : '') ||
      (isGitHubRepoUrl(normDrive) ? normDrive : '')
  );

  const candidateUrl = normLive || normDrive || '';
  const videoEmbed = getVideoEmbedUrl(candidateUrl || inspectingSub?.fileUrl);
  const officeEmbed = getGoogleOfficeEmbedUrl(candidateUrl);
  const isDirectImage = isImageUrl(inspectingSub?.fileUrl, inspectingSub?.originalFileName);

  let activeGoogleDriveEmbed = null;
  let activeGoogleDriveFolderUrl = '';
  if (!videoEmbed && !officeEmbed && candidateUrl.includes('drive.google.com')) {
    const fileIdMatch =
      candidateUrl.match(/\/file\/d\/([\w-]+)/i) ||
      candidateUrl.match(/[?&]id=([\w-]+)/i);
    if (fileIdMatch && !candidateUrl.includes('/folders/')) {
      activeGoogleDriveEmbed = `https://drive.google.com/file/d/${fileIdMatch[1]}/preview`;
    } else if (candidateUrl.includes('/folders/')) {
      activeGoogleDriveFolderUrl = candidateUrl;
    }
  }

  // Only embed candidateUrl as a live web app if it is NOT a GitHub repo (which blocks iframes via X-Frame-Options)
  // and NOT a Google Drive link handled above
  const activeLiveUrl =
    !videoEmbed &&
    !officeEmbed &&
    !isDirectImage &&
    !activeGoogleDriveEmbed &&
    !activeGoogleDriveFolderUrl
      ? (!isGitHubRepoUrl(normLive) && normLive) ||
        (!isGitHubRepoUrl(normDrive) && !normDrive.includes('drive.google.com') ? normDrive : '')
      : '';

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

            {normGithub && !extractedProjectData && (
              <button
                type="button"
                onClick={() => handleExtractGitHubSubmission(normGithub)}
                disabled={extractingSource}
                className="btn-secondary py-1.5 px-3 text-xs flex items-center gap-1.5 cursor-pointer"
                title="Load GitHub repository files into Web IDE"
              >
                <Code2 size={14} className="text-[var(--accent)]" />
                <span className="hidden sm:inline">
                  {extractingSource ? 'Loading Code...' : 'Inspect Code'}
                </span>
              </button>
            )}

            {normGithub && (
              <a
                href={normGithub}
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
            {extractedProjectData || (inspectingSub.submissionType === 'ide' && inspectingSub.projectData) ? (
              <div className="flex-1 min-h-0 flex flex-col">
                {extractedProjectData && (
                  <div className="px-4 py-1.5 bg-indigo-50 dark:bg-indigo-950/40 border-b border-indigo-200 dark:border-indigo-900 flex items-center justify-between text-xs text-indigo-700 dark:text-indigo-300 shrink-0">
                    <span className="font-medium">
                      Source code loaded in Web IDE &amp; Live Preview
                    </span>
                    <button
                      type="button"
                      onClick={() => setExtractedProjectData(null)}
                      className="text-xs font-semibold hover:underline cursor-pointer"
                    >
                      {activeLiveUrl ? '← Back to Live Deployed App' : 'Close Extracted Code'}
                    </button>
                  </div>
                )}
                <div className="flex-1 min-h-0">
                  <WebIDE
                    key={inspectingSub._id + (extractedProjectData ? '_extracted' : '')}
                    initialProjectData={extractedProjectData || inspectingSub.projectData}
                    readOnly={true}
                  />
                </div>
              </div>
            ) : videoEmbed ? (
              <div className="flex-1 flex flex-col bg-black min-h-0">
                <div className="px-4 py-2 bg-[var(--bg-surface)] border-b border-[var(--border)] flex items-center justify-between text-xs shrink-0">
                  <span className="font-semibold text-rose-500 flex items-center gap-1.5">
                    <Video size={14} /> Video Demonstration Review ({videoEmbed.type.toUpperCase()})
                  </span>
                  <a
                    href={videoEmbed.rawUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-secondary py-1 px-2.5 text-xs flex items-center gap-1"
                  >
                    Open in New Tab <ExternalLink size={11} />
                  </a>
                </div>
                <div className="flex-1 flex items-center justify-center p-3 sm:p-6 overflow-auto">
                  {videoEmbed.type === 'direct' ? (
                    <video src={videoEmbed.embedUrl} controls className="max-h-full max-w-full rounded-xl shadow-2xl" />
                  ) : (
                    <div className="w-full h-full max-w-5xl max-h-[82vh] aspect-video">
                      <iframe
                        src={videoEmbed.embedUrl}
                        title="Student Video Review"
                        className="w-full h-full rounded-xl shadow-2xl border border-[var(--border)] bg-black"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                      />
                    </div>
                  )}
                </div>
              </div>
            ) : isDirectImage ? (
              <div className="flex-1 flex flex-col bg-[#121214] min-h-0 select-none">
                <div className="px-4 py-2 bg-[var(--bg-surface)] border-b border-[var(--border)] flex items-center justify-between text-xs shrink-0">
                  <span className="font-semibold text-fuchsia-500 flex items-center gap-1.5">
                    <ImageIcon size={14} /> Graphic Artwork / Image Inspection
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setImageZoom((z) => Math.max(0.5, z - 0.25))}
                      className="p-1.5 rounded bg-[var(--bg-muted)] hover:bg-[var(--border)]"
                      title="Zoom Out"
                    >
                      <ZoomOut size={13} />
                    </button>
                    <span className="font-mono text-xs w-12 text-center">{Math.round(imageZoom * 100)}%</span>
                    <button
                      type="button"
                      onClick={() => setImageZoom((z) => Math.min(3, z + 0.25))}
                      className="p-1.5 rounded bg-[var(--bg-muted)] hover:bg-[var(--border)]"
                      title="Zoom In"
                    >
                      <ZoomIn size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setImageZoom(1)}
                      className="py-1 px-2 rounded bg-[var(--bg-muted)] hover:bg-[var(--border)] text-[11px] font-semibold"
                    >
                      Fit 100%
                    </button>
                    <a
                      href={inspectingSub.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      download
                      className="btn-secondary py-1 px-2.5 text-xs flex items-center gap-1 ml-1"
                    >
                      <Download size={12} /> Download
                    </a>
                  </div>
                </div>
                <div className="flex-1 flex items-center justify-center p-4 overflow-auto">
                  <img
                    src={inspectingSub.fileUrl}
                    alt="Submitted Artwork"
                    style={{ transform: `scale(${imageZoom})`, transformOrigin: 'center center' }}
                    className="max-h-full max-w-full object-contain rounded-lg shadow-2xl transition-transform duration-150"
                  />
                </div>
              </div>
            ) : officeEmbed ? (
              <div className="flex-1 flex flex-col bg-[#121214] min-h-0">
                <div className="px-4 py-2 bg-[var(--bg-surface)] border-b border-[var(--border)] flex items-center justify-between text-xs shrink-0">
                  <span className="font-semibold text-blue-500 flex items-center gap-1.5">
                    <FileText size={14} /> Google Office Document Review ({officeEmbed.type})
                  </span>
                  <a
                    href={officeEmbed.rawUrl || candidateUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-secondary py-1 px-2.5 text-xs flex items-center gap-1"
                  >
                    Open in New Tab <ExternalLink size={11} />
                  </a>
                </div>
                <div className="flex-1 p-2 sm:p-4">
                  <iframe
                    src={officeEmbed.embedUrl}
                    title="Office Document Preview"
                    className="w-full h-full rounded-xl border border-[var(--border)] bg-white shadow-xl"
                    allow="autoplay"
                  />
                </div>
              </div>
            ) : activeLiveUrl ? (
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
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
                      referrerPolicy="no-referrer-when-downgrade"
                    />
                  </div>
                </div>

                <div className="px-4 py-2 bg-[var(--bg-surface)]/80 border-t border-[var(--border)] flex items-center justify-between text-[11px] text-[var(--text-muted)] shrink-0">
                  <span>
                    Viewing live deployed project.{' '}
                    <span className="hidden sm:inline">
                      If the host restricts iframe embedding, open the live URL directly in a new tab.
                    </span>
                  </span>
                  <a
                    href={activeLiveUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[var(--accent)] hover:underline font-semibold flex items-center gap-1"
                  >
                    Open Direct URL <ExternalLink size={11} />
                  </a>
                </div>
              </div>
            ) : activeGoogleDriveEmbed ? (
              <div className="flex-1 flex flex-col min-h-0 bg-[#121214]">
                <div className="px-4 py-2 bg-[var(--bg-surface)] border-b border-[var(--border)] flex items-center justify-between text-xs shrink-0">
                  <span className="font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                    <FileText size={14} className="text-[var(--accent)]" /> Google Drive File Preview
                  </span>
                  <a
                    href={candidateUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-secondary py-1 px-2.5 text-xs flex items-center gap-1"
                  >
                    Open in Google Drive <ExternalLink size={11} />
                  </a>
                </div>
                <div className="flex-1 p-3 sm:p-4">
                  <iframe
                    src={activeGoogleDriveEmbed}
                    width="100%"
                    height="100%"
                    allow="autoplay; fullscreen"
                    title="Submission Preview"
                    className="rounded-xl w-full h-full border-0 bg-white"
                  />
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                <div className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] mb-4">
                  {normGithub && !inspectingSub.fileUrl ? (
                    <Code2 size={36} className="text-[var(--accent)]" />
                  ) : activeGoogleDriveFolderUrl ? (
                    <ExternalLink size={36} className="text-[var(--accent)]" />
                  ) : (
                    <FileArchive size={36} className="text-[var(--accent)]" />
                  )}
                </div>
                <h3 className="text-base font-bold mb-1">
                  {inspectingSub.originalFileName ||
                    (normGithub
                      ? 'GitHub Repository Submission'
                      : activeGoogleDriveFolderUrl
                      ? 'Shared Cloud Folder / External Resource'
                      : 'File / Link Submission')}
                </h3>
                <p className="text-xs text-[var(--text-secondary)] max-w-md mb-5 leading-relaxed">
                  {inspectingSub.fileSizeBytes
                    ? `File Size: ${formatBytes(inspectingSub.fileSizeBytes)}`
                    : normGithub
                    ? 'Inspect repository source files directly inside the built-in Web IDE or open the repository on GitHub.'
                    : activeGoogleDriveFolderUrl
                    ? 'Google Drive folders open in a separate browser tab for security.'
                    : 'Open the submitted link or extract source files to review.'}
                </p>
                <div className="flex flex-wrap gap-2.5 justify-center">
                  {activeGoogleDriveFolderUrl && (
                    <a
                      href={activeGoogleDriveFolderUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-primary py-2 px-4 text-xs flex items-center gap-2"
                    >
                      <ExternalLink size={14} /> Open Shared Google Drive Folder
                    </a>
                  )}

                  {candidateUrl && !activeGoogleDriveFolderUrl && !normGithub && (
                    <a
                      href={candidateUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-primary py-2 px-4 text-xs flex items-center gap-2"
                    >
                      <ExternalLink size={14} /> Open Submitted Link
                    </a>
                  )}

                  {inspectingSub.fileUrl && (
                    <a
                      href={inspectingSub.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-secondary py-2 px-4 text-xs flex items-center gap-2"
                    >
                      <Download size={14} /> Download File
                    </a>
                  )}

                  {inspectingSub.fileUrl &&
                    (inspectingSub.fileUrl.toLowerCase().includes('.zip') ||
                      inspectingSub.originalFileName?.toLowerCase().endsWith('.zip')) && (
                      <button
                        type="button"
                        onClick={() => handleExtractZipSubmission(inspectingSub.fileUrl)}
                        disabled={extractingSource}
                        className="btn-primary py-2 px-4 text-xs flex items-center gap-2 shadow-sm cursor-pointer"
                      >
                        <FolderArchive size={14} />
                        {extractingSource ? 'Extracting ZIP...' : 'Extract & Inspect in Web IDE'}
                      </button>
                    )}

                  {normGithub && (
                    <button
                      type="button"
                      onClick={() => handleExtractGitHubSubmission(normGithub)}
                      disabled={extractingSource}
                      className="btn-primary py-2 px-4 text-xs flex items-center gap-2 shadow-sm cursor-pointer"
                    >
                      <Code2 size={14} />
                      {extractingSource ? 'Fetching GitHub...' : 'Load GitHub Code into Web IDE'}
                    </button>
                  )}

                  {normGithub && (
                    <a
                      href={normGithub}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-secondary py-2 px-4 text-xs flex items-center gap-2"
                    >
                      <ExternalLink size={14} /> Open on GitHub
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
                    rows={3}
                    placeholder="Write constructive remarks or comments for the student..."
                    className="input-field text-xs leading-relaxed"
                    value={gradeForm.feedback}
                    onChange={(e) => setGradeForm({ ...gradeForm, feedback: e.target.value })}
                  />

                  {/* One-Click Quick Feedback Presets */}
                  <div className="mt-2 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider block">
                      Rapid Feedback Suggestions:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {FEEDBACK_PRESETS.map((chip, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setGradeForm((prev) => ({
                              ...prev,
                              feedback: prev.feedback ? `${prev.feedback}\n${chip}` : chip,
                            }));
                          }}
                          className="text-[10px] py-1 px-2 rounded-lg bg-[var(--bg-primary)] border border-[var(--border)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors text-left"
                        >
                          {chip}
                        </button>
                      ))}
                    </div>
                  </div>

                  <p className="text-[11px] text-[var(--text-muted)] mt-1.5">
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

                  <div className="pt-3 border-t border-[var(--border)]">
                    <button
                      type="button"
                      onClick={() => setDeletingSub(inspectingSub)}
                      className="w-full py-2 px-3 rounded-xl border border-rose-500/30 text-rose-500 hover:bg-rose-500/10 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                      title="Permanently remove submission from database"
                    >
                      <Trash2 size={13} />
                      <span>Delete Submission & Allow Re-submit</span>
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </aside>
        </div>
        {renderDeleteModal()}
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
                        {getVideoEmbedUrl(sub.liveUrl || sub.driveLink || sub.fileUrl) ? (
                          <span className="inline-flex items-center gap-1 font-semibold text-rose-600">
                            <Video size={13} /> Video Submission
                          </span>
                        ) : getGoogleOfficeEmbedUrl(sub.liveUrl || sub.driveLink) ? (
                          <span className="inline-flex items-center gap-1 font-semibold text-blue-600">
                            <FileText size={13} /> Google Office Doc
                          </span>
                        ) : isImageUrl(sub.fileUrl, sub.originalFileName) ? (
                          <span className="inline-flex items-center gap-1 font-semibold text-fuchsia-600">
                            <ImageIcon size={13} /> Graphic / Artwork Image
                          </span>
                        ) : (sub.liveUrl || sub.driveLink) && !isGitHubRepoUrl(sub.liveUrl || sub.driveLink) ? (
                          <span className="inline-flex items-center gap-1 font-semibold text-emerald-600">
                            <Globe size={13} />{' '}
                            {(sub.liveUrl || sub.driveLink || '').includes('drive.google.com')
                              ? 'Google Drive Link'
                              : 'Live Deployed Link'}
                          </span>
                        ) : null}
                        {(sub.githubUrl || isGitHubRepoUrl(sub.liveUrl) || isGitHubRepoUrl(sub.driveLink)) && (
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
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openInspectStudio(sub)}
                          className="btn-primary py-1.5 px-3.5 text-xs inline-flex items-center gap-1.5 shadow-sm"
                        >
                          <Eye size={13} />
                          <span>Inspect & Grade</span>
                        </button>
                        <button
                          onClick={() => setDeletingSub(sub)}
                          className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 hover:text-rose-600 transition-colors inline-flex items-center"
                          title="Delete Submission from Database"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
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

        {renderDeleteModal()}
      </main>
    </div>
  );
};

export default AssignmentSubmissionsPage;
