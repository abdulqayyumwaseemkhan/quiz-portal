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
  Sparkles,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import StudentNavbar from '../components/StudentNavbar';
import WebIDE from '../components/WebIDE/WebIDE';
import { broadcastLiveUpdate, useLiveRefresh } from '../utils/liveSync';

const CATEGORY_CONFIG = {
  coding: { label: '💻 Coding & Web App', icon: Code2, color: 'text-indigo-600 bg-indigo-500/15' },
  research: { label: '📝 Research & Writing', icon: FileText, color: 'text-blue-600 bg-blue-500/15' },
  spreadsheet: { label: '📊 Spreadsheet & Data', icon: FileSpreadsheet, color: 'text-emerald-600 bg-emerald-500/15' },
  presentation: { label: '📽️ Presentation & Pitch', icon: Sparkles, color: 'text-amber-600 bg-amber-500/15' },
  graphic: { label: '🎨 Graphic & UI Design', icon: ImageIcon, color: 'text-fuchsia-600 bg-fuchsia-500/15' },
  video: { label: '🎬 Video & Media', icon: Video, color: 'text-rose-600 bg-rose-500/15' },
  general: { label: '📄 General', icon: FileArchive, color: 'text-gray-600 bg-gray-500/15' },
};

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
    const cleanLive = liveUrl.trim();
    const cleanGithub = githubUrl.trim();
    const cleanDrive = driveLink.trim();

    if (!file && !cleanLive && !cleanGithub && !cleanDrive) {
      toast.error('Please enter a live project link, GitHub URL, or attach a file');
      return;
    }

    setUploading(true);
    setProgress(0);

    const formData = new FormData();
    if (file) formData.append('file', file);
    if (assignmentTitle.trim()) formData.append('assignmentTitle', assignmentTitle.trim());
    if (cleanLive) formData.append('liveUrl', cleanLive);
    if (cleanGithub) formData.append('githubUrl', cleanGithub);
    if (cleanDrive) formData.append('driveLink', cleanDrive);

    try {
      const { data } = await API.post(
        `/student/assignments/${assignment._id}/submit/${student.studentId}`,
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              setProgress(Math.round((progressEvent.loaded * 100) / progressEvent.total));
            }
          },
        }
      );
      setStatus(data);
      setFile(null);
      setShowEditForm(false);
      if (onSubmitted) onSubmitted(assignment._id, data);
      broadcastLiveUpdate('ASSIGNMENT_SUBMITTED', {
        studentId: student.studentId,
        assignmentId: assignment._id,
      });
      toast.success('Assignment submitted successfully');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Submission failed');
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
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-600">
            <Award size={13} /> Graded: {status.marksObtained}/{maxScore}
          </span>
        );
      }
      if (status.isLate) {
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-600">
            <Clock size={13} /> Submitted Late
          </span>
        );
      }
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-500/15 text-sky-600">
          <CheckCircle size={13} /> Submitted
        </span>
      );
    }

    if (isPastDue) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-600">
          <Clock size={13} /> Past Due
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-[var(--bg-muted)] text-[var(--text-secondary)]">
        Pending
      </span>
    );
  };

  const categoryKey = assignment.category || (assignment.projectType === 'document' ? 'research' : 'coding');
  const catInfo = CATEGORY_CONFIG[categoryKey] || CATEGORY_CONFIG.coding;
  const CategoryIcon = catInfo.icon || Code2;

  return (
    <div className="card flex flex-col justify-between p-6">
      <div>
        <div className="flex items-start justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <div className={`p-2.5 rounded-xl ${catInfo.color}`}>
              <CategoryIcon size={20} />
            </div>
            <div>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${catInfo.color}`}>
                {catInfo.label}
              </span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            {renderStatusBadge()}
            <div className="flex items-center gap-2 text-[11px] text-[var(--text-muted)]">
              <span className="font-semibold text-[var(--text-secondary)]">
                {maxScore} Marks
              </span>
              <span>•</span>
              <span>Due: {new Date(assignment.dueDate).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        <h3 className="text-lg font-bold mb-1.5">{assignment.title}</h3>
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
                  className="text-[11px] font-bold text-[var(--accent)] hover:underline mt-1 mb-3 inline-block cursor-pointer"
                >
                  {expandedDesc ? 'Show Less ↑' : 'Read More ↓'}
                </button>
              )}
              {!isLongDesc && <div className="mb-4" />}
            </div>
          );
        })()}
      </div>

      <div className="pt-4 border-t border-[var(--border)] space-y-3">
        {status ? (
          <div className="space-y-3">
            {status.marksObtained !== null && status.marksObtained !== undefined && (
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-700 dark:text-emerald-400 text-sm">
                    Score: {status.marksObtained} / {maxScore}
                  </span>
                  <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-500/15 px-2 py-0.5 rounded-full">
                    {Math.round(((status.marksObtained) / maxScore) * 100)}%
                  </span>
                </div>
                {(status.remarks || status.feedback) && (
                  <div className="pt-2 border-t border-emerald-500/20">
                    <p className="font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
                      <MessageSquare size={13} /> Instructor Remarks
                    </p>
                    <p className="text-[var(--text-secondary)] mt-1 whitespace-pre-line leading-relaxed text-xs">
                      {status.remarks || status.feedback}
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-col gap-2">
              {status.liveUrl && (
                <a
                  href={status.liveUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-primary w-full py-2 text-xs flex items-center justify-center gap-1.5"
                >
                  <Globe size={14} /> Open Live Project (Vercel) <ExternalLink size={12} />
                </a>
              )}
              {status.githubUrl && (
                <a
                  href={status.githubUrl}
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
                      readOnly: status.marksObtained !== null && status.marksObtained !== undefined,
                    })
                  }
                  className="btn-secondary w-full py-2 text-xs flex items-center justify-center gap-1.5"
                >
                  <BookOpen size={15} />
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
                  <FileArchive size={15} /> Download Submitted File
                </a>
              )}
              {status.driveLink && status.driveLink !== status.liveUrl && (
                <a
                  href={status.driveLink}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-secondary w-full py-2 text-xs flex items-center justify-center gap-1.5"
                >
                  <ExternalLink size={15} /> View Attached Link
                </a>
              )}

              {status.marksObtained === null && !isLocked && status.submissionType !== 'ide' && (
                <button
                  type="button"
                  onClick={() => setShowEditForm(!showEditForm)}
                  className="btn-secondary w-full py-2 text-xs flex items-center justify-center gap-1.5"
                >
                  <Edit2 size={13} /> {showEditForm ? 'Cancel Update' : 'Update Project Link / File'}
                </button>
              )}
            </div>

            {showEditForm && (
              <div className="pt-3 border-t border-[var(--border)] space-y-2.5">
                <p className="text-[11px] font-semibold text-[var(--text-secondary)]">
                  Update your submission details below:
                </p>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={14} />
                  <input
                    type="url"
                    placeholder="Live Project / Vercel URL"
                    className="input-field pl-8 py-2 text-xs"
                    value={liveUrl}
                    onChange={(e) => setLiveUrl(e.target.value)}
                  />
                </div>
                <div className="relative">
                  <Code2 className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={14} />
                  <input
                    type="url"
                    placeholder="GitHub Repository URL"
                    className="input-field pl-8 py-2 text-xs"
                    value={githubUrl}
                    onChange={(e) => setGithubUrl(e.target.value)}
                  />
                </div>
                <button
                  type="button"
                  onClick={handleUpload}
                  disabled={uploading || (!file && !liveUrl.trim() && !githubUrl.trim() && !driveLink.trim())}
                  className="btn-primary w-full py-2 text-xs disabled:opacity-40"
                >
                  {uploading ? `Updating...` : 'Save Updated Submission'}
                </button>
              </div>
            )}
          </div>
        ) : isLocked ? (
          <button
            disabled
            className="w-full py-2.5 rounded-xl bg-[var(--bg-muted)] text-[var(--text-muted)] text-xs font-semibold cursor-not-allowed"
          >
            Submission Closed
          </button>
        ) : (
          <div className="space-y-3">
            {/* Category-Specific Submission Form */}
            {categoryKey === 'research' && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-[var(--text-secondary)]">
                    Google Docs / Research Paper Link:
                  </span>
                  <a
                    href="https://docs.new"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] font-bold text-[var(--accent)] hover:underline flex items-center gap-1"
                  >
                    Open Google Docs <ExternalLink size={10} />
                  </a>
                </div>
                <div className="relative">
                  <FileText className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={14} />
                  <input
                    type="url"
                    placeholder="https://docs.google.com/document/d/... (Make link shareable)"
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
                  <span className="text-[11px] font-semibold text-[var(--text-secondary)]">
                    Google Sheets / Spreadsheet Link:
                  </span>
                  <a
                    href="https://sheets.new"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] font-bold text-emerald-600 hover:underline flex items-center gap-1"
                  >
                    Open Google Sheets <ExternalLink size={10} />
                  </a>
                </div>
                <div className="relative">
                  <FileSpreadsheet className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500" size={14} />
                  <input
                    type="url"
                    placeholder="https://docs.google.com/spreadsheets/d/... (Share view link)"
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
                  <span className="text-[11px] font-semibold text-[var(--text-secondary)]">
                    Google Slides / Canva / Pitch Link:
                  </span>
                  <a
                    href="https://slides.new"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] font-bold text-amber-600 hover:underline flex items-center gap-1"
                  >
                    Open Google Slides <ExternalLink size={10} />
                  </a>
                </div>
                <div className="relative">
                  <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-500" size={14} />
                  <input
                    type="url"
                    placeholder="https://docs.google.com/presentation/d/... or Canva link"
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
                <span className="text-[11px] font-semibold text-[var(--text-secondary)] block">
                  Video Demonstration Link (YouTube / Loom / Drive / Vimeo):
                </span>
                <div className="relative">
                  <Video className="absolute left-3 top-1/2 -translate-y-1/2 text-rose-500" size={14} />
                  <input
                    type="url"
                    placeholder="e.g. https://www.youtube.com/watch?v=... or https://loom.com/share/..."
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
                <span className="text-[11px] font-semibold text-[var(--text-secondary)] block">
                  Design Link (Figma / Behance / Dribbble):
                </span>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-fuchsia-500" size={14} />
                  <input
                    type="url"
                    placeholder="e.g. https://www.figma.com/file/... or Behance URL"
                    className="input-field pl-8 py-2 text-xs"
                    value={liveUrl}
                    onChange={(e) => setLiveUrl(e.target.value)}
                  />
                </div>
              </>
            )}

            {categoryKey === 'coding' && (
              <>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={14} />
                  <input
                    type="url"
                    placeholder="Live Project / Vercel URL (e.g. https://my-app.vercel.app)"
                    className="input-field pl-8 py-2 text-xs"
                    value={liveUrl}
                    onChange={(e) => setLiveUrl(e.target.value)}
                  />
                </div>

                <div className="relative">
                  <Code2 className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={14} />
                  <input
                    type="url"
                    placeholder="GitHub Repository URL (e.g. https://github.com/...)"
                    className="input-field pl-8 py-2 text-xs"
                    value={githubUrl}
                    onChange={(e) => setGithubUrl(e.target.value)}
                  />
                </div>
              </>
            )}

            {/* File Upload Zone Adapted to Category */}
            <label className="flex flex-col items-center justify-center w-full p-3 bg-[var(--bg-muted)] border border-dashed border-[var(--border)] rounded-xl cursor-pointer hover:border-[var(--accent)] text-xs transition-colors">
              <div className="flex items-center gap-2 text-[var(--text-secondary)] font-medium">
                <UploadCloud className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
                <span className="truncate">
                  {file
                    ? file.name
                    : categoryKey === 'graphic'
                    ? 'Upload Artwork / Design Image (PNG, JPG, SVG, WebP)'
                    : categoryKey === 'spreadsheet'
                    ? 'Attach Excel / CSV File (.xlsx, .xls, .csv)'
                    : categoryKey === 'research'
                    ? 'Attach Research PDF / Word Document (.pdf, .docx)'
                    : categoryKey === 'presentation'
                    ? 'Attach Slide Deck (.pptx, .pdf)'
                    : categoryKey === 'video'
                    ? 'Upload Video File / MP4 (Up to 10MB)'
                    : 'Upload ZIP / Source Archive (Optional)'}
                </span>
              </div>
              <input
                type="file"
                className="hidden"
                accept={
                  categoryKey === 'graphic'
                    ? 'image/png,image/jpeg,image/webp,image/svg+xml'
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
                onChange={(e) => {
                  const selected = e.target.files?.[0];
                  if (!selected) return;
                  if (selected.size > 10 * 1024 * 1024) {
                    toast.error('File exceeds 10MB limit. Use a Google Drive, Vercel, or YouTube link for larger files.');
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
                }}
                disabled={uploading}
              />
            </label>

            {imagePreview && (
              <div className="relative rounded-lg overflow-hidden border border-[var(--border)] max-h-36 flex items-center justify-center bg-black/10">
                <img src={imagePreview} alt="Preview" className="max-h-36 object-contain" />
              </div>
            )}

            {uploading && (
              <div className="w-full bg-[var(--bg-muted)] h-1.5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[var(--accent)] transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}

            <button
              type="button"
              onClick={handleUpload}
              disabled={uploading || (!file && !liveUrl.trim() && !githubUrl.trim() && !driveLink.trim())}
              className="btn-primary w-full py-2.5 text-xs disabled:opacity-40"
            >
              {uploading ? `Uploading ${progress}%...` : isPastDue ? 'Submit Late' : 'Submit Assignment'}
            </button>

            {categoryKey === 'coding' && (
              <button
                type="button"
                onClick={() => setIdeAssignment({ assignment, status })}
                className="btn-secondary w-full py-2.5 text-xs flex items-center justify-center gap-1.5"
              >
                <BookOpen size={15} /> Open Built-in Web IDE
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const StudentAssignmentsPage = () => {
  const [assignments, setAssignments] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState(''); // '' | 'pending' | 'submitted' | 'graded'
  const [loading, setLoading] = useState(true);
  const [ideAssignment, setIdeAssignment] = useState(null);
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

  const fetchAssignments = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const { data } = await API.get(`/student/assignments/${student.studentId}`);
      setAssignments(data);
    } catch (error) {
      console.error(error);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [student]);

  useEffect(() => {
    if (student) fetchAssignments(false);
  }, [student, fetchAssignments]);

  // Live silent background sync: revalidates when admin grades/creates an assignment or when student re-focuses tab
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
      <div className="fixed inset-0 z-50 flex flex-col bg-[var(--bg-primary)]">
        <div className="flex items-center justify-between px-3 sm:px-6 py-2.5 bg-[var(--bg-surface)] border-b border-[var(--border)] shrink-0">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            <button
              onClick={() => setIdeAssignment(null)}
              className="text-xs sm:text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
            >
              ← Back
            </button>
            <h2 className="text-xs sm:text-sm font-bold truncate max-w-[200px] sm:max-w-md">
              {ideAssignment.assignment.title}
            </h2>
          </div>
          {ideAssignment.readOnly && (
            <span className="text-[11px] font-semibold text-[var(--text-muted)] bg-[var(--bg-muted)] px-2.5 py-0.5 rounded-full">
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
    <div className="min-h-screen pb-20 md:pb-12">
      <StudentNavbar student={student} />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8">
        <header className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Assignments</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Submit projects via file upload, repository/Drive link, or built-in Web IDE
          </p>
        </header>

        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={18} />
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
              <div key={n} className="h-64 rounded-2xl bg-[var(--bg-muted)] animate-pulse" />
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
          <div className="card p-14 text-center">
            <FileArchive className="mx-auto text-[var(--text-muted)] mb-3" size={40} />
            <p className="font-semibold text-base">No assignments found</p>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              You are all caught up on your coursework.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentAssignmentsPage;
