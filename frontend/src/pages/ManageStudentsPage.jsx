import React, { useState, useEffect } from 'react';
import API from '../api';
import Navbar from '../components/AdminNavbar';
import { UserPlus, Trash2, Users, Search, GraduationCap, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

const ManageStudentsPage = () => {
  const [students, setStudents] = useState([]);
  const [meta, setMeta] = useState({ campuses: [], batches: [] });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCampus, setFilterCampus] = useState('');
  const [filterBatch, setFilterBatch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [formData, setFormData] = useState({ studentId: '', fullName: '', campus: '', batch: '' });

  useEffect(() => {
    fetchStudents();
    fetchMeta();
  }, []);

  const fetchMeta = async () => {
    try {
      const { data } = await API.get('/admin/students/meta');
      setMeta(data);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchStudents = async () => {
    try {
      const { data } = await API.get('/admin/students');
      setStudents(data);
    } catch (error) {
      toast.error('Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  const handleAddStudent = async (e) => {
    e.preventDefault();
    try {
      const { data } = await API.post('/admin/students', formData);
      setStudents([data, ...students]);
      setFormData({ studentId: '', fullName: '', campus: '', batch: '' });
      fetchMeta(); // Refresh datalists
      setShowAdd(false);
      toast.success('Student added successfully');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to add student');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to remove this student?')) {
      try {
        await API.delete(`/admin/students/${id}`);
        setStudents(students.filter(s => s._id !== id));
        toast.success('Student removed');
      } catch (error) {
        toast.error('Delete failed');
      }
    }
  };

  const filteredStudents = students.filter(s => {
    const matchSearch = s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        s.studentId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCampus = filterCampus ? s.campus === filterCampus : true;
    const matchBatch = filterBatch ? s.batch === filterBatch : true;
    return matchSearch && matchCampus && matchBatch;
  });

  const handleDownloadCSV = () => {
    if (filteredStudents.length === 0) {
      toast.error('No students to export');
      return;
    }
    const headers = ['Student ID', 'Full Name', 'Campus', 'Batch', 'Date Registered'];
    const csvContent = [
      headers.join(','),
      ...filteredStudents.map(s => 
        `"${s.studentId}","${s.fullName}","${s.campus || ''}","${s.batch || ''}","${new Date(s.createdAt).toLocaleDateString()}"`
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'students_records.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-transparent text-slate-100 flex">
      <Navbar />
      <main className="flex-1 ml-64 p-8">
        <header className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl font-black text-slate-100">Manage Students</h1>
            <p className="text-slate-400">Register students who are allowed to take quizzes</p>
          </div>
          <div className="flex gap-4">
            <button 
              onClick={handleDownloadCSV}
              className="flex items-center gap-2 px-6 h-12 bg-slate-800 text-slate-100 rounded-lg hover:bg-slate-700 font-semibold"
            >
              <Download size={20} /> Export CSV
            </button>
            <button 
              onClick={() => setShowAdd(!showAdd)}
              className="btn-primary flex items-center gap-2 px-6 h-12"
            >
              {showAdd ? 'Cancel' : <><UserPlus size={20} /> Register Student</>}
            </button>
          </div>
        </header>

        <AnimatePresence>
          {showAdd && (
            <motion.form 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              onSubmit={handleAddStudent}
              className="card bg-slate-900 p-8 mb-10 overflow-hidden border-2 border-primary-100"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">Student ID</label>
                  <input
                    type="text"
                    placeholder="e.g. STU123"
                    className="input-field h-12"
                    value={formData.studentId}
                    onChange={(e) => setFormData({...formData, studentId: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">Full Name</label>
                  <input
                    type="text"
                    placeholder="e.g. John Doe"
                    className="input-field h-12"
                    value={formData.fullName}
                    onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">Campus</label>
                  <input
                    type="text"
                    list="campus-list"
                    placeholder="e.g. North Campus"
                    className="input-field h-12"
                    value={formData.campus}
                    onChange={(e) => setFormData({...formData, campus: e.target.value})}
                    required
                  />
                  <datalist id="campus-list">
                    {meta.campuses.map(c => <option key={c} value={c} />)}
                  </datalist>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">Batch</label>
                  <input
                    type="text"
                    list="batch-list"
                    placeholder="e.g. Batch 2024"
                    className="input-field h-12"
                    value={formData.batch}
                    onChange={(e) => setFormData({...formData, batch: e.target.value})}
                    required
                  />
                  <datalist id="batch-list">
                    {meta.batches.map(b => <option key={b} value={b} />)}
                  </datalist>
                </div>
                <div className="md:col-span-2">
                   <button type="submit" className="btn-primary w-full py-4 font-semibold text-lg">Save Student Record</button>
                </div>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
            <input 
              type="text"
              placeholder="Search by name or ID..."
              className="w-full h-14 pl-12 pr-6 rounded-lg border-none shadow-sm focus:ring-2 focus:ring-primary-100 font-medium text-slate-900"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select 
            className="h-14 px-4 rounded-lg border-none shadow-sm focus:ring-2 focus:ring-primary-100 font-medium text-slate-900"
            value={filterCampus}
            onChange={(e) => setFilterCampus(e.target.value)}
          >
            <option value="">All Campuses</option>
            {meta.campuses.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select 
            className="h-14 px-4 rounded-lg border-none shadow-sm focus:ring-2 focus:ring-primary-100 font-medium text-slate-900"
            value={filterBatch}
            onChange={(e) => setFilterBatch(e.target.value)}
          >
            <option value="">All Batches</option>
            {meta.batches.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>

        <div className="bg-slate-900 rounded-xl shadow-sm border border-slate-800 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-900 text-slate-400 text-xs font-semibold uppercase tracking-widest">
              <tr>
                <th className="px-8 py-5 text-center w-20">#</th>
                <th className="px-8 py-5">Student Details</th>
                <th className="px-8 py-5">Campus</th>
                <th className="px-8 py-5">Batch</th>
                <th className="px-8 py-5">Date Registered</th>
                <th className="px-8 py-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredStudents.map((student, idx) => (
                <tr key={student._id} className="hover:bg-slate-900/50 transition-colors group">
                  <td className="px-8 py-5 text-center text-slate-600 font-semibold">{idx + 1}</td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-4">
                       <div className="w-10 h-10 rounded-full bg-primary-500/10 text-primary-600 flex items-center justify-center font-bold">
                          {student.fullName.charAt(0)}
                       </div>
                       <div>
                          <p className="font-bold text-slate-200">{student.fullName}</p>
                          <p className="text-xs text-slate-500 font-semibold uppercase tracking-tighter">ID: {student.studentId}</p>
                       </div>
                    </div>
                  </td>
                  <td className="px-8 py-5 font-semibold text-slate-300">{student.campus || '-'}</td>
                  <td className="px-8 py-5 font-semibold text-slate-300">{student.batch || '-'}</td>
                  <td className="px-8 py-5 text-slate-400 text-sm font-medium">
                     {new Date(student.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-8 py-5 text-right">
                    <button 
                      onClick={() => handleDelete(student._id)}
                      className="p-3 text-red-300 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={20} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredStudents.length === 0 && !loading && (
            <div className="p-20 text-center">
              <Users className="mx-auto text-gray-100 mb-6" size={80} />
              <p className="text-slate-500 font-semibold text-xl uppercase tracking-widest">No students found</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default ManageStudentsPage;
