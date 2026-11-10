import React, { useState, useEffect } from 'react';
import API from '../api';
import Navbar from '../components/AdminNavbar';
import {
  Plus,
  Trash2,
  Edit,
  Video,
  ExternalLink,
  Calendar,
  Layers,
  X,
  Globe,
  Lock,
} from 'lucide-react';
import toast from 'react-hot-toast';

const ManageLecturesPage = () => {
  const [lectures, setLectures] = useState([]);
  const [meta, setMeta] = useState({ campuses: [], batches: [] });
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    courseModule: 'Module 1: Fundamentals',
    order: 1,
    lectureDate: new Date().toISOString().slice(0, 10),
    videoUrl: '',
    resourceUrl: '',
    campus: '',
    batch: '',
    isPublished: true,
  });

  useEffect(() => {
    fetchLectures();
    fetchMeta();
  }, []);

  const fetchLectures = async () => {
    setLoading(true);
    try {
      const { data } = await API.get('/lectures');
      setLectures(data);
    } catch {
      toast.error('Failed to load lectures');
    } finally {
      setLoading(false);
    }
  };

  const fetchMeta = async () => {
    try {
      const { data } = await API.get('/admin/students/meta');
      setMeta({ campuses: data.campuses || [], batches: data.batches || [] });
    } catch {
      // ignore
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      title: '',
      description: '',
      courseModule: 'Module 1: Fundamentals',
      order: lectures.length + 1,
      lectureDate: new Date().toISOString().slice(0, 10),
      videoUrl: '',
      resourceUrl: '',
      campus: '',
      batch: '',
      isPublished: true,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        const { data } = await API.put(`/lectures/${editingId}`, formData);
        setLectures(lectures.map((l) => (l._id === editingId ? data : l)));
        toast.success('Lecture updated');
      } else {
        const { data } = await API.post('/lectures', formData);
        setLectures([...lectures, data].sort((a, b) => a.order - b.order));
        toast.success('Lecture created');
      }
      setShowForm(false);
      resetForm();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save lecture');
    }
  };

  const handleEdit = (lec) => {
    setEditingId(lec._id);
    setFormData({
      title: lec.title || '',
      description: lec.description || '',
      courseModule: lec.courseModule || 'General',
      order: lec.order || 1,
      lectureDate: lec.lectureDate ? new Date(lec.lectureDate).toISOString().slice(0, 10) : '',
      videoUrl: lec.videoUrl || '',
      resourceUrl: lec.resourceUrl || '',
      campus: lec.campus || '',
      batch: lec.batch || '',
      isPublished: lec.isPublished !== false,
    });
    setShowForm(true);
  };

  const handleTogglePublish = async (lec) => {
    const nextState = lec.isPublished === false ? true : false;
    try {
      const { data } = await API.put(`/lectures/${lec._id}`, { isPublished: nextState });
      setLectures(lectures.map((l) => (l._id === lec._id ? data : l)));
      toast.success(nextState ? 'Lecture published' : 'Lecture unpublished');
    } catch {
      toast.error('Failed to update status');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this lecture?')) return;
    try {
      await API.delete(`/lectures/${id}`);
      setLectures(lectures.filter((l) => l._id !== id));
      toast.success('Lecture deleted');
    } catch {
      toast.error('Delete failed');
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      <Navbar />
      <main className="flex-1 lg:ml-64 p-4 sm:p-6 lg:p-8">
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Video Lectures</h1>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              Publish YouTube or Google Drive video lectures for our embedded portal player
            </p>
          </div>
          <button
            onClick={() => {
              if (showForm) {
                setShowForm(false);
                resetForm();
              } else {
                resetForm();
                setShowForm(true);
              }
            }}
            className="btn-primary flex items-center gap-2 text-sm py-2.5 px-5"
          >
            <Plus size={18} /> {showForm ? 'Close Form' : 'Add Lecture'}
          </button>
        </header>

        {showForm && (
          <form onSubmit={handleSubmit} className="card p-6 mb-6 space-y-5">
            <div className="flex justify-between items-center">
              <h2 className="text-base font-bold">
                {editingId ? 'Edit Lecture' : 'New Video Lecture'}
              </h2>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold uppercase mb-1">Lecture Title *</label>
                <input
                  type="text"
                  placeholder="e.g. DOM Manipulation & Event Delegation"
                  className="input-field"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase mb-1">Course / Module</label>
                <input
                  type="text"
                  placeholder="e.g. Module 2: JavaScript"
                  className="input-field"
                  value={formData.courseModule}
                  onChange={(e) => setFormData({ ...formData, courseModule: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase mb-1">Lecture Order # *</label>
                <input
                  type="number"
                  min={1}
                  className="input-field"
                  value={formData.order}
                  onChange={(e) => setFormData({ ...formData, order: Number(e.target.value) })}
                  required
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold uppercase mb-1">
                  Video URL (YouTube or Google Drive) *
                </label>
                <input
                  type="url"
                  placeholder="https://www.youtube.com/watch?v=... or https://drive.google.com/file/d/.../view"
                  className="input-field"
                  value={formData.videoUrl}
                  onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
                  required
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold uppercase mb-1">
                  Resources / Notes URL (Optional)
                </label>
                <input
                  type="url"
                  placeholder="https://github.com/... or Google Docs/Drive notes link"
                  className="input-field"
                  value={formData.resourceUrl}
                  onChange={(e) => setFormData({ ...formData, resourceUrl: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase mb-1">Lecture Date</label>
                <input
                  type="date"
                  className="input-field"
                  value={formData.lectureDate}
                  onChange={(e) => setFormData({ ...formData, lectureDate: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase mb-1">Target Campus</label>
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
                <label className="block text-xs font-semibold uppercase mb-1">Target Batch</label>
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

              <div className="flex items-end pb-2">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isPublished}
                    onChange={(e) => setFormData({ ...formData, isPublished: e.target.checked })}
                  />
                  <span>Published to students</span>
                </label>
              </div>

              <div className="sm:col-span-4">
                <label className="block text-xs font-semibold uppercase mb-1">Description</label>
                <textarea
                  placeholder="Key takeaways, topics covered, and reading notes..."
                  className="input-field min-h-[80px]"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
                className="btn-secondary text-sm"
              >
                Cancel
              </button>
              <button type="submit" className="btn-primary text-sm">
                {editingId ? 'Update Lecture' : 'Save Lecture'}
              </button>
            </div>
          </form>
        )}

        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[var(--bg-muted)] text-[var(--text-secondary)] text-xs font-semibold uppercase tracking-wider border-b border-[var(--border)]">
                <tr>
                  <th className="px-5 py-3.5 w-16">#</th>
                  <th className="px-5 py-3.5">Lecture</th>
                  <th className="px-5 py-3.5">Module & Date</th>
                  <th className="px-5 py-3.5">Target</th>
                  <th className="px-5 py-3.5">Source</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {lectures.map((lec) => (
                  <tr key={lec._id} className="hover:bg-[var(--bg-muted)]/40 transition-colors">
                    <td className="px-5 py-4 font-mono font-bold text-[var(--accent)]">
                      {lec.order}
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-bold text-[var(--text-primary)]">{lec.title}</p>
                      <p className="text-xs text-[var(--text-secondary)] line-clamp-1 max-w-sm">
                        {lec.description || 'No description'}
                      </p>
                    </td>
                    <td className="px-5 py-4 text-xs">
                      <p className="font-medium flex items-center gap-1">
                        <Layers size={13} /> {lec.courseModule || 'General'}
                      </p>
                      <p className="text-[var(--text-secondary)] flex items-center gap-1 mt-0.5">
                        <Calendar size={13} />{' '}
                        {lec.lectureDate ? new Date(lec.lectureDate).toLocaleDateString() : '—'}
                      </p>
                    </td>
                    <td className="px-5 py-4 text-xs">
                      <p className="font-medium">{lec.campus || 'All Campuses'}</p>
                      <p className="text-[var(--text-secondary)]">{lec.batch || 'All Batches'}</p>
                    </td>
                    <td className="px-5 py-4 text-xs">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[var(--bg-muted)] font-semibold uppercase">
                        {lec.videoProvider}
                      </span>
                      {lec.resourceUrl && (
                        <a
                          href={lec.resourceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="block text-[var(--accent)] hover:underline mt-1"
                        >
                          Resource Link <ExternalLink size={11} className="inline" />
                        </a>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => handleTogglePublish(lec)}
                          className="p-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--accent)]"
                          title={lec.isPublished !== false ? 'Unpublish' : 'Publish'}
                        >
                          {lec.isPublished !== false ? <Globe size={16} /> : <Lock size={16} />}
                        </button>
                        <button
                          onClick={() => handleEdit(lec)}
                          className="p-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--accent)]"
                          title="Edit Lecture"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(lec._id)}
                          className="p-2 rounded-lg text-[var(--text-secondary)] hover:text-rose-600"
                          title="Delete Lecture"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {lectures.length === 0 && !loading && (
            <div className="p-14 text-center">
              <Video className="mx-auto text-[var(--text-muted)] mb-3" size={40} />
              <p className="font-semibold text-base">No video lectures added yet</p>
              <p className="text-xs text-[var(--text-secondary)] mt-1">
                Add a YouTube or Google Drive lecture link to publish to the student portal.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default ManageLecturesPage;
