import React, { useState, useEffect } from 'react';
import API from '../api';
import Navbar from '../components/AdminNavbar';
import { Filter, Download, ArrowLeft, Clock, CheckCircle } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';

const formatBytes = (bytes, decimals = 2) => {
  if (!+bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

const AssignmentSubmissionsPage = () => {
  const { id } = useParams();
  const [submissions, setSubmissions] = useState([]);
  const [filter, setFilter] = useState({ campus: '', batch: '' });
  const [meta, setMeta] = useState({ campuses: [], batches: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [sRes, mRes] = await Promise.all([
        API.get(`/assignments/${id}/submissions`),
        API.get('/admin/students/meta')
      ]);
      setSubmissions(sRes.data);
      setMeta(mRes.data);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load submissions');
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = async () => {
    setLoading(true);
    try {
      const { data } = await API.get(`/assignments/${id}/submissions`, { params: filter });
      setSubmissions(data);
    } catch (error) {
       console.error(error);
       toast.error('Filter failed');
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
      <Navbar />
      <main className="flex-1 ml-64 p-8">
        <header className="mb-10">
          <div className="flex items-center gap-4 mb-2">
            <Link to="/admin/manage-assignments" className="text-slate-500 hover:text-primary-400 transition-colors">
              <ArrowLeft size={24} />
            </Link>
            <h1 className="text-3xl font-extrabold text-slate-100">Assignment Submissions</h1>
          </div>
          <p className="text-slate-400 ml-10">Review and download student project files</p>
        </header>

        <div className="bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-800 mb-8 flex flex-col md:flex-row gap-6 items-end">
            <div className="flex-1 w-full">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Campus Filter</label>
                <div className="relative">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <select 
                      className="input-field pl-10"
                      value={filter.campus}
                      onChange={(e) => setFilter({...filter, campus: e.target.value})}
                    >
                        <option value="">All Campuses</option>
                        {meta.campuses?.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
            </div>
            <div className="flex-1 w-full">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Batch Filter</label>
                <div className="relative">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <select 
                      className="input-field pl-10"
                      value={filter.batch}
                      onChange={(e) => setFilter({...filter, batch: e.target.value})}
                    >
                        <option value="">All Batches</option>
                        {meta.batches?.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                </div>
            </div>
            <button 
              onClick={handleFilter}
              className="btn-primary flex items-center gap-2 h-11 px-8 whitespace-nowrap"
            >
              Apply Filters
            </button>
        </div>

        <div className="bg-slate-900 rounded-2xl shadow-sm border border-slate-800 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-900 text-slate-400 text-xs font-bold uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Student</th>
                <th className="px-6 py-4">Campus / Batch</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">File Info</th>
                <th className="px-6 py-4 text-right">Download</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {submissions.map((sub) => (
                <tr key={sub._id} className="hover:bg-slate-900 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-bold text-slate-200">{sub.studentName}</p>
                    <p className="text-xs text-slate-400">{sub.studentId}</p>
                  </td>
                  <td className="px-6 py-4">
                     <p className="font-semibold text-slate-300">{sub.campus || '-'}</p>
                     <p className="text-xs text-slate-400">{sub.batch || '-'}</p>
                  </td>
                  <td className="px-6 py-4">
                     {sub.isLate ? (
                         <span className="inline-flex items-center gap-1 text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-widest">
                           <Clock size={12} /> Late
                         </span>
                     ) : (
                         <span className="inline-flex items-center gap-1 text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-widest">
                           <CheckCircle size={12} /> On Time
                         </span>
                     )}
                     <p className="text-xs text-slate-500 font-medium mt-1">
                        {new Date(sub.submittedAt).toLocaleDateString()}
                     </p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-medium text-slate-200 line-clamp-1 max-w-[200px]" title={sub.originalFileName}>
                      {sub.originalFileName}
                    </p>
                    <p className="text-xs text-slate-400 font-mono">
                      {formatBytes(sub.fileSizeBytes)}
                    </p>
                  </td>
                  <td className="px-6 py-4 text-right">
                     <a 
                       href={sub.fileUrl} 
                       target="_blank" 
                       rel="noreferrer"
                       className="inline-flex items-center gap-2 px-4 py-2 bg-primary-500/10 text-primary-400 hover:bg-primary-500/10 font-semibold rounded-lg transition-colors text-sm"
                     >
                       <Download size={16} /> Get File
                     </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {submissions.length === 0 && !loading && (
              <div className="p-16 text-center">
                  <Download className="mx-auto text-slate-700 mb-4" size={56} />
                  <p className="text-slate-500 font-medium">No submissions found</p>
              </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default AssignmentSubmissionsPage;
