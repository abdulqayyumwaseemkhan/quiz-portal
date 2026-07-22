import React, { useState, useEffect } from 'react';
import API from '../api';
import { FileArchive, UploadCloud, CheckCircle, Clock, Search, BookOpen, ChevronRight, User } from 'lucide-react';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import StudentNavbar from '../components/StudentNavbar';
import WebIDE from '../components/WebIDE/WebIDE';

const AssignmentCard = ({ assignment, student, setIdeAssignment }) => {
  const [status, setStatus] = useState(null);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [assignmentTitle, setAssignmentTitle] = useState('');
  const [assignmentDetails, setAssignmentDetails] = useState('');
  const [driveLink, setDriveLink] = useState('');

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const { data } = await API.get(`/student/assignments/${assignment._id}/status/${student.studentId}`);
        if (data.exists) setStatus(data.submission);
      } catch (error) {
        console.error(error);
      }
    };
    checkStatus();
  }, [assignment._id, student.studentId]);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      if (!selected.name.toLowerCase().endsWith('.zip')) {
        toast.error('Only .zip files are allowed');
        setFile(null);
        return;
      }
      setFile(selected);
    }
  };

  const handleUpload = async () => {
    if (assignment.projectType === 'document') {
      if (!file && !driveLink) {
        toast.error('Please provide either a file or a Google Drive link');
        return;
      }
    } else {
      if (!file) return;
    }
    
    setUploading(true);
    setProgress(0);

    const formData = new FormData();
    if (file) formData.append('file', file);
    if (assignment.projectType === 'document') {
      formData.append('assignmentTitle', assignmentTitle);
      formData.append('assignmentDetails', assignmentDetails);
      formData.append('driveLink', driveLink);
    }

    try {
      const { data } = await API.post(
        `/student/assignments/${assignment._id}/submit/${student.studentId}`,
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setProgress(percentCompleted);
          },
        }
      );
      setStatus(data);
      setFile(null);
      toast.success('Assignment submitted successfully');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const isLate = new Date() > new Date(assignment.dueDate);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card flex flex-col justify-between overflow-hidden p-8 border border-[#8da9c4]/30 shadow-xl hover:shadow-2xl transition-all rounded-xl bg-white"
    >
      <div>
        <div className="flex items-start justify-between mb-6">
          <div className="p-3 rounded-xl bg-[#8da9c4]/20 text-[#13315c]">
            <FileArchive size={24} />
          </div>
          <div className="flex flex-col items-end">
            <span className={`text-xs font-bold px-3 py-1 rounded-full ${isLate ? 'bg-red-400/10 text-red-400' : 'bg-green-400/10 text-green-400'}`}>
              Due: {new Date(assignment.dueDate).toLocaleDateString()}
            </span>
          </div>
        </div>
        
        <h3 className="text-2xl font-black text-[#13315c] mb-2 truncate leading-tight">{assignment.title}</h3>
        <p className="text-gray-600 text-sm font-medium line-clamp-3 mb-6 leading-relaxed">{assignment.description || 'No description provided.'}</p>
      </div>

      <div className="mt-auto border-t border-[#8da9c4]/30 pt-6">
        {status ? (
          <div className="mb-4">
            <div className="flex items-center gap-2 text-green-400 bg-green-400/10 p-4 rounded-xl text-xs font-bold uppercase tracking-wider mb-4">
              <CheckCircle size={16} /> 
              Submitted ✓ {status.isLate ? '(Late)' : ''}
            </div>
            <p className="text-xs text-gray-500 mb-2 truncate">
              {status.submissionType === 'ide' ? 'Web IDE Workspace' : `File: ${status.originalFileName}`}
            </p>
          </div>
        ) : null}

        {!status && !isLate ? (
          <div className="flex flex-col gap-3">
            {assignment.projectType === 'document' && (
              <>
                <input 
                  type="text" 
                  placeholder="Assignment Title (Optional)" 
                  className="input-field h-10 w-full text-sm"
                  value={assignmentTitle}
                  onChange={(e) => setAssignmentTitle(e.target.value)}
                />
                <textarea 
                  placeholder="Assignment Details (Optional)" 
                  className="input-field h-20 w-full text-sm p-2"
                  value={assignmentDetails}
                  onChange={(e) => setAssignmentDetails(e.target.value)}
                ></textarea>
                <input 
                  type="url" 
                  placeholder="Google Drive Video Link (Optional)" 
                  className="input-field h-10 w-full text-sm"
                  value={driveLink}
                  onChange={(e) => setDriveLink(e.target.value)}
                />
                <div className="flex items-center justify-center space-x-4 my-2">
                  <span className="h-px bg-gray-50 w-full"></span>
                  <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">AND/OR</span>
                  <span className="h-px bg-gray-50 w-full"></span>
                </div>
              </>
            )}

            <label className="flex items-center justify-center w-full h-12 px-4 transition bg-gray-50 border-2 border-[#8da9c4]/30 border-dashed rounded-xl appearance-none cursor-pointer hover:border-primary-500 focus:outline-none relative">
                <span className="flex items-center space-x-2">
                    <UploadCloud className="w-5 h-5 text-gray-600" />
                    <span className="font-medium text-gray-600 text-sm">
                      {file ? file.name : (assignment.projectType === 'document' ? 'Select PDF/DOC/ZIP' : 'Select .zip file')}
                    </span>
                </span>
                <input 
                  type="file" 
                  name="file_upload" 
                  className="hidden" 
                  accept={assignment.projectType === 'document' ? ".zip,.pdf,.doc,.docx" : ".zip"} 
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      const selected = e.target.files[0];
                      const name = selected.name.toLowerCase();
                      if (assignment.projectType === 'document' && !name.match(/\.(zip|pdf|doc|docx)$/)) {
                        toast.error('Only .zip, .pdf, .doc, .docx files are allowed');
                        setFile(null);
                        return;
                      } else if (assignment.projectType !== 'document' && !name.endsWith('.zip')) {
                        toast.error('Only .zip files are allowed');
                        setFile(null);
                        return;
                      }
                      if (selected.size > 10 * 1024 * 1024) {
                        toast.error('File size exceeds 10MB limit');
                        setFile(null);
                        return;
                      }
                      setFile(selected);
                    }
                  }} 
                  disabled={uploading} 
                />
            </label>

            {uploading && (
              <div className="w-full bg-gray-50 h-2 rounded-full overflow-hidden mb-2">
                <div className="h-full bg-primary-500 transition-all duration-300" style={{ width: `${progress}%` }}></div>
              </div>
            )}

            <button 
              onClick={handleUpload}
              disabled={uploading || (assignment.projectType !== 'document' && !file) || (assignment.projectType === 'document' && !file && !driveLink)}
              className={`w-full py-3 rounded-xl font-black uppercase tracking-widest text-sm transition-all ${
                (!uploading && (file || (assignment.projectType === 'document' && driveLink)))
                  ? 'btn-primary' 
                  : 'bg-gray-50 text-gray-500 cursor-not-allowed'
              }`}
            >
              {uploading ? `Uploading ${progress}%` : 'Submit Assignment'}
            </button>
            
            {assignment.projectType !== 'document' && (
              <>
                <div className="flex items-center justify-center space-x-4 my-2">
                  <span className="h-px bg-gray-50 w-full"></span>
                  <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">OR</span>
                  <span className="h-px bg-gray-50 w-full"></span>
                </div>

                <button 
                  onClick={() => setIdeAssignment({ assignment, status })}
                  className="w-full py-3 rounded-xl font-black uppercase tracking-widest text-sm transition-all btn-primary flex items-center justify-center space-x-2"
                >
                  <BookOpen size={18} />
                  <span>Start Web IDE</span>
                </button>
              </>
            )}
          </div>
        ) : !status && isLate ? (
          <div className="flex flex-col gap-3">
            <button disabled className="w-full py-3 rounded-xl bg-gray-50 text-gray-500 font-black uppercase tracking-widest text-sm cursor-not-allowed">
              Submission Closed
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {status.submissionType === 'ide' && (
              <button 
                onClick={() => setIdeAssignment({ assignment, status, readOnly: true })}
                className="w-full py-3 rounded-xl font-black uppercase tracking-widest text-sm transition-all btn-primary flex items-center justify-center space-x-2"
              >
                <BookOpen size={18} />
                <span>View Workspace</span>
              </button>
            )}
            {status.submissionType === 'file' && status.fileUrl && (
              <a 
                href={status.fileUrl}
                target="_blank"
                rel="noreferrer"
                className="w-full py-3 rounded-xl font-black uppercase tracking-widest text-sm transition-all btn-primary flex items-center justify-center space-x-2"
              >
                <FileArchive size={18} />
                <span>Download Submission</span>
              </a>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
};

const StudentAssignmentsPage = () => {
  const [assignments, setAssignments] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [ideAssignment, setIdeAssignment] = useState(null); // { assignment, status }
  const navigate = useNavigate();
  
  const student = React.useMemo(() => {
    try { return JSON.parse(localStorage.getItem('studentInfo')); } 
    catch { return null; }
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

  const filteredAssignments = assignments.filter(a => 
    a.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 text-[#13315c]"></div>
    </div>
  );

  const handleIdeSubmit = async (projectData) => {
    if (!ideAssignment) return;
    try {
      await API.post(`/student/assignments/${ideAssignment.assignment._id}/submit-ide/${student.studentId}`, { projectData });
      toast.success('Workspace submitted successfully!');
      
      // Update local status so UI reflects submitted immediately
      setAssignments((prev) => prev.map(a => a)); // Trigger re-render (status fetched in card, ideally we'd pass it down, but let's just close IDE for now and let card refetch if needed. To force refetch, we could reload, but closing is fine)
      setIdeAssignment(null);
      // Reload page to refresh statuses simply
      window.location.reload();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit workspace');
      throw err;
    }
  };

  if (ideAssignment) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-transparent">
        <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-[#8da9c4]/30">
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => setIdeAssignment(null)}
              className="text-gray-500 font-bold hover:text-[#13315c] transition-colors"
            >
              ← Back to Assignments
            </button>
            <h2 className="text-xl font-bold text-[#13315c]">{ideAssignment.assignment.title} Workspace</h2>
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
    <div className="min-h-screen bg-transparent font-sans">
      <StudentNavbar student={student} />
      <div className="p-6 md:p-12">
        <div className="max-w-6xl mx-auto">
          <header className="mb-12">
            <h1 className="text-3xl font-black text-blue-900 tracking-tight">Assignments</h1>
            <p className="text-gray-600 font-medium">Upload your projects as .zip files</p>
          </header>

        <div className="relative mb-12">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-500" size={24} />
            <input 
               type="text"
               placeholder="Search assignments..."
               className="w-full h-16 pl-16 pr-8 bg-white rounded-xl shadow-sm border border-[#8da9c4]/30 focus:ring-4 focus:ring-primary-500/20 text-[#13315c] text-lg font-medium transition-all"
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <AnimatePresence>
            {filteredAssignments.map((assignment) => (
               <AssignmentCard key={assignment._id} assignment={assignment} student={student} setIdeAssignment={setIdeAssignment} />
            ))}
          </AnimatePresence>
        </div>

        {filteredAssignments.length === 0 && !loading && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-32 bg-white rounded-xl shadow-sm border border-[#8da9c4]/30"
          >
            <div className="bg-gray-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
               <FileArchive className="text-gray-500" size={48} />
            </div>
            <p className="text-[#13315c] font-black text-2xl tracking-tight">No assignments found.</p>
            <p className="text-gray-600 font-medium mt-1">You're all caught up!</p>
          </motion.div>
        )}
      </div>
      </div>
    </div>
  );
};

export default StudentAssignmentsPage;
