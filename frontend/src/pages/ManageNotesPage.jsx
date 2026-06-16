import React, { useState, useEffect } from 'react';
import API from '../api';
import Navbar from '../components/AdminNavbar';
import { Plus, Trash2, FileText, UploadCloud } from 'lucide-react';
import toast from 'react-hot-toast';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';

const ManageNotesPage = () => {
  const [notes, setNotes] = useState([]);
  const [meta, setMeta] = useState({ campuses: [], batches: [] });
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  const [formData, setFormData] = useState({
    lectureNumber: '',
    lectureTitle: '',
    description: '',
    campus: '',
    batch: '',
  });
  const [file, setFile] = useState(null);

  useEffect(() => {
    fetchNotes();
    fetchMeta();
  }, []);

  const fetchNotes = async () => {
    try {
      const { data } = await API.get('/notes');
      setNotes(data);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load notes');
    } finally {
      setLoading(false);
    }
  };

  const fetchMeta = async () => {
    try {
      const { data } = await API.get('/admin/students/meta');
      setMeta(data);
    } catch (error) {
      console.error(error);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!file) {
      toast.error('Please select a file to upload');
      return;
    }

    setUploading(true);
    const data = new FormData();
    data.append('lectureNumber', formData.lectureNumber);
    data.append('lectureTitle', formData.lectureTitle);
    data.append('description', formData.description);
    data.append('campus', formData.campus);
    data.append('batch', formData.batch);
    data.append('file', file);

    try {
      const response = await API.post('/notes', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      // Notes are sorted by lecture number ascending
      const newNotes = [...notes, response.data].sort((a, b) => a.lectureNumber - b.lectureNumber);
      setNotes(newNotes);
      
      setFormData({ lectureNumber: '', lectureTitle: '', description: '', campus: '', batch: '' });
      setFile(null);
      setShowAdd(false);
      toast.success('Note uploaded successfully');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to upload note');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this lecture note?')) {
      try {
        await API.delete(`/notes/${id}`);
        setNotes(notes.filter(n => n._id !== id));
        toast.success('Note deleted');
      } catch (error) {
        console.error(error);
        toast.error('Delete failed');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Navbar />
      <main className="flex-1 ml-64 p-8">
        <header className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl font-black text-gray-900">Manage Lecture Notes</h1>
            <p className="text-gray-500">Upload and organize course materials</p>
          </div>
          <button 
            onClick={() => setShowAdd(!showAdd)}
            className="btn-primary flex items-center gap-2 px-6 h-12"
          >
            {showAdd ? 'Cancel' : <><Plus size={20} /> Upload Note</>}
          </button>
        </header>

        <AnimatePresence>
          {showAdd && (
            <motion.form 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              onSubmit={handleAddNote}
              className="card bg-white p-8 mb-10 overflow-hidden border-2 border-primary-100"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Lecture Number</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="e.g. 1"
                    className="input-field h-12 w-full"
                    value={formData.lectureNumber}
                    onChange={(e) => setFormData({...formData, lectureNumber: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Lecture Title</label>
                  <input
                    type="text"
                    placeholder="e.g. Introduction to React"
                    className="input-field h-12 w-full"
                    value={formData.lectureTitle}
                    onChange={(e) => setFormData({...formData, lectureTitle: e.target.value})}
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Description</label>
                  <textarea
                    placeholder="Brief overview of the lecture..."
                    className="input-field h-24 w-full py-3"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                  />
                </div>
                <div className="md:col-span-2">
                   <label className="flex items-center justify-center w-full h-16 px-4 transition bg-white border-2 border-gray-200 border-dashed rounded-xl appearance-none cursor-pointer hover:border-primary-400 focus:outline-none relative">
                       <span className="flex items-center space-x-2">
                           <UploadCloud className="w-6 h-6 text-gray-400" />
                           <span className="font-medium text-gray-500">
                             {file ? file.name : 'Select file (PDF, PPT, DOC, ZIP, PNG, JPG)'}
                           </span>
                       </span>
                       <input type="file" className="hidden" accept=".zip,.pdf,.doc,.docx,.ppt,.pptx,.png,.jpg,.jpeg" onChange={handleFileChange} />
                   </label>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Campus Filter (Optional)</label>
                  <select 
                    className="input-field h-12 w-full"
                    value={formData.campus}
                    onChange={(e) => setFormData({...formData, campus: e.target.value})}
                  >
                    <option value="">All Campuses</option>
                    {meta.campuses.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Batch Filter (Optional)</label>
                  <select 
                    className="input-field h-12 w-full"
                    value={formData.batch}
                    onChange={(e) => setFormData({...formData, batch: e.target.value})}
                  >
                    <option value="">All Batches</option>
                    {meta.batches.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
                <div className="md:col-span-2 mt-4">
                   <button type="submit" disabled={uploading} className="btn-primary w-full py-4 font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed">
                     {uploading ? 'Uploading...' : 'Save Lecture Note'}
                   </button>
                </div>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-gray-500 text-xs font-semibold uppercase tracking-widest">
              <tr>
                <th className="px-8 py-5">#</th>
                <th className="px-8 py-5">Lecture Details</th>
                <th className="px-8 py-5">File</th>
                <th className="px-8 py-5">Target</th>
                <th className="px-8 py-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {notes.map((note) => (
                <tr key={note._id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="px-8 py-5 font-bold text-gray-400 text-lg">
                    {note.lectureNumber}
                  </td>
                  <td className="px-8 py-5">
                    <p className="font-bold text-gray-800 text-lg">{note.lectureTitle}</p>
                    <p className="text-sm text-gray-500 line-clamp-1">{note.description || 'No description'}</p>
                  </td>
                  <td className="px-8 py-5">
                    <a href={note.fileUrl} target="_blank" rel="noreferrer" className="text-sm font-semibold text-primary-600 hover:underline flex items-center gap-2">
                       <FileText size={16} /> {note.fileType.toUpperCase()}
                    </a>
                  </td>
                  <td className="px-8 py-5">
                     <div className="flex flex-col">
                       <span className="text-xs font-semibold text-primary-600 bg-primary-50 px-2 py-1 rounded-md w-fit mb-1">
                         {note.campus || 'All Campuses'}
                       </span>
                       <span className="text-xs font-semibold text-gray-600 bg-gray-100 px-2 py-1 rounded-md w-fit">
                         {note.batch || 'All Batches'}
                       </span>
                     </div>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <button 
                      onClick={() => handleDelete(note._id)}
                      className="p-3 bg-white text-red-500 hover:bg-red-50 rounded-lg shadow-sm border border-gray-100 transition-all"
                      title="Delete Note"
                    >
                      <Trash2 size={20} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {notes.length === 0 && !loading && (
            <div className="p-20 text-center">
              <FileText className="mx-auto text-gray-100 mb-6" size={80} />
              <p className="text-gray-400 font-semibold text-xl uppercase tracking-widest">No lecture notes found</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default ManageNotesPage;
