import React, { useState, useEffect } from 'react';
import API from '../api';
import Navbar from '../components/AdminNavbar';
import { useNavigate } from 'react-router-dom';
import { Save, ArrowLeft, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';

const CreateQuizPage = () => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    duration: 30,
    totalMarks: 10,
    startDate: '',
    endDate: '',
    campus: '',
    batch: '',
    attemptsAllowed: 1,
    shuffleQuestions: true,
    shuffleOptions: true,
    isPublished: true,
  });
  const [meta, setMeta] = useState({ campuses: [], batches: [] });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    API.get('/admin/students/meta')
      .then(({ data }) => setMeta({ campuses: data.campuses || [], batches: data.batches || [] }))
      .catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...formData,
        startDate: formData.startDate ? new Date(formData.startDate).toISOString() : null,
        endDate: formData.endDate ? new Date(formData.endDate).toISOString() : null,
      };
      const { data } = await API.post('/quizzes', payload);
      toast.success('Quiz created. Now add or upload questions.');
      navigate(`/admin/manage-questions/${data._id}`);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create quiz');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      <Navbar />
      <main className="flex-1 lg:ml-64 p-4 sm:p-6 lg:p-8 max-w-5xl">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] mb-4"
        >
          <ArrowLeft size={16} /> Back
        </button>

        <header className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Create Quiz</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Configure quiz details, campus/batch visibility, time window, and randomization rules
          </p>
        </header>

        <form onSubmit={handleSubmit} className="card p-6 sm:p-8 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5">
                Quiz Title *
              </label>
              <input
                type="text"
                placeholder="e.g. React & State Management Assessment"
                className="input-field"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5">
                Description *
              </label>
              <textarea
                placeholder="Topics covered and instructions for students..."
                className="input-field min-h-[90px]"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5">
                Target Campus
              </label>
              <select
                className="input-field"
                value={formData.campus}
                onChange={(e) => setFormData({ ...formData, campus: e.target.value })}
              >
                <option value="">All Campuses</option>
                {meta.campuses.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5">
                Target Batch
              </label>
              <select
                className="input-field"
                value={formData.batch}
                onChange={(e) => setFormData({ ...formData, batch: e.target.value })}
              >
                <option value="">All Batches</option>
                {meta.batches.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5">
                Duration (Minutes) *
              </label>
              <input
                type="number"
                min={1}
                className="input-field"
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: Number(e.target.value) })}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5">
                Attempts Allowed *
              </label>
              <input
                type="number"
                min={1}
                max={10}
                className="input-field"
                value={formData.attemptsAllowed}
                onChange={(e) => setFormData({ ...formData, attemptsAllowed: Number(e.target.value) })}
                required
              />
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[var(--bg-muted)] border border-[var(--border)] space-y-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
              <Calendar size={15} /> Schedule Window (Optional)
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Start Date & Time
                </label>
                <input
                  type="datetime-local"
                  className="input-field"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  End Date & Time
                </label>
                <input
                  type="datetime-local"
                  className="input-field"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <label className="flex items-center gap-2.5 p-3 rounded-xl border border-[var(--border)] cursor-pointer text-sm">
              <input
                type="checkbox"
                checked={formData.shuffleQuestions}
                onChange={(e) => setFormData({ ...formData, shuffleQuestions: e.target.checked })}
              />
              <span>Shuffle Questions</span>
            </label>
            <label className="flex items-center gap-2.5 p-3 rounded-xl border border-[var(--border)] cursor-pointer text-sm">
              <input
                type="checkbox"
                checked={formData.shuffleOptions}
                onChange={(e) => setFormData({ ...formData, shuffleOptions: e.target.checked })}
              />
              <span>Shuffle MCQ Options</span>
            </label>
            <label className="flex items-center gap-2.5 p-3 rounded-xl border border-[var(--border)] cursor-pointer text-sm">
              <input
                type="checkbox"
                checked={formData.isPublished}
                onChange={(e) => setFormData({ ...formData, isPublished: e.target.checked })}
              />
              <span>Publish Immediately</span>
            </label>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="btn-primary py-3 px-6 text-sm flex items-center gap-2"
            >
              <Save size={18} /> {loading ? 'Creating...' : 'Create & Manage Questions'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
};

export default CreateQuizPage;
