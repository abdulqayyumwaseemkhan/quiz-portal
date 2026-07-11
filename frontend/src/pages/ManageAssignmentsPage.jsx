import React, { useState, useEffect } from 'react';
import API from '../api';
import Navbar from '../components/AdminNavbar';
import { Plus, Trash2, Edit, FileArchive, Eye, BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';

const ManageAssignmentsPage = () => {
  const [assignments, setAssignments] = useState([]);
  const [meta, setMeta] = useState({ campuses: [], batches: [] });
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    dueDate: '',
    campus: '',
    batch: '',
    projectType: 'vanilla',
  });

  useEffect(() => {
    fetchAssignments();
    fetchMeta();
  }, []);

  const fetchAssignments = async () => {
    try {
      const { data } = await API.get('/assignments');
      setAssignments(data);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load assignments');
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

  const handleAddAssignment = async (e) => {
    e.preventDefault();
    try {
      const { data } = await API.post('/assignments', formData);
      setAssignments([data, ...assignments]);
      setFormData({ title: '', description: '', dueDate: '', campus: '', batch: '', projectType: 'vanilla' });
      setShowAdd(false);
      toast.success('Assignment created successfully');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create assignment');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this assignment and all submissions?')) {
      try {
        await API.delete(`/assignments/${id}`);
        setAssignments(assignments.filter(a => a._id !== id));
        toast.success('Assignment deleted');
      } catch (error) {
        console.error(error);
        toast.error('Delete failed');
      }
    }
  };

  return (
    <div className="min-h-screen bg-transparent text-[#13315c] flex">
      <Navbar />
      <main className="flex-1 ml-64 p-8">
        <header className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl font-black text-[#13315c]">Manage Assignments</h1>
            <p className="text-gray-600">Create assignments and collect zip submissions</p>
          </div>
          <button 
            onClick={() => setShowAdd(!showAdd)}
            className="btn-primary flex items-center gap-2 px-6 h-12"
          >
            {showAdd ? 'Cancel' : <><Plus size={20} /> Create Assignment</>}
          </button>
        </header>

        <AnimatePresence>
          {showAdd && (
            <motion.form 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              onSubmit={handleAddAssignment}
              className="card bg-white p-8 mb-10 overflow-hidden border-2 border-primary-100"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">Title</label>
                  <input
                    type="text"
                    placeholder="e.g. Final Project Submission"
                    className="input-field h-12 w-full"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">Description</label>
                  <textarea
                    placeholder="Instructions for the assignment..."
                    className="input-field h-24 w-full py-3"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">Due Date</label>
                  <input
                    type="datetime-local"
                    className="input-field h-12 w-full"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({...formData, dueDate: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">Project Type</label>
                  <select 
                    className="input-field h-12 w-full"
                    value={formData.projectType}
                    onChange={(e) => setFormData({...formData, projectType: e.target.value})}
                  >
                    <option value="vanilla">Vanilla (HTML/CSS/JS)</option>
                    <option value="react">React</option>
                    <option value="document">Document / Video Drive Link</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">Campus Filter (Optional)</label>
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
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">Batch Filter (Optional)</label>
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
                   <button type="submit" className="btn-primary w-full py-4 font-semibold text-lg">Save Assignment</button>
                </div>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        <div className="bg-white rounded-xl shadow-sm border border-[#8da9c4]/30 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-white text-gray-600 text-xs font-semibold uppercase tracking-widest">
              <tr>
                <th className="px-8 py-5">Assignment Details</th>
                <th className="px-8 py-5">Due Date</th>
                <th className="px-8 py-5">Target</th>
                <th className="px-8 py-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {assignments.map((assignment) => (
                <tr key={assignment._id} className="hover:bg-white0 transition-colors group">
                  <td className="px-8 py-5">
                    <p className="font-bold text-[#13315c] text-lg">{assignment.title}</p>
                    <p className="text-sm text-gray-600 line-clamp-1 mb-1">{assignment.description || 'No description'}</p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${assignment.projectType === 'react' ? 'bg-cyan-500/20 text-cyan-400' : assignment.projectType === 'document' ? 'bg-purple-500/20 text-purple-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                      {assignment.projectType === 'react' ? 'React' : assignment.projectType === 'document' ? 'Document / Video' : 'Vanilla JS'}
                    </span>
                  </td>
                  <td className="px-8 py-5 font-semibold text-[#13315c]">
                     {new Date(assignment.dueDate).toLocaleString()}
                  </td>
                  <td className="px-8 py-5">
                     <div className="flex flex-col">
                       <span className="text-xs font-semibold text-[#13315c] bg-[#8da9c4]/20 px-2 py-1 rounded-md w-fit mb-1">
                         {assignment.campus || 'All Campuses'}
                       </span>
                       <span className="text-xs font-semibold text-gray-600 bg-gray-50 px-2 py-1 rounded-md w-fit">
                         {assignment.batch || 'All Batches'}
                       </span>
                     </div>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex justify-end gap-3">
                        <Link 
                          to={`/admin/assignments/${assignment._id}/submissions`}
                          className="p-3 bg-white text-[#13315c] hover:bg-[#8da9c4]/20 rounded-lg shadow-sm border border-[#8da9c4]/30 transition-all"
                          title="View Submissions"
                        >
                          <Eye size={20} />
                        </Link>
                        <button 
                          onClick={() => handleDelete(assignment._id)}
                          className="p-3 bg-white text-rose-500 hover:bg-rose-500/10 rounded-lg shadow-sm border border-[#8da9c4]/30 transition-all"
                          title="Delete Assignment"
                        >
                          <Trash2 size={20} />
                        </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {assignments.length === 0 && !loading && (
            <div className="p-20 text-center">
              <FileArchive className="mx-auto text-gray-100 mb-6" size={80} />
              <p className="text-gray-500 font-semibold text-xl uppercase tracking-widest">No assignments found</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default ManageAssignmentsPage;
