import React, { useState, useEffect } from 'react';
import API from '../api';
import { FileArchive, UploadCloud, CheckCircle, Clock, Search, BookOpen, ChevronRight, User } from 'lucide-react';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const AssignmentCard = ({ assignment, student }) => {
  const [status, setStatus] = useState(null);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

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
    if (!file) return;
    setUploading(true);
    setProgress(0);

    const formData = new FormData();
    formData.append('file', file);

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
      className="card flex flex-col justify-between overflow-hidden p-8 border-none shadow-xl hover:shadow-2xl transition-all rounded-3xl bg-white"
    >
      <div>
        <div className="flex items-start justify-between mb-6">
          <div className="p-3 rounded-2xl bg-blue-50 text-blue-600">
            <FileArchive size={24} />
          </div>
          <div className="flex flex-col items-end">
            <span className={`text-xs font-bold px-3 py-1 rounded-full ${isLate ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
              Due: {new Date(assignment.dueDate).toLocaleDateString()}
            </span>
          </div>
        </div>
        
        <h3 className="text-2xl font-black text-gray-800 mb-2 truncate leading-tight">{assignment.title}</h3>
        <p className="text-gray-500 text-sm font-medium line-clamp-3 mb-6 leading-relaxed">{assignment.description || 'No description provided.'}</p>
      </div>

      <div className="mt-auto border-t border-gray-100 pt-6">
        {status ? (
          <div className="mb-4">
            <div className="flex items-center gap-2 text-green-600 bg-green-50 p-4 rounded-2xl text-xs font-bold uppercase tracking-wider mb-4">
              <CheckCircle size={16} /> 
              Submitted ✓ {status.isLate ? '(Late)' : ''}
            </div>
            <p className="text-xs text-gray-400 mb-2 truncate">File: {status.originalFileName}</p>
          </div>
        ) : null}

        <div className="flex flex-col gap-3">
          <label className="flex items-center justify-center w-full h-12 px-4 transition bg-white border-2 border-gray-200 border-dashed rounded-xl appearance-none cursor-pointer hover:border-primary-400 focus:outline-none relative">
              <span className="flex items-center space-x-2">
                  <UploadCloud className="w-5 h-5 text-gray-400" />
                  <span className="font-medium text-gray-500 text-sm">
                    {file ? file.name : 'Select .zip file'}
                  </span>
              </span>
              <input type="file" name="file_upload" className="hidden" accept=".zip" onChange={handleFileChange} disabled={uploading} />
          </label>

          {uploading && (
            <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden mb-2">
              <div className="h-full bg-primary-500 transition-all duration-300" style={{ width: `${progress}%` }}></div>
            </div>
          )}

          <button 
            onClick={handleUpload}
            disabled={!file || uploading}
            className={`w-full py-3 rounded-xl font-black uppercase tracking-widest text-sm transition-all ${
              file && !uploading 
                ? 'bg-primary-600 text-white hover:bg-primary-700 shadow-md shadow-primary-500/30' 
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            {uploading ? `Uploading ${progress}%` : status ? 'Re-upload' : 'Submit Assignment'}
          </button>
        </div>
      </div>
    </motion.div>
  );
};

const StudentAssignmentsPage = () => {
  const [assignments, setAssignments] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
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

  const handleLogout = () => {
    localStorage.removeItem('studentInfo');
    navigate('/', { replace: true });
  };

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
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f8fafc] p-6 md:p-12 font-sans">
      <div className="max-w-6xl mx-auto">
        <header className="flex flex-col md:flex-row justify-between items-center mb-12 bg-white p-8 rounded-3xl shadow-sm border border-gray-100 gap-6">
          <div className="flex items-center gap-4">
             <div className="bg-blue-600 p-4 rounded-2xl text-white shadow-lg shadow-blue-500/30">
                <FileArchive size={32} />
             </div>
             <div>
                <h1 className="text-3xl font-black text-gray-900 tracking-tight">Assignments</h1>
                <p className="text-gray-500 font-medium">Upload your projects as .zip files</p>
             </div>
          </div>
          
          <div className="flex items-center gap-4">
            <Link to="/student-notes" className="flex items-center gap-2 bg-gray-50 px-5 py-3 rounded-xl font-bold text-gray-600 hover:text-amber-600 hover:bg-amber-50 transition-colors">
               <FileText size={20} /> Notes
            </Link>
            <Link to="/quizzes" className="flex items-center gap-2 bg-gray-50 px-5 py-3 rounded-xl font-bold text-gray-600 hover:text-primary-600 hover:bg-primary-50 transition-colors">
               <BookOpen size={20} /> Quizzes
            </Link>
            <div className="flex items-center gap-4 bg-gray-50 p-2 rounded-2xl border border-gray-100">
              <div className="px-4 py-2 text-right hidden md:block">
                <p className="font-black text-gray-800 uppercase tracking-tighter">{student?.fullName}</p>
                <p className="text-xs text-gray-400 font-bold">STU ID: {student?.studentId}</p>
              </div>
              <button 
                onClick={handleLogout}
                className="bg-white p-3 rounded-xl shadow-sm text-red-500 hover:bg-red-50 transition-colors"
                title="Logout"
              >
                <User size={24} />
              </button>
            </div>
          </div>
        </header>

        <div className="relative mb-12">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400" size={24} />
            <input 
               type="text"
               placeholder="Search assignments..."
               className="w-full h-16 pl-16 pr-8 bg-white rounded-2xl shadow-sm border-none focus:ring-4 focus:ring-primary-100 text-lg font-medium transition-all"
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <AnimatePresence>
            {filteredAssignments.map((assignment) => (
               <AssignmentCard key={assignment._id} assignment={assignment} student={student} />
            ))}
          </AnimatePresence>
        </div>

        {filteredAssignments.length === 0 && !loading && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-32 bg-white rounded-3xl shadow-sm border-2 border-dashed border-gray-100"
          >
            <div className="bg-gray-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
               <FileArchive className="text-gray-300" size={48} />
            </div>
            <p className="text-gray-400 font-black text-2xl tracking-tight">No assignments found.</p>
            <p className="text-gray-300 font-medium mt-1">You're all caught up!</p>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default StudentAssignmentsPage;
