import React, { useState, useEffect } from 'react';
import API from '../api';
import Navbar from '../components/AdminNavbar';
import { Search, Filter, Eye, Download, Users } from 'lucide-react';
import toast from 'react-hot-toast';

const AdminResultsPage = () => {
  const [results, setResults] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [filter, setFilter] = useState({ quizId: '', studentId: '', campus: '', batch: '' });
  const [meta, setMeta] = useState({ campuses: [], batches: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [rRes, qRes, mRes] = await Promise.all([
          API.get('/admin/results'),
          API.get('/quizzes'),
          API.get('/admin/students/meta')
        ]);
        setResults(rRes.data);
        setQuizzes(qRes.data);
        setMeta(mRes.data);
      } catch (error) {
        toast.error('Failed to load results');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleFilter = async () => {
    setLoading(true);
    try {
      const { data } = await API.get('/admin/results', { params: filter });
      setResults(data);
    } catch (error) {
       toast.error('Search failed');
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
      <Navbar />
      <main className="flex-1 ml-64 p-8">
        <header className="mb-10">
          <h1 className="text-3xl font-extrabold text-slate-100">Student Results</h1>
          <p className="text-slate-400">Track performance metrics across all quizzes</p>
        </header>

        <div className="bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-800 mb-8 flex flex-col md:flex-row gap-6 items-end">
            <div className="flex-1 w-full">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Search Student ID</label>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <input 
                      className="input-field pl-10" 
                      placeholder="e.g. STU123"
                      value={filter.studentId}
                      onChange={(e) => setFilter({...filter, studentId: e.target.value})}
                    />
                </div>
            </div>
            <div className="flex-1 w-full">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Filter by Quiz</label>
                <div className="relative">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <select 
                      className="input-field pl-10"
                      value={filter.quizId}
                      onChange={(e) => setFilter({...filter, quizId: e.target.value})}
                    >
                        <option value="">All Quizzes</option>
                        {quizzes.map(q => <option key={q._id} value={q._id}>{q.title}</option>)}
                    </select>
                </div>
            </div>
            <div className="flex-1 w-full">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Campus</label>
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
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Batch</label>
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
                <th className="px-6 py-4">Quiz</th>
                <th className="px-6 py-4">Score</th>
                <th className="px-6 py-4">Percentage</th>
                <th className="px-6 py-4">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {results.map((res) => (
                <tr key={res._id} className="hover:bg-slate-900 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-bold text-slate-200">{res.studentName}</p>
                    <p className="text-xs text-slate-400">{res.studentId}</p>
                  </td>
                  <td className="px-6 py-4 text-slate-400 font-medium">{res.quizId?.title || 'Deleted Quiz'}</td>
                  <td className="px-6 py-4 font-mono font-bold">
                    <span className={res.percentage >= 50 ? 'text-emerald-400' : 'text-rose-500'}>
                        {res.score} / {res.totalPossibleMarks}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                        <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden max-w-[80px]">
                            <div className="h-full bg-primary-500" style={{ width: `${res.percentage}%` }}></div>
                        </div>
                        <span className="text-sm font-bold text-slate-300">{res.percentage}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-400 text-sm">
                    {new Date(res.submittedAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {results.length === 0 && (
              <div className="p-16 text-center">
                  <Users className="mx-auto text-slate-700 mb-4" size={56} />
                  <p className="text-slate-500 font-medium">No results found matching your criteria</p>
              </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default AdminResultsPage;
