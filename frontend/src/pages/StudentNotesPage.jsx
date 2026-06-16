import React, { useState, useEffect } from 'react';
import API from '../api';
import { FileText, FileArchive, FileImage, Download, Search, BookOpen, ChevronRight, User } from 'lucide-react';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';

const getFileIcon = (fileType) => {
  const type = fileType.toLowerCase();
  if (type === 'zip') return <FileArchive size={24} />;
  if (['png', 'jpg', 'jpeg'].includes(type)) return <FileImage size={24} />;
  return <FileText size={24} />;
};

const NoteCard = ({ note }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card flex flex-col justify-between overflow-hidden p-8 border-none shadow-xl hover:shadow-2xl transition-all rounded-3xl bg-white"
    >
      <div>
        <div className="flex items-start justify-between mb-6">
          <div className="p-3 rounded-2xl bg-amber-50 text-amber-600">
            {getFileIcon(note.fileType)}
          </div>
          <div className="flex flex-col items-end">
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-gray-100 text-gray-600 uppercase tracking-widest">
              Lecture {note.lectureNumber}
            </span>
          </div>
        </div>
        
        <h3 className="text-2xl font-black text-gray-800 mb-2 truncate leading-tight">{note.lectureTitle}</h3>
        <p className="text-gray-500 text-sm font-medium line-clamp-3 mb-6 leading-relaxed">{note.description || 'No description provided.'}</p>
      </div>

      <div className="mt-auto border-t border-gray-100 pt-6">
        <a 
          href={note.fileUrl}
          target="_blank"
          rel="noreferrer"
          className="btn-primary w-full h-14 flex items-center justify-center gap-2 text-sm font-black uppercase tracking-widest rounded-xl transition-all hover:bg-primary-700 shadow-md shadow-primary-500/30"
        >
          <Download size={20} /> Download File
        </a>
      </div>
    </motion.div>
  );
};

const StudentNotesPage = () => {
  const [notes, setNotes] = useState([]);
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
    const fetchNotes = async () => {
      try {
        const { data } = await API.get(`/student/notes/${student.studentId}`);
        setNotes(data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    if (student) fetchNotes();
  }, [student]);

  const filteredNotes = notes.filter(n => 
    n.lectureTitle.toLowerCase().includes(searchTerm.toLowerCase())
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
             <div className="bg-amber-500 p-4 rounded-2xl text-white shadow-lg shadow-amber-500/30">
                <FileText size={32} />
             </div>
             <div>
                <h1 className="text-3xl font-black text-gray-900 tracking-tight">Lecture Notes</h1>
                <p className="text-gray-500 font-medium">Download course materials and resources</p>
             </div>
          </div>
          
          <div className="flex items-center gap-4">
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
               placeholder="Search lecture notes..."
               className="w-full h-16 pl-16 pr-8 bg-white rounded-2xl shadow-sm border-none focus:ring-4 focus:ring-primary-100 text-lg font-medium transition-all"
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <AnimatePresence>
            {filteredNotes.map((note) => (
               <NoteCard key={note._id} note={note} />
            ))}
          </AnimatePresence>
        </div>

        {filteredNotes.length === 0 && !loading && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-32 bg-white rounded-3xl shadow-sm border-2 border-dashed border-gray-100"
          >
            <div className="bg-gray-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
               <FileText className="text-gray-300" size={48} />
            </div>
            <p className="text-gray-400 font-black text-2xl tracking-tight">No notes found.</p>
            <p className="text-gray-300 font-medium mt-1">Check back later for new materials.</p>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default StudentNotesPage;
