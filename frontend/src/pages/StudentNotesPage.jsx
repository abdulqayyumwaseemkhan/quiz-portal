import React, { useState, useEffect } from 'react';
import API from '../api';
import { FileText, FileArchive, FileImage, Download, Search, BookOpen, ChevronRight, User } from 'lucide-react';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import StudentNavbar from '../components/StudentNavbar';

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
      className="card flex flex-col justify-between overflow-hidden p-8 border border-[#8da9c4]/30 shadow-xl hover:shadow-2xl transition-all rounded-xl bg-white"
    >
      <div>
        <div className="flex items-start justify-between mb-6">
          <div className="p-3 rounded-xl bg-amber-400/10 text-amber-400">
            {getFileIcon(note.fileType)}
          </div>
          <div className="flex flex-col items-end">
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-gray-50 text-gray-600 uppercase tracking-widest">
              Lecture {note.lectureNumber}
            </span>
          </div>
        </div>
        
        <h3 className="text-2xl font-black text-[#13315c] mb-2 truncate leading-tight">{note.lectureTitle}</h3>
        <p className="text-gray-600 text-sm font-medium line-clamp-3 mb-6 leading-relaxed">{note.description || 'No description provided.'}</p>
      </div>

      <div className="mt-auto border-t border-[#8da9c4]/30 pt-6">
        <a 
          href={note.fileUrl}
          target="_blank"
          rel="noreferrer"
          className="btn-primary w-full h-14 flex items-center justify-center gap-2 text-sm font-black uppercase tracking-widest rounded-xl transition-all hover:bg-primary-500 shadow-md shadow-primary-500/30"
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
    <div className="min-h-screen bg-transparent font-sans">
      <StudentNavbar student={student} />
      <div className="p-6 md:p-12">
        <div className="max-w-6xl mx-auto">
          <header className="mb-12">
            <h1 className="text-3xl font-black text-blue-900 tracking-tight">Lecture Notes</h1>
            <p className="text-gray-600 font-medium">Download course materials and resources</p>
          </header>

        <div className="relative mb-12">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-500" size={24} />
            <input 
               type="text"
               placeholder="Search lecture notes..."
               className="w-full h-16 pl-16 pr-8 bg-white rounded-xl shadow-sm border border-[#8da9c4]/30 focus:ring-4 focus:ring-primary-500/20 text-[#13315c] text-lg font-medium transition-all"
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
            className="text-center py-32 bg-white rounded-xl shadow-sm border border-[#8da9c4]/30"
          >
            <div className="bg-gray-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
               <FileText className="text-gray-500" size={48} />
            </div>
            <p className="text-[#13315c] font-black text-2xl tracking-tight">No notes found.</p>
            <p className="text-gray-600 font-medium mt-1">Check back later for new materials.</p>
          </motion.div>
        )}
      </div>
      </div>
    </div>
  );
};

export default StudentNotesPage;
