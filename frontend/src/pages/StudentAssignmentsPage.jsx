import React, { useState, useEffect, useMemo } from 'react';
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
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import StudentNavbar from '../components/StudentNavbar';
import WebIDE from '../components/WebIDE/WebIDE';

const AssignmentCard = ({ assignment, student, setIdeAssignment, onSubmitted }) => {
  const [status, setStatus] = useState(assignment.mySubmission || null);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [assignmentTitle, setAssignmentTitle] = useState('');
  const [assignmentDetails, setAssignmentDetails] = useState('');
  const [driveLink, setDriveLink] = useState('');

  useEffect(() => {
    if (assignment.mySubmission) {
      setStatus(assignment.mySubmission);
    }
  }, [assignment.mySubmission]);

  const handleUpload = async () => {
    if (!file && !driveLink.trim()) {
      toast.error('Please attach a file or provide a project/Drive link');
      return;
    }

    setUploading(true);
    setProgress(0);

    const formData = new FormData();
    if (file) formData.append('file', file);
    if (assignmentTitle.trim()) formData.append('assignmentTitle', assignmentTitle.trim());
    if (assignmentDetails.trim()) formData.append('assignmentDetails', assignmentDetails.trim());
    if (driveLink.trim()) formData.append('driveLink', driveLink.trim());

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
      if (onSubmitted) onSubmitted(assignment._id, data);
      toast.success('Assignment submitted');
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

  const renderStatusBadge = () => {
    if (status) {
      if (status.marksObtained !== null && status.marksObtained !== undefined) {
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-600">
            <Award size={13} /> Graded: {status.marksObtained}/{status.maxMarks || assignment.totalMarks || 100}
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

  return (
    <div className="card flex flex-col justify-between p-6">
      <div>
        <div className="flex items-start justify-between gap-2 mb-4">
          <div className="p-2.5 rounded-xl bg-[var(--accent-subtle)] text-[var(--accent)]">
            <FileArchive size={20} />
          </div>
          <div className="flex flex-col items-end gap-1">
            {renderStatusBadge()}
            <span className="text-[11px] text-[var(--text-muted)]">
              Due: {new Date(assignment.dueDate).toLocaleString()}
            </span>
          </div>
        </div>

        <h3 className="text-lg font-bold mb-1.5">{assignment.title}</h3>
        <p className="text-xs text-[var(--text-secondary)] leading-relaxed mb-4 whitespace-pre-line">
          {assignment.description || 'No additional instructions.'}
        </p>
      </div>

      <div className="pt-4 border-t border-[var(--border)] space-y-3">
        {status ? (
          <div className="space-y-3">
            {status.marksObtained !== null && status.marksObtained !== undefined && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs">
                <p className="font-bold text-emerald-700 dark:text-emerald-400">
                  Score: {status.marksObtained} / {status.maxMarks || assignment.totalMarks || 100}
                </p>
                {status.feedback && (
                  <p className="text-[var(--text-secondary)] mt-1">
                    <strong>Feedback:</strong> {status.feedback}
                  </p>
                )}
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {status.submissionType === 'ide' && (
                <button
                  onClick={() => setIdeAssignment({ assignment, status, readOnly: true })}
                  className="btn-secondary w-full py-2 text-xs flex items-center justify-center gap-1.5"
                >
                  <BookOpen size={15} /> View Submitted Workspace
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
              {status.driveLink && (
                <a
                  href={status.driveLink}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-secondary w-full py-2 text-xs flex items-center justify-center gap-1.5"
                >
                  <ExternalLink size={15} /> View Submitted Link
                </a>
              )}
            </div>
          </div>
        ) : isLocked ? (
          <button
            disabled
            className="w-full py-2.5 rounded-xl bg-[var(--bg-muted)] text-[var(--text-muted)] text-xs font-semibold cursor-not-allowed"
          >
            Submission Closed
          </button>
        ) : (
          <div className="space-y-2.5">
            {assignment.projectType === 'document' && (
              <input
                type="text"
                placeholder="Submission Title (Optional)"
                className="input-field py-2 text-xs"
                value={assignmentTitle}
                onChange={(e) => setAssignmentTitle(e.target.value)}
              />
            )}

            <input
              type="url"
              placeholder="GitHub / Google Drive / Live Link (Optional)"
              className="input-field py-2 text-xs"
              value={driveLink}
              onChange={(e) => setDriveLink(e.target.value)}
            />

            <label className="flex items-center justify-center w-full py-2.5 px-3 bg-[var(--bg-muted)] border border-dashed border-[var(--border)] rounded-xl cursor-pointer hover:border-[var(--accent)] text-xs">
              <UploadCloud className="w-4 h-4 mr-2 text-[var(--text-secondary)]" />
              <span className="truncate text-[var(--text-secondary)] font-medium">
                {file
                  ? file.name
                  : assignment.projectType === 'document'
                  ? 'Upload PDF / DOC / ZIP (Max 4MB)'
                  : 'Upload .ZIP File (Max 4MB)'}
              </span>
              <input
                type="file"
                className="hidden"
                accept=".zip,.pdf,.doc,.docx,.ppt,.pptx"
                onChange={(e) => {
                  const selected = e.target.files?.[0];
                  if (!selected) return;
                  if (selected.size > 4 * 1024 * 1024) {
                    toast.error('File exceeds 4MB limit. Use a Drive/GitHub link for larger files.');
                    return;
                  }
                  setFile(selected);
                }}
                disabled={uploading}
              />
            </label>

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
              disabled={uploading || (!file && !driveLink.trim())}
              className="btn-primary w-full py-2.5 text-xs disabled:opacity-40"
            >
              {uploading ? `Uploading ${progress}%...` : isPastDue ? 'Submit Late' : 'Submit Assignment'}
            </button>

            {assignment.projectType !== 'document' && (
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

  useEffect(() => {
    const fetchAssignments = async () => {
      try {
        const { data } = await API.get(`/student/assignments/${student.studentId}`);
        setAssignments(data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    if (student) fetchAssignments();
  }, [student]);

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
      toast.success('Workspace submitted!');
      handleSubmittedUpdate(ideAssignment.assignment._id, data);
      setIdeAssignment(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit workspace');
      throw err;
    }
  };

  if (ideAssignment) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-[var(--bg-primary)]">
        <div className="flex items-center justify-between px-6 py-3 bg-[var(--bg-surface)] border-b border-[var(--border)]">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIdeAssignment(null)}
              className="text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              ← Back to Assignments
            </button>
            <h2 className="text-base font-bold">{ideAssignment.assignment.title} Workspace</h2>
          </div>
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
