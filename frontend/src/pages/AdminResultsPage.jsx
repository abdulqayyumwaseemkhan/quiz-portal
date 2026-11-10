import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import API from '../api';
import Navbar from '../components/AdminNavbar';
import { Search, Filter, Download, Users } from 'lucide-react';
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
          API.get('/admin/students/meta'),
        ]);
        setResults(rRes.data);
        setQuizzes(qRes.data);
        setMeta(mRes.data);
      } catch {
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
    } catch {
      toast.error('Search failed');
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = () => {
    if (results.length === 0) {
      toast.error('No results to export');
      return;
    }
    const rows = results.map((r) => ({
      'Student Name': r.studentName,
      'Student ID': r.studentId,
      Campus: r.campus || '',
      Batch: r.batch || '',
      'Quiz Title': r.quizId?.title || 'Deleted Quiz',
      'Attempt #': r.attemptNo || 1,
      Score: r.score,
      'Total Marks': r.totalPossibleMarks,
      'Percentage (%)': r.percentage,
      'Submitted At': r.submittedAt ? new Date(r.submittedAt).toLocaleString() : '',
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Quiz Results');
    XLSX.writeFile(wb, `quiz_results_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      <Navbar />
      <main className="flex-1 lg:ml-64 p-4 sm:p-6 lg:p-8">
        <header className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Quiz Results</h1>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              Filter and export student quiz performance across campuses and batches
            </p>
          </div>
          <button
            onClick={handleExportExcel}
            className="btn-secondary flex items-center gap-2 text-sm py-2.5 px-4"
          >
            <Download size={16} /> Export Excel (.xlsx)
          </button>
        </header>

        <div className="card p-5 mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
          <div>
            <label className="block text-xs font-semibold uppercase mb-1 text-[var(--text-secondary)]">
              Student ID
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={16} />
              <input
                className="input-field pl-9 py-2 text-sm"
                placeholder="e.g. BQ-WD-001"
                value={filter.studentId}
                onChange={(e) => setFilter({ ...filter, studentId: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase mb-1 text-[var(--text-secondary)]">
              Quiz
            </label>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={16} />
              <select
                className="input-field pl-9 py-2 text-sm"
                value={filter.quizId}
                onChange={(e) => setFilter({ ...filter, quizId: e.target.value })}
              >
                <option value="">All Quizzes</option>
                {quizzes.map((q) => (
                  <option key={q._id} value={q._id}>
                    {q.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase mb-1 text-[var(--text-secondary)]">
              Campus
            </label>
            <select
              className="input-field py-2 text-sm"
              value={filter.campus}
              onChange={(e) => setFilter({ ...filter, campus: e.target.value })}
            >
              <option value="">All Campuses</option>
              {meta.campuses?.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase mb-1 text-[var(--text-secondary)]">
              Batch
            </label>
            <select
              className="input-field py-2 text-sm"
              value={filter.batch}
              onChange={(e) => setFilter({ ...filter, batch: e.target.value })}
            >
              <option value="">All Batches</option>
              {meta.batches?.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          <button onClick={handleFilter} className="btn-primary py-2.5 text-sm">
            Apply Filters
          </button>
        </div>

        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[var(--bg-muted)] text-[var(--text-secondary)] text-xs font-semibold uppercase tracking-wider border-b border-[var(--border)]">
                <tr>
                  <th className="px-5 py-3.5">Student</th>
                  <th className="px-5 py-3.5">Campus / Batch</th>
                  <th className="px-5 py-3.5">Quiz</th>
                  <th className="px-5 py-3.5">Attempt</th>
                  <th className="px-5 py-3.5">Score</th>
                  <th className="px-5 py-3.5">Percentage</th>
                  <th className="px-5 py-3.5">Submitted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {results.map((res) => (
                  <tr key={res._id} className="hover:bg-[var(--bg-muted)]/40 transition-colors">
                    <td className="px-5 py-3.5">
                      <p className="font-semibold">{res.studentName}</p>
                      <p className="text-xs font-mono text-[var(--text-secondary)]">{res.studentId}</p>
                    </td>
                    <td className="px-5 py-3.5 text-xs">
                      <p className="font-medium">{res.campus || '—'}</p>
                      <p className="text-[var(--text-secondary)]">{res.batch || '—'}</p>
                    </td>
                    <td className="px-5 py-3.5 font-medium">
                      {res.quizId?.title || 'Deleted Quiz'}
                    </td>
                    <td className="px-5 py-3.5 text-xs font-mono">
                      #{res.attemptNo || 1}
                    </td>
                    <td className="px-5 py-3.5 font-mono font-semibold">
                      <span className={res.percentage >= 50 ? 'text-emerald-600' : 'text-rose-600'}>
                        {res.score} / {res.totalPossibleMarks}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-[var(--bg-muted)] h-1.5 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[var(--accent)]"
                            style={{ width: `${Math.min(100, Math.max(0, res.percentage))}%` }}
                          />
                        </div>
                        <span className="text-xs font-bold">{res.percentage}%</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-[var(--text-secondary)]">
                      {res.submittedAt ? new Date(res.submittedAt).toLocaleString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {results.length === 0 && !loading && (
            <div className="p-14 text-center">
              <Users className="mx-auto text-[var(--text-muted)] mb-3" size={40} />
              <p className="text-sm text-[var(--text-secondary)]">No quiz results match the selected criteria.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default AdminResultsPage;
