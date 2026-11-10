import React, { useState, useEffect } from 'react';
import API from '../api';
import Navbar from '../components/AdminNavbar';
import { Plus, Trash2, MapPin, Layers, X } from 'lucide-react';
import toast from 'react-hot-toast';

const ManageCampusesPage = () => {
  const [campuses, setCampuses] = useState([]);
  const [newCampus, setNewCampus] = useState('');
  const [newBatchesInput, setNewBatchesInput] = useState('');
  const [batchInputs, setBatchInputs] = useState({});
  const [loading, setLoading] = useState(true);

  const fetchCampuses = async () => {
    try {
      const { data } = await API.get('/admin/campuses');
      setCampuses(data);
    } catch {
      toast.error('Failed to load campuses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampuses();
  }, []);

  const handleAddCampus = async (e) => {
    e.preventDefault();
    if (!newCampus.trim()) return;

    const batches = newBatchesInput
      .split(',')
      .map(b => b.trim())
      .filter(Boolean);

    try {
      const { data } = await API.post('/admin/campuses', {
        name: newCampus.trim(),
        batches,
      });
      setCampuses([...campuses, data]);
      setNewCampus('');
      setNewBatchesInput('');
      toast.success('Campus added');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to add campus');
    }
  };

  const handleAddBatchToCampus = async (campus) => {
    const batchName = (batchInputs[campus._id] || '').trim();
    if (!batchName) return;

    const currentBatches = Array.isArray(campus.batches) ? campus.batches : [];
    if (currentBatches.includes(batchName)) {
      return toast.error('Batch already exists in this campus');
    }

    try {
      const updatedBatches = [...currentBatches, batchName];
      const { data } = await API.put(`/admin/campuses/${campus._id}`, {
        batches: updatedBatches,
      });
      setCampuses(campuses.map(c => (c._id === campus._id ? data : c)));
      setBatchInputs({ ...batchInputs, [campus._id]: '' });
      toast.success('Batch added');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to add batch');
    }
  };

  const handleRemoveBatchFromCampus = async (campus, batchToRemove) => {
    const currentBatches = Array.isArray(campus.batches) ? campus.batches : [];
    const updatedBatches = currentBatches.filter(b => b !== batchToRemove);
    try {
      const { data } = await API.put(`/admin/campuses/${campus._id}`, {
        batches: updatedBatches,
      });
      setCampuses(campuses.map(c => (c._id === campus._id ? data : c)));
      toast.success('Batch removed');
    } catch {
      toast.error('Failed to remove batch');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this campus?')) {
      try {
        await API.delete(`/admin/campuses/${id}`);
        setCampuses(campuses.filter(c => c._id !== id));
        toast.success('Campus deleted');
      } catch {
        toast.error('Failed to delete campus');
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      <Navbar />
      <main className="flex-1 lg:ml-64 p-4 sm:p-6 lg:p-8">
        <header className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Campuses & Batches</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Configure campuses and their batches for student enrollment, quizzes, lectures, and attendance
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <form onSubmit={handleAddCampus} className="card p-6 space-y-4">
              <h2 className="text-base font-bold flex items-center gap-2">
                <MapPin size={18} className="text-[var(--accent)]" /> New Campus
              </h2>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5">
                  Campus Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Main Campus"
                  className="input-field"
                  value={newCampus}
                  onChange={(e) => setNewCampus(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5">
                  Initial Batches (comma-separated, optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Batch 1, Batch 2"
                  className="input-field"
                  value={newBatchesInput}
                  onChange={(e) => setNewBatchesInput(e.target.value)}
                />
              </div>
              <button type="submit" className="btn-primary w-full py-2.5 flex items-center justify-center gap-2 text-sm">
                <Plus size={18} /> Add Campus
              </button>
            </form>
          </div>

          <div className="lg:col-span-2">
            <div className="card p-6">
              <div className="flex justify-between items-center pb-4 mb-4 border-b border-[var(--border)]">
                <h2 className="text-base font-bold">Registered Campuses</h2>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[var(--accent-subtle)] text-[var(--accent)]">
                  {campuses.length} Total
                </span>
              </div>

              {loading ? (
                <div className="space-y-3">
                  {[1, 2].map(n => (
                    <div key={n} className="h-24 rounded-xl bg-[var(--bg-muted)] animate-pulse" />
                  ))}
                </div>
              ) : campuses.length === 0 ? (
                <p className="text-sm text-[var(--text-muted)] text-center py-10">
                  No campuses added yet. Create your first campus on the left.
                </p>
              ) : (
                <div className="space-y-4">
                  {campuses.map(campus => (
                    <div key={campus._id} className="p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] space-y-3">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-[var(--accent-subtle)] text-[var(--accent)] flex items-center justify-center">
                            <MapPin size={16} />
                          </div>
                          <span className="font-bold text-base">{campus.name}</span>
                        </div>
                        <button
                          onClick={() => handleDelete(campus._id)}
                          className="p-2 text-[var(--text-muted)] hover:text-rose-600 rounded-lg transition-colors"
                          title="Delete Campus"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>

                      <div className="pl-10 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-medium text-[var(--text-secondary)] flex items-center gap-1">
                            <Layers size={13} /> Batches:
                          </span>
                          {(campus.batches || []).length === 0 ? (
                            <span className="text-xs text-[var(--text-muted)]">No batches defined</span>
                          ) : (
                            campus.batches.map(batch => (
                              <span
                                key={batch}
                                className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-md bg-[var(--bg-muted)] text-[var(--text-primary)] border border-[var(--border)]"
                              >
                                {batch}
                                <button
                                  type="button"
                                  onClick={() => handleRemoveBatchFromCampus(campus, batch)}
                                  className="text-[var(--text-muted)] hover:text-rose-600"
                                  title="Remove batch"
                                >
                                  <X size={12} />
                                </button>
                              </span>
                            ))
                          )}
                        </div>

                        <div className="flex items-center gap-2 max-w-xs pt-1">
                          <input
                            type="text"
                            placeholder="Add batch (e.g. Batch 3)"
                            className="input-field py-1.5 px-3 text-xs h-8"
                            value={batchInputs[campus._id] || ''}
                            onChange={(e) => setBatchInputs({ ...batchInputs, [campus._id]: e.target.value })}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddBatchToCampus(campus);
                              }
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => handleAddBatchToCampus(campus)}
                            className="btn-secondary py-1 px-3 h-8 text-xs whitespace-nowrap"
                          >
                            + Batch
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ManageCampusesPage;
