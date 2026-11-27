import React, { useState, useEffect, useMemo, useCallback } from 'react';
import API from '../api';
import {
  FileArchive,
  UploadCloud,
  CheckCircle,
  Clock,
  Search,
  BookOpen,
  Award,
  ExternalLink,
  Globe,
  Code2,
  MessageSquare,
  Edit2,
  Video,
  FileSpreadsheet,
  FileText,
  Image as ImageIcon,
  Presentation,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import StudentNavbar from '../components/StudentNavbar';
import WebIDE from '../components/WebIDE/WebIDE';
import { broadcastLiveUpdate, useLiveRefresh } from '../utils/liveSync';
import { clientCache } from '../utils/clientCache';

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

function isValidWebUrl(urlStr = '') {
  if (!urlStr) return true;
  try {
    const parsed = new URL(urlStr);
    return (
      (parsed.protocol === 'http:' || parsed.protocol === 'https:') &&
      (parsed.hostname.includes('.') || parsed.hostname === 'localhost')
    );
  } catch {
    return false;
  }
}

const CATEGORY_CONFIG = {
  coding: { label: 'Coding & Web App', icon: Code2 },
  research: { label: 'Research & Writing', icon: FileText },
  spreadsheet: { label: 'Spreadsheet & Data', icon: FileSpreadsheet },
  presentation: { label: 'Presentation & Slides', icon: Presentation },
  graphic: { label: 'Graphic & UI Design', icon: ImageIcon },
  video: { label: 'Video Demonstration', icon: Video },
  general: { label: 'Coursework', icon: FileArchive },
};

const MAX_DIRECT_FILE_BYTES = 4 * 1024 * 1024; // 4 MB (Vercel Serverless safe payload limit)

const AssignmentCard = ({ assignment, student, setIdeAssignment, onSubmitted }) => {
  const [status, setStatus] = useState(assignment.mySubmission || null);
  const [file, setFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [liveUrl, setLiveUrl] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [driveLink, setDriveLink] = useState('');
  const [assignmentTitle, setAssignmentTitle] = useState('');
  const [showEditForm, setShowEditForm] = useState(false);
  const [expandedDesc, setExpandedDesc] = useState(false);

  const categoryKey =
    assignment.category || (assignment.projectType === 'document' ? 'research' : 'coding');
  const catInfo = CATEGORY_CONFIG[categoryKey] || CATEGORY_CONFIG.coding;
  const CategoryIcon = catInfo.icon || Code2;

  useEffect(() => {
    setStatus(assignment.mySubmission || null);
    if (assignment.mySubmission) {
      setLiveUrl(assignment.mySubmission.liveUrl || '');
      setGithubUrl(assignment.mySubmission.githubUrl || '');
      setDriveLink(assignment.mySubmission.driveLink || '');
      setAssignmentTitle(assignment.mySubmission.assignmentTitle || '');
    }
  }, [assignment.mySubmission]);

  const handleUpload = async () => {
    const cleanLive = ensureHttpsUrl(liveUrl);
    const cleanGithub = ensureHttpsUrl(githubUrl);
    const cleanDrive = ensureHttpsUrl(driveLink);

    if (!file && !cleanLive && !cleanGithub && !cleanDrive) {
      toast.error('Please enter a project link, GitHub URL, Drive link, or attach a file');
      return;
    }

    if (!isValidWebUrl(cleanLive) || !isValidWebUrl(cleanGithub) || !isValidWebUrl(cleanDrive)) {
      toast.error('Please enter a valid web URL (for example: https://my-app.vercel.app)');
      return;
    }

    setUploading(true);
    setProgress(0);

    const endpoint = `/student/assignments/${assignment._id}/submit/${student.studentId}`;

    try {
      let data;
      if (file) {
        // Let Axios/Browser automatically attach the multipart boundary header
        const formData = new FormData();
        formData.append('file', file);
        formData.append('assignmentTitle', assignmentTitle.trim());
        formData.append('liveUrl', cleanLive);
        formData.append('githubUrl', cleanGithub);
        formData.append('driveLink', cleanDrive);

        const res = await API.post(endpoint, formData, {
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              setProgress(Math.round((progressEvent.loaded * 100) / progressEvent.total));
            }
          },
        });
        data = res.data;
      } else {
        // Pure JSON submission for deployed URLs & links — fast, reliable, zero multipart overhead
        const res = await API.post(endpoint, {
          assignmentTitle: assignmentTitle.trim(),
          liveUrl: cleanLive,
          githubUrl: cleanGithub,
          driveLink: cleanDrive,
        });
        data = res.data;
      }

      setStatus(data);
      setFile(null);
      setImagePreview(null);
      setShowEditForm(false);
      if (onSubmitted) onSubmitted(assignment._id, data);
      broadcastLiveUpdate('ASSIGNMENT_SUBMITTED', {
        studentId: student.studentId,
        assignmentId: assignment._id,
      });
      toast.success('Assignment submitted successfully');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Submission failed. Please check your link or file.');
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const isPastDue = new Date() > new Date(assignment.dueDate);
  const canSubmitLate = assignment.allowLateSubmission !== false;
  const isLocked = !status && isPastDue && !canSubmitLate;
  const maxScore = assignment.totalMarks || status?.maxMarks || 20;

  const renderStatusBadge = () => {
    if (status) {
      if (status.marksObtained !== null && status.marksObtained !== undefined) {
        return (
          <span className="academic-badge academic-badge-success">
            <Award size={12} /> Graded: {status.marksObtained}/{maxScore}
          </span>
        );
      }
      if (status.isLate) {
        return (
          <span className="academic-badge academic-badge-warning">
            <Clock size={12} /> Submitted Late
          </span>
        );
      }
      return (
        <span className="academic-badge academic-badge-info">
          <CheckCircle size={12} /> Submitted
        </span>
      );
    }

    if (isPastDue) {
      return (
        <span className="academic-badge academic-badge-danger">
          <Clock size={12} /> Past Due
        </span>
      );
    }

    return <span className="academic-badge">Pending</span>;
  };

  const handleFileSelect = (e) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    if (selected.size > MAX_DIRECT_FILE_BYTES) {
      toast.error(
        'Direct file upload limit is 4MB. For larger files, upload to Google Drive or deploy on Vercel/GitHub and share the link.'
      );
      e.target.value = '';
      return;
    }
    setFile(selected);
    if (selected.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => setImagePreview(reader.result);
      reader.readAsDataURL(selected);
    } else {
      setImagePreview(null);
    }
  };

  const renderCategoryInputs = () => (
    <>
      {categoryKey === 'research' && (
        <>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-[var(--text-secondary)]">
              Google Docs / Paper Link:
            </span>
            <a
              href="https://docs.new"
              target="_blank"
              rel="noreferrer"
              className="text-[11px] font-semibold text-[var(--accent)] hover:underline flex items-center gap-1"
            >
              Open Google Docs <ExternalLink size={10} />
            </a>
          </div>
          <div className="relative">
            <FileText
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]"
              size={14}
            />
            <input
              type="text"
              placeholder="https://docs.google.com/document/d/..."
              className="input-field pl-8 py-2 text-xs"
              value={driveLink || liveUrl}
              onChange={(e) => {
                setDriveLink(e.target.value);
                setLiveUrl(e.target.value);
              }}
            />
          </div>
          <input
            type="text"
            placeholder="Research Title / Topic (Optional)"
            className="input-field py-2 text-xs"
            value={assignmentTitle}
            onChange={(e) => setAssignmentTitle(e.target.value)}
          />
        </>
      )}

      {categoryKey === 'spreadsheet' && (
        <>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-[var(--text-secondary)]">
              Google Sheets / Workbook Link:
            </span>
            <a
              href="https://sheets.new"
              target="_blank"
              rel="noreferrer"
              className="text-[11px] font-semibold text-[var(--accent)] hover:underline flex items-center gap-1"
            >
              Open Google Sheets <ExternalLink size={10} />
            </a>
          </div>
          <div className="relative">
            <FileSpreadsheet
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]"
              size={14}
            />
            <input
              type="text"
              placeholder="https://docs.google.com/spreadsheets/d/..."
              className="input-field pl-8 py-2 text-xs"
              value={driveLink || liveUrl}
              onChange={(e) => {
                setDriveLink(e.target.value);
                setLiveUrl(e.target.value);
              }}
            />
          </div>
        </>
      )}

      {categoryKey === 'presentation' && (
        <>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-[var(--text-secondary)]">
              Google Slides / Canva / Presentation Link:
            </span>
            <a
              href="https://slides.new"
              target="_blank"
              rel="noreferrer"
              className="text-[11px] font-semibold text-[var(--accent)] hover:underline flex items-center gap-1"
            >
              Open Google Slides <ExternalLink size={10} />
            </a>
          </div>
          <div className="relative">
            <Presentation
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]"
              size={14}
            />
            <input
              type="text"
              placeholder="https://docs.google.com/presentation/d/... or Canva URL"
              className="input-field pl-8 py-2 text-xs"
              value={driveLink || liveUrl}
              onChange={(e) => {
                setDriveLink(e.target.value);
                setLiveUrl(e.target.value);
              }}
            />
          </div>
        </>
      )}

      {categoryKey === 'video' && (
        <>
          <span className="text-[11px] font-medium text-[var(--text-secondary)] block">
            Video Link (YouTube / Loom / Google Drive / Vimeo):
          </span>
          <div className="relative">
            <Video
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]"
              size={14}
            />
            <input
              type="text"
              placeholder="https://www.youtube.com/watch?v=..."
              className="input-field pl-8 py-2 text-xs"
              value={liveUrl || driveLink}
              onChange={(e) => {
                setLiveUrl(e.target.value);
                setDriveLink(e.target.value);
              }}
            />
          </div>
        </>
      )}

      {categoryKey === 'graphic' && (
        <>
          <span className="text-[11px] font-medium text-[var(--text-secondary)] block">
            Design Link (Figma / Canva / Behance / Drive):
          </span>
          <div className="relative">
            <Globe
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]"
              size={14}
            />
            <input
              type="text"
              placeholder="https://www.figma.com/design/..."
              className="input-field pl-8 py-2 text-xs"
              value={liveUrl}
              onChange={(e) => setLiveUrl(e.target.value)}
            />
          </div>
        </>
      )}

      {(categoryKey === 'coding' || categoryKey === 'general') && (
        <>
          <div className="relative">
            <Globe
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]"
              size={14}
            />
            <input
              type="text"
              placeholder="Live Deployed URL (e.g. https://my-app.vercel.app)"
              className="input-field pl-8 py-2 text-xs"
              value={liveUrl}
              onChange={(e) => setLiveUrl(e.target.value)}
            />
          </div>

          <div className="relative">
            <Code2
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]"
              size={14}
            />
            <input
              type="text"
              placeholder="GitHub Repository URL (e.g. https://github.com/user/repo)"
              className="input-field pl-8 py-2 text-xs"
              value={githubUrl}
              onChange={(e) => setGithubUrl(e.target.value)}
            />
          </div>
        </>
      )}

      <label className="flex flex-col items-center justify-center w-full p-2.5 bg-[var(--bg-input)] border border-dashed border-[var(--border)] rounded-md cursor-pointer hover:border-[var(--brand-secondary)] text-xs transition-colors">
        <div className="flex items-center gap-2 text-[var(--text-secondary)] font-medium">
          <UploadCloud className="w-4 h-4 shrink-0" />
          <span className="truncate">
            {file
              ? file.name
              : categoryKey === 'graphic'
              ? 'Attach Design Image (PNG, JPG, SVG, WebP — max 4MB)'
              : categoryKey === 'spreadsheet'
              ? 'Attach Excel / CSV File (.xlsx, .csv — max 4MB)'
              : categoryKey === 'research'
              ? 'Attach Document (.pdf, .docx — max 4MB)'
              : categoryKey === 'presentation'
              ? 'Attach Slide Deck (.pptx, .pdf — max 4MB)'
              : categoryKey === 'video'
              ? 'Attach Short Video Clip (max 4MB) or use Link above'
              : 'Upload Project ZIP Archive (Optional — max 4MB)'}
          </span>
        </div>
        <input
          type="file"
          className="hidden"
          accept={
            categoryKey === 'graphic'
              ? 'image/png,image/jpeg,image/webp,image/svg+xml,image/gif'
              : categoryKey === 'spreadsheet'
              ? '.xlsx,.xls,.csv'
              : categoryKey === 'research'
              ? '.pdf,.doc,.docx,.txt'
              : categoryKey === 'presentation'
              ? '.pptx,.ppt,.pdf'
              : categoryKey === 'video'
              ? 'video/mp4,video/webm'
              : '.zip,.pdf,.doc,.docx,.ppt,.pptx'
          }
          onChange={handleFileSelect}
          disabled={uploading}
        />
      </label>

      {imagePreview && (
        <div className="relative rounded-md overflow-hidden border border-[var(--border)] max-h-36 flex items-center justify-center bg-[var(--bg-muted)]">
          <img src={imagePreview} alt="Preview" className="max-h-36 object-contain" />
        </div>
      )}

      {uploading && file && (
        <div className="w-full bg-[var(--bg-muted)] h-1.5 rounded-sm overflow-hidden">
          <div
            className="h-full bg-[var(--accent)] transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </>
  );

  const safeStatusLiveUrl = ensureHttpsUrl(status?.liveUrl);
  const safeStatusGithubUrl = ensureHttpsUrl(status?.githubUrl);
  const safeStatusDriveLink = ensureHttpsUrl(status?.driveLink);

  return (
    <div className="card flex flex-col justify-between p-5">
      <div>
        <div className="flex items-start justify-between gap-2 mb-3.5">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded bg-[var(--accent-subtle)] text-[var(--accent)]">
              <CategoryIcon size={17} />
            </div>
            <span className="academic-badge">{catInfo.label}</span>
          </div>
          <div className="flex flex-col items-end gap-1">
            {renderStatusBadge()}
            <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-secondary)]">
              <span className="font-semibold text-[var(--text-primary)]">{maxScore} Marks</span>
              <span>·</span>
              <span>Due: {new Date(assignment.dueDate).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        <h3 className="text-base font-bold mb-1.5 text-[var(--text-primary)]">
          {assignment.title}
        </h3>
        {(() => {
          const fullDesc = assignment.description || 'No additional instructions.';
          const isLongDesc = fullDesc.length > 130;
          return (
            <div>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed whitespace-pre-line">
                {expandedDesc || !isLongDesc ? fullDesc : `${fullDesc.slice(0, 130)}...`}
              </p>
              {isLongDesc && (
                <button
                  type="button"
                  onClick={() => setExpandedDesc(!expandedDesc)}
                  className="text-[11px] font-semibold text-[var(--accent)] hover:underline mt-1 mb-3 inline-block cursor-pointer"
                >
                  {expandedDesc ? 'Show Less' : 'Read More'}
                </button>
              )}
              {!isLongDesc && <div className="mb-4" />}
            </div>
          );
        })()}
      </div>

      <div className="pt-3.5 border-t border-[var(--border)] space-y-3">
        {status ? (
          <div className="space-y-3">
            {status.marksObtained !== null && status.marksObtained !== undefined && (
              <div className="p-3.5 rounded-md academic-badge-success border block space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm">
                    Score: {status.marksObtained} / {maxScore}
                  </span>
                  <span className="text-xs font-semibold">
                    {Math.round((status.marksObtained / maxScore) * 100)}%
                  </span>
                </div>
                {(status.remarks || status.feedback) && (
                  <div className="pt-2 border-t border-[var(--status-success-border)]">
                    <p className="font-semibold flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
                      <MessageSquare size={12} /> Instructor Feedback
                    </p>
                    <p className="text-[var(--text-primary)] mt-1 whitespace-pre-line leading-relaxed text-xs font-normal">
                      {status.remarks || status.feedback}
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-col gap-2">
              {safeStatusLiveUrl && (
                <a
                  href={safeStatusLiveUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-primary w-full py-2 text-xs flex items-center justify-center gap-1.5"
                >
                  <Globe size={14} /> Open Live Project <ExternalLink size={12} />
                </a>
              )}
              {safeStatusGithubUrl && (
                <a
                  href={safeStatusGithubUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-secondary w-full py-2 text-xs flex items-center justify-center gap-1.5"
                >
                  <Code2 size={14} /> GitHub Repository <ExternalLink size={12} />
                </a>
              )}
              {status.submissionType === 'ide' && (
                <button
                  onClick={() =>
                    setIdeAssignment({
                      assignment,
                      status,
                      readOnly:
                        status.marksObtained !== null && status.marksObtained !== undefined,
                    })
                  }
                  className="btn-secondary w-full py-2 text-xs flex items-center justify-center gap-1.5"
                >
                  <BookOpen size={14} />
                  {status.marksObtained !== null && status.marksObtained !== undefined
                    ? 'View Graded Workspace'
                    : 'Edit / Update Workspace'}
                </button>
              )}
              {status.fileUrl && (
                <a
                  href={status.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-secondary w-full py-2 text-xs flex items-center justify-center gap-1.5"
                >
                  <FileArchive size={14} /> Download Submitted File
                </a>
              )}
              {safeStatusDriveLink && safeStatusDriveLink !== safeStatusLiveUrl && (
                <a
                  href={safeStatusDriveLink}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-secondary w-full py-2 text-xs flex items-center justify-center gap-1.5"
                >
                  <ExternalLink size={14} /> Open Submitted Link
                </a>
              )}

              {status.marksObtained === null &&
                !isLocked &&
                status.submissionType !== 'ide' && (
                  <button
                    type="button"
                    onClick={() => setShowEditForm(!showEditForm)}
                    className="btn-secondary w-full py-2 text-xs flex items-center justify-center gap-1.5"
                  >
                    <Edit2 size={13} />{' '}
                    {showEditForm ? 'Cancel Update' : 'Update Link / File'}
                  </button>
                )}
            </div>

            {showEditForm && (
              <div className="pt-3 border-t border-[var(--border)] space-y-2.5">
                <p className="text-[11px] font-semibold text-[var(--text-secondary)]">
                  Update your submission link or file below:
                </p>
                {renderCategoryInputs()}
                <button
                  type="button"
                  onClick={handleUpload}
                  disabled={
                    uploading ||
                    (!file && !liveUrl.trim() && !githubUrl.trim() && !driveLink.trim())
                  }
                  className="btn-primary w-full py-2 text-xs disabled:opacity-40"
                >
                  {uploading ? 'Saving Update...' : 'Save Updated Submission'}
                </button>
              </div>
            )}
          </div>
        ) : isLocked ? (
          <button
            disabled
            className="w-full py-2 rounded-md bg-[var(--bg-muted)] border border-[var(--border)] text-[var(--text-secondary)] text-xs font-medium cursor-not-allowed"
          >
            Submission Closed
          </button>
        ) : (
          <div className="space-y-2.5">
            {renderCategoryInputs()}

            <button
              type="button"
              onClick={handleUpload}
              disabled={
                uploading ||
                (!file && !liveUrl.trim() && !githubUrl.trim() && !driveLink.trim())
              }
              className="btn-primary w-full py-2 text-xs disabled:opacity-40"
            >
              {uploading
                ? file
                  ? `Uploading ${progress}%...`
                  : 'Submitting...'
                : isPastDue
                ? 'Submit Late'
                : 'Submit Assignment'}
            </button>

            {categoryKey === 'coding' && (
              <button
                type="button"
                onClick={() => setIdeAssignment({ assignment, status })}
                className="btn-secondary w-full py-2 text-xs flex items-center justify-center gap-1.5"
              >
                <Code2 size={14} /> Open Built-in Web IDE
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const StudentAssignmentsPage = () => {
  const student = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('studentInfo'));
    } catch {
      return null;
    }
  }, []);

  const cacheKey = student?.studentId ? `student_assignments_${student.studentId}` : null;
  const cached = cacheKey ? clientCache.get(cacheKey) : null;

  const [assignments, setAssignments] = useState(cached || []);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [loading, setLoading] = useState(!cached);
  const [ideAssignment, setIdeAssignment] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!student) {
      navigate('/', { replace: true });
    }
  }, [student, navigate]);

  const fetchAssignments = useCallback(
    async (silent = false) => {
      const hasCache = cacheKey && clientCache.has(cacheKey);
      if (!silent && !hasCache) setLoading(true);
      try {
        const { data } = await API.get(`/student/assignments/${student.studentId}`);
        setAssignments(data);
        if (cacheKey) clientCache.set(cacheKey, data);
      } catch (error) {
        console.error(error);
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [student, cacheKey]
  );

  useEffect(() => {
    if (student) fetchAssignments(cacheKey && clientCache.has(cacheKey) ? true : false);
  }, [student, fetchAssignments, cacheKey]);

  useLiveRefresh(fetchAssignments, 8000, [
    'ASSIGNMENT_GRADED',
    'ASSIGNMENT_CREATED',
    'ASSIGNMENT_UPDATED',
    'ASSIGNMENT_SUBMISSION_DELETED',
  ]);

  const handleSubmittedUpdate = (assignmentId, subData) => {
    setAssignments((prev) =>
      prev.map((a) => (a._id === assignmentId ? { ...a, mySubmission: subData } : a))
    );
  };

  const filteredAssignments = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return assignments.filter((a) => {
      const matchSearch = !q || a.title.toLowerCase().includes(q);
      const sub = a.mySubmission;
      const matchStatus =
        filterStatus === ''
          ? true
          : filterStatus === 'pending'
          ? !sub
          : filterStatus === 'graded'
          ? sub && sub.marksObtained !== null && sub.marksObtained !== undefined
          : Boolean(sub);
      return matchSearch && matchStatus;
    });
  }, [assignments, searchTerm, filterStatus]);

  const handleIdeSubmit = async (projectData) => {
    if (!ideAssignment) return;
    try {
      const { data } = await API.post(
        `/student/assignments/${ideAssignment.assignment._id}/submit-ide/${student.studentId}`,
        { projectData }
      );
      toast.success('Workspace submitted successfully!');
      handleSubmittedUpdate(ideAssignment.assignment._id, data);
      broadcastLiveUpdate('ASSIGNMENT_SUBMITTED', {
        studentId: student.studentId,
        assignmentId: ideAssignment.assignment._id,
      });
      setIdeAssignment(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit workspace');
      throw err;
    }
  };

  if (ideAssignment) {
    return (
      <div className="student-portal fixed inset-0 z-50 flex flex-col bg-[var(--bg-primary)]">
        <div className="flex items-center justify-between px-3 sm:px-6 h-12 bg-[var(--bg-sidebar)] text-[var(--sidebar-text)] border-b border-[var(--sidebar-border)] shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setIdeAssignment(null)}
              className="text-xs font-semibold text-[var(--sidebar-muted)] hover:text-white cursor-pointer"
            >
              ← Back to Assignments
            </button>
            <h2 className="text-xs sm:text-sm font-bold text-white truncate max-w-[200px] sm:max-w-md">
              {ideAssignment.assignment.title}
            </h2>
          </div>
          {ideAssignment.readOnly && (
            <span className="text-[11px] font-medium text-[var(--sidebar-muted)] border border-[var(--sidebar-border)] px-2.5 py-0.5 rounded">
              Read-Only
            </span>
          )}
        </div>
        <div className="flex-1 min-h-0">
          <WebIDE
            initialProjectData={ideAssignment.status?.projectData}
            onSubmit={handleIdeSubmit}
            studentId={student.studentId}
            assignmentId={ideAssignment.assignment._id}
            projectType={ideAssignment.assignment.projectType}
            readOnly={ideAssignment.readOnly}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="student-portal min-h-screen pb-16">
      <StudentNavbar student={student} />
      <main className="lg:pl-60">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8">
          <header className="mb-6">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)]">
              Course Assignments
            </h1>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              Submit coursework via deployed URL, GitHub repository, cloud document link, or built-in Web IDE
            </p>
          </header>

          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Search
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]"
                size={16}
              />
              <input
                type="text"
                placeholder="Search assignments..."
                className="input-field pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <select
              className="input-field sm:w-48"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="submitted">Submitted</option>
              <option value="graded">Graded</option>
            </select>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[1, 2, 3].map((n) => (
                <div
                  key={n}
                  className="h-60 rounded-md bg-[var(--bg-surface)] border border-[var(--border)] animate-pulse"
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredAssignments.map((assignment) => (
                <AssignmentCard
                  key={assignment._id}
                  assignment={assignment}
                  student={student}
                  setIdeAssignment={setIdeAssignment}
                  onSubmitted={handleSubmittedUpdate}
                />
              ))}
            </div>
          )}

          {filteredAssignments.length === 0 && !loading && (
            <div className="card p-12 text-center">
              <FileArchive className="mx-auto text-[var(--text-secondary)] mb-3" size={34} />
              <p className="font-semibold text-base text-[var(--text-primary)]">
                No assignments found
              </p>
              <p className="text-xs text-[var(--text-secondary)] mt-1">
                You are all caught up on your coursework.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default StudentAssignmentsPage;
