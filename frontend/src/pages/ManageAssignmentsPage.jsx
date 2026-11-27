import React, { useState, useEffect, useCallback } from 'react';
import API from '../api';
import Navbar from '../components/AdminNavbar';
import { Plus, Trash2, Edit, FileArchive, Eye, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { broadcastLiveUpdate, useLiveRefresh } from '../utils/liveSync';
import { clientCache } from '../utils/clientCache';

const CATEGORY_META = {
  coding: { label: '💻 Coding', color: 'text-indigo-600 bg-indigo-500/10' },
  research: { label: '📝 Research', color: 'text-blue-600 bg-blue-500/10' },
  spreadsheet: { label: '📊 Spreadsheet', color: 'text-emerald-600 bg-emerald-500/10' },
  presentation: { label: '📽️ Slides', color: 'text-amber-600 bg-amber-500/10' },
  graphic: { label: '🎨 Graphic / UI', color: 'text-fuchsia-600 bg-fuchsia-500/10' },
  video: { label: '🎬 Video', color: 'text-rose-600 bg-rose-500/10' },
  general: { label: '📄 General', color: 'text-gray-600 bg-gray-500/10' },
};

const ManageAssignmentsPage = () => {
  const cachedAssignments = clientCache.get('admin_assignments_data');
  const cachedMeta = clientCache.get('admin_assignments_meta');
  const [assignments, setAssignments] = useState(cachedAssignments || []);
  const [meta, setMeta] = useState(cachedMeta || { campuses: [], batches: [] });
  const [loading, setLoading] = useState(!cachedAssignments);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    dueDate: '',
    totalMarks: 100,
    allowLateSubmission: true,
    campus: '',
    batch: '',
    projectType: 'vanilla',
    category: 'coding',
  });

  const fetchAssignments = useCallback(async (silent = false) => {
    const hasCache = clientCache.has('admin_assignments_data');
    if (!silent && !hasCache) setLoading(true);
    try {
      const { data } = await API.get('/assignments');
      setAssignments(data);
      clientCache.set('admin_assignments_data', data);
    } catch {
      if (!silent) toast.error('Failed to load assignments');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAssignments(clientCache.has('admin_assignments_data'));
    fetchMeta();
  }, [fetchAssignments]);

  // Live silent background sync: re-syncs submission counts when students submit projects
  useLiveRefresh(fetchAssignments, 10000, ['ASSIGNMENT_SUBMITTED']);

  const fetchMeta = async () => {
    try {
      const { data } = await API.get('/admin/students/meta');
      const metaObj = { campuses: data.campuses || [], batches: data.batches || [] };
      setMeta(metaObj);
      clientCache.set('admin_assignments_meta', metaObj);
    } catch {
      // ignore
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      title: '',
      description: '',
      dueDate: '',
      totalMarks: 100,
      allowLateSubmission: true,
      campus: '',
      batch: '',
      projectType: 'vanilla',
      category: 'coding',
    });
  };

  const toLocalInput = (utc) => {
    if (!utc) return '';
    const d = new Date(utc);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  };

  const handleEdit = (a) => {
    setEditingId(a._id);
    setFormData({
      title: a.title || '',
      description: a.description || '',
      dueDate: toLocalInput(a.dueDate),
      totalMarks: a.totalMarks || 100,
      allowLateSubmission: a.allowLateSubmission !== false,
      campus: a.campus || '',
      batch: a.batch || '',
      projectType: a.projectType || 'vanilla',
      category: a.category || 'coding',
    });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        const { data } = await API.put(`/assignments/${editingId}`, formData);
        setAssignments(assignments.map((a) => (a._id === editingId ? { ...a, ...data } : a)));
        broadcastLiveUpdate('ASSIGNMENT_UPDATED', { assignmentId: data._id });
        toast.success('Assignment updated');
      } else {
        const { data } = await API.post('/assignments', formData);
        setAssignments([data, ...assignments]);
        broadcastLiveUpdate('ASSIGNMENT_CREATED', { assignmentId: data._id });
        toast.success('Assignment created');
      }
      setShowForm(false);
      resetForm();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save assignment');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this assignment and all its submissions?')) return;
    try {
      await API.delete(`/assignments/${id}`);
      setAssignments(assignments.filter((a) => a._id !== id));
      toast.success('Assignment deleted');
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
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Assignments</h1>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              Create assignments, manage due dates and campus/batch visibility, and grade submissions
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
            <Plus size={18} /> {showForm ? 'Close Form' : 'Create Assignment'}
          </button>
        </header>

        {showForm && (
          <form onSubmit={handleSubmit} className="card p-6 mb-6 space-y-5">
            <div className="flex justify-between items-center">
              <h2 className="text-base font-bold">
                {editingId ? 'Edit Assignment' : 'New Assignment'}
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

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold uppercase mb-1">Title *</label>
                <input
                  type="text"
                  placeholder="e.g. Responsive E-Commerce Landing Page"
                  className="input-field"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase mb-1">Total Marks *</label>
                <input
                  type="number"
                  min={1}
                  className="input-field"
                  value={formData.totalMarks}
                  onChange={(e) => setFormData({ ...formData, totalMarks: Number(e.target.value) })}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase mb-1">Due Date *</label>
                <input
                  type="datetime-local"
                  className="input-field"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase mb-1">Category & Nature</label>
                <select
                  className="input-field"
                  value={formData.category || 'coding'}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                >
                  <option value="coding">💻 Coding & Web App (IDE / Vercel / GitHub / ZIP)</option>
                  <option value="research">📝 Research & Writing (Google Docs / Papers / PDF)</option>
                  <option value="spreadsheet">📊 Spreadsheet & Data (Google Sheets / Excel / CSV)</option>
                  <option value="presentation">📽️ Presentation & Slides (Google Slides / PPT)</option>
                  <option value="graphic">🎨 Graphic & UI Design (Image Upload / Figma / Artwork)</option>
                  <option value="video">🎬 Video & Media (YouTube / Loom / Drive Video)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase mb-1">Code / Tech Mode</label>
                <select
                  className="input-field"
                  value={formData.projectType}
                  onChange={(e) => setFormData({ ...formData, projectType: e.target.value })}
                >
                  <option value="react">React Project (Vite Web IDE / Live Vercel / GitHub / ZIP)</option>
                  <option value="vanilla">Web Project (HTML/CSS/JS / Live / ZIP)</option>
                  <option value="document">General Document / Media</option>
                </select>
              </div>

              <div className="flex items-end pb-2">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.allowLateSubmission}
                    onChange={(e) =>
                      setFormData({ ...formData, allowLateSubmission: e.target.checked })
                    }
                  />
                  <span>Allow late submissions (marked Late)</span>
                </label>
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

              <div className="sm:col-span-3">
                <label className="block text-xs font-semibold uppercase mb-1">Instructions</label>
                <textarea
                  placeholder="Requirements, deliverables, and evaluation criteria..."
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
                {editingId ? 'Save Changes' : 'Create Assignment'}
              </button>
            </div>
          </form>
        )}

        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[var(--bg-muted)] text-[var(--text-secondary)] text-xs font-semibold uppercase tracking-wider border-b border-[var(--border)]">
                <tr>
                  <th className="px-5 py-3.5">Assignment</th>
                  <th className="px-5 py-3.5">Due Date</th>
                  <th className="px-5 py-3.5">Target</th>
                  <th className="px-5 py-3.5">Submissions</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {assignments.map((assignment) => {
                  const isPastDue = new Date() > new Date(assignment.dueDate);
                  return (
                    <tr key={assignment._id} className="hover:bg-[var(--bg-muted)]/40 transition-colors">
                      <td className="px-5 py-4">
                        <p className="font-bold text-[var(--text-primary)]">{assignment.title}</p>
                        <p className="text-xs text-[var(--text-secondary)] line-clamp-1 max-w-sm">
                          {assignment.description || 'No description'}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span
                            className={`text-[11px] font-semibold px-2 py-0.5 rounded ${
                              CATEGORY_META[assignment.category]?.color ||
                              CATEGORY_META.coding.color
                            }`}
                          >
                            {CATEGORY_META[assignment.category]?.label || '💻 Coding'}
                          </span>
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-[var(--bg-muted)] uppercase">
                            {assignment.projectType === 'react'
                              ? 'React'
                              : assignment.projectType === 'document'
                              ? 'Doc / Media'
                              : 'Vanilla'}
                          </span>
                          <span className="text-xs text-[var(--text-muted)]">
                            {assignment.totalMarks || 100} Marks
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-xs">
                        <p className="font-medium">
                          {new Date(assignment.dueDate).toLocaleString()}
                        </p>
                        <span
                          className={`inline-block mt-0.5 text-[11px] font-semibold ${
                            isPastDue ? 'text-rose-600' : 'text-emerald-600'
                          }`}
                        >
                          {isPastDue ? 'Past Due' : 'Active'}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-xs">
                        <p className="font-medium">{assignment.campus || 'All Campuses'}</p>
                        <p className="text-[var(--text-secondary)]">
                          {assignment.batch || 'All Batches'}
                        </p>
                      </td>
                      <td className="px-5 py-4 text-xs font-semibold">
                        <Link
                          to={`/admin/assignments/${assignment._id}/submissions`}
                          className="text-[var(--accent)] hover:underline"
                        >
                          {assignment.submissionCount ?? 0} Submitted
                        </Link>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          <Link
                            to={`/admin/assignments/${assignment._id}/submissions`}
                            className="p-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--accent)]"
                            title="View & Grade Submissions"
                          >
                            <Eye size={16} />
                          </Link>
                          <button
                            onClick={() => handleEdit(assignment)}
                            className="p-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--accent)]"
                            title="Edit Assignment"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(assignment._id)}
                            className="p-2 rounded-lg text-[var(--text-secondary)] hover:text-rose-600"
                            title="Delete Assignment"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {assignments.length === 0 && !loading && (
            <div className="p-14 text-center">
              <FileArchive className="mx-auto text-[var(--text-muted)] mb-3" size={40} />
              <p className="font-semibold text-base">No assignments created yet</p>
              <p className="text-xs text-[var(--text-secondary)] mt-1">
                Create an assignment for your students to submit files, links, or Web IDE code.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default ManageAssignmentsPage;
