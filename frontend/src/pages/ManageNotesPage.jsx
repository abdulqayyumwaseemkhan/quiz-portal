import React, { useState, useEffect, useCallback } from 'react';
import API from '../api';
import Navbar from '../components/AdminNavbar';
import {
  Plus,
  Trash2,
  FileText,
  UploadCloud,
  Edit2,
  ExternalLink,
  Search,
  BookOpen,
  Presentation,
  FileArchive,
  Link as LinkIcon,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { clientCache } from '../utils/clientCache';

const NOTE_CATEGORIES = [
  { value: 'handout', label: '📄 Handout & Notes', icon: FileText, color: 'text-blue-600 bg-blue-500/10' },
  { value: 'slides', label: '📽️ Slides & Presentation', icon: Presentation, color: 'text-amber-600 bg-amber-500/10' },
  { value: 'code', label: '📦 Code Starter / Archive', icon: FileArchive, color: 'text-indigo-600 bg-indigo-500/10' },
  { value: 'link', label: '🔗 Cloud / Web Resource', icon: LinkIcon, color: 'text-emerald-600 bg-emerald-500/10' },
  { value: 'cheatsheet', label: '📝 Cheat Sheet & Summary', icon: BookOpen, color: 'text-fuchsia-600 bg-fuchsia-500/10' },
];

const ManageNotesPage = () => {
  const cachedNotes = clientCache.get('admin_notes_data');
  const cachedMeta = clientCache.get('admin_notes_meta');
  const [notes, setNotes] = useState(cachedNotes || []);
  const [meta, setMeta] = useState(cachedMeta || { campuses: [], batches: [] });
  const [loading, setLoading] = useState(!cachedNotes);
  const [showAdd, setShowAdd] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [resourceMode, setResourceMode] = useState('file'); // 'file' | 'link'

  const [formData, setFormData] = useState({
    lectureNumber: '',
    lectureTitle: '',
    description: '',
    category: 'handout',
    externalUrl: '',
    campus: '',
    batch: '',
  });
  const [file, setFile] = useState(null);

  const fetchNotes = useCallback(async (silent = false) => {
    const hasCache = clientCache.has('admin_notes_data');
    if (!silent && !hasCache) setLoading(true);
    try {
      const { data } = await API.get('/notes');
      setNotes(data);
      clientCache.set('admin_notes_data', data);
    } catch (error) {
      console.error(error);
      if (!silent) toast.error('Failed to load notes');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  const fetchMeta = useCallback(async () => {
    try {
      const { data } = await API.get('/admin/students/meta');
      const metaObj = { campuses: data.campuses || [], batches: data.batches || [] };
      setMeta(metaObj);
      clientCache.set('admin_notes_meta', metaObj);
    } catch (error) {
      console.error(error);
    }
  }, []);

  useEffect(() => {
    fetchNotes(clientCache.has('admin_notes_data'));
    fetchMeta();
  }, [fetchNotes, fetchMeta]);

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      lectureNumber: '',
      lectureTitle: '',
      description: '',
      category: 'handout',
      externalUrl: '',
      campus: '',
      batch: '',
    });
    setFile(null);
    setResourceMode('file');
  };

  const handleEdit = (note) => {
    setEditingId(note._id);
    setFormData({
      lectureNumber: note.lectureNumber,
      lectureTitle: note.lectureTitle,
      description: note.description || '',
      category: note.category || (note.fileType === 'link' ? 'link' : 'handout'),
      externalUrl: note.externalUrl || (note.fileType === 'link' ? note.fileUrl : ''),
      campus: note.campus || '',
      batch: note.batch || '',
    });
    setResourceMode(note.fileType === 'link' || note.externalUrl ? 'link' : 'file');
    setFile(null);
    setShowAdd(true);
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (editingId) {
      setUploading(true);
      try {
        const payload = {
          lectureNumber: formData.lectureNumber,
          lectureTitle: formData.lectureTitle,
          description: formData.description,
          category: formData.category,
          campus: formData.campus,
          batch: formData.batch,
        };
        if (resourceMode === 'link' && formData.externalUrl.trim()) {
          payload.externalUrl = formData.externalUrl.trim();
        }
        const { data } = await API.put(`/notes/${editingId}`, payload);
        setNotes((prev) => prev.map((n) => (n._id === data._id ? data : n)));
        resetForm();
        setShowAdd(false);
        toast.success('Note updated successfully');
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to update note');
      } finally {
        setUploading(false);
      }
      return;
    }

    if (resourceMode === 'file' && !file) {
      toast.error('Please select a file to upload or switch to Resource Link mode');
      return;
    }

    if (resourceMode === 'link' && !formData.externalUrl.trim()) {
      toast.error('Please provide a valid cloud or resource URL');
      return;
    }

    setUploading(true);
    const data = new FormData();
    data.append('lectureNumber', formData.lectureNumber);
    data.append('lectureTitle', formData.lectureTitle);
    data.append('description', formData.description);
    data.append('category', formData.category);
    data.append('campus', formData.campus);
    data.append('batch', formData.batch);

    if (resourceMode === 'file' && file) {
      data.append('file', file);
    } else if (resourceMode === 'link') {
      data.append('externalUrl', formData.externalUrl.trim());
    }

    try {
      const response = await API.post('/notes', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const newNotes = [...notes, response.data].sort((a, b) => a.lectureNumber - b.lectureNumber);
      setNotes(newNotes);
      resetForm();
      setShowAdd(false);
      toast.success('Note published successfully');
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
        setNotes(notes.filter((n) => n._id !== id));
        toast.success('Note deleted');
      } catch (error) {
        console.error(error);
        toast.error('Delete failed');
      }
    }
  };

  const filteredNotes = notes.filter((n) => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return true;
    return (
      n.lectureTitle.toLowerCase().includes(q) ||
      String(n.lectureNumber).includes(q) ||
      (n.category && n.category.toLowerCase().includes(q))
    );
  });

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <Navbar />
      <main className="flex-1 lg:ml-64 p-4 sm:p-8 max-w-6xl">
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Lecture Notes & Resources</h1>
            <p className="text-sm text-[var(--text-muted)] mt-1">
              Publish handouts, slides, code archives, and cloud links for your students
            </p>
          </div>
          <button
            onClick={() => {
              if (showAdd) {
                setShowAdd(false);
                resetForm();
              } else {
                resetForm();
                setShowAdd(true);
              }
            }}
            className="btn-primary flex items-center gap-2 self-start py-2.5 px-4 text-xs font-semibold"
          >
            {showAdd ? (
              <>
                <X size={16} /> Close Form
              </>
            ) : (
              <>
                <Plus size={16} /> Create / Upload Resource
              </>
            )}
          </button>
        </header>

        {showAdd && (
          <form
            onSubmit={handleSubmit}
            className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl p-6 mb-6 space-y-5 shadow-sm animate-fade-in"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
              <h2 className="text-base font-bold text-[var(--text-primary)]">
                {editingId ? 'Edit Lecture Note' : 'New Lecture Resource'}
              </h2>
              <div className="flex items-center gap-1.5 p-1 bg-[var(--bg-muted)] rounded-lg text-xs font-semibold border border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => setResourceMode('file')}
                  className={`py-1 px-3 rounded-md transition-all ${
                    resourceMode === 'file'
                      ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  📁 File Upload
                </button>
                <button
                  type="button"
                  onClick={() => setResourceMode('link')}
                  className={`py-1 px-3 rounded-md transition-all ${
                    resourceMode === 'link'
                      ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  🔗 Cloud / Drive Link
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1">
                  Lecture Number *
                </label>
                <input
                  type="number"
                  min="1"
                  placeholder="e.g. 1"
                  className="input-field py-2 text-sm"
                  value={formData.lectureNumber}
                  onChange={(e) => setFormData({ ...formData, lectureNumber: e.target.value })}
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1">
                  Lecture Title *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Introduction to React & Component Architecture"
                  className="input-field py-2 text-sm"
                  value={formData.lectureTitle}
                  onChange={(e) => setFormData({ ...formData, lectureTitle: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1">
                  Resource Category
                </label>
                <select
                  className="input-field py-2 text-sm"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                >
                  {NOTE_CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1">
                  Campus Visibility
                </label>
                <select
                  className="input-field py-2 text-sm"
                  value={formData.campus}
                  onChange={(e) => setFormData({ ...formData, campus: e.target.value })}
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
                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1">
                  Batch Visibility
                </label>
                <select
                  className="input-field py-2 text-sm"
                  value={formData.batch}
                  onChange={(e) => setFormData({ ...formData, batch: e.target.value })}
                >
                  <option value="">All Batches</option>
                  {meta.batches?.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-3">
                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1">
                  Overview & Key Topics
                </label>
                <textarea
                  placeholder="What is covered in this resource? (Topics, references, required readings)..."
                  className="input-field h-20 text-xs leading-relaxed"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              {resourceMode === 'link' ? (
                <div className="md:col-span-3">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1">
                    Resource Web / Cloud URL *
                  </label>
                  <div className="relative">
                    <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={15} />
                    <input
                      type="url"
                      placeholder="e.g. https://drive.google.com/drive/folders/... or https://notion.so/... or https://github.com/..."
                      className="input-field pl-9 py-2 text-xs"
                      value={formData.externalUrl}
                      onChange={(e) => setFormData({ ...formData, externalUrl: e.target.value })}
                      required={resourceMode === 'link'}
                    />
                  </div>
                  <p className="text-[11px] text-[var(--text-muted)] mt-1">
                    Students will be given a direct one-click link to open this resource.
                  </p>
                </div>
              ) : (
                <div className="md:col-span-3">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1">
                    Attach Resource File *
                  </label>
                  <label className="flex items-center justify-center w-full p-4 bg-[var(--bg-primary)] border border-dashed border-[var(--border)] rounded-xl cursor-pointer hover:border-[var(--accent)] transition-colors">
                    <span className="flex items-center space-x-2 text-xs">
                      <UploadCloud className="w-5 h-5 text-[var(--text-muted)]" />
                      <span className="font-semibold text-[var(--text-secondary)]">
                        {file ? file.name : 'Select PDF, Slide Deck (.pptx), Document, or ZIP File'}
                      </span>
                    </span>
                    <input
                      type="file"
                      className="hidden"
                      accept=".zip,.pdf,.doc,.docx,.ppt,.pptx,.png,.jpg,.jpeg"
                      onChange={handleFileChange}
                    />
                  </label>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2.5 pt-2 border-t border-[var(--border)]">
              <button
                type="button"
                onClick={() => {
                  setShowAdd(false);
                  resetForm();
                }}
                className="btn-secondary py-2 px-4 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={uploading}
                className="btn-primary py-2 px-5 text-xs font-semibold disabled:opacity-50"
              >
                {uploading ? 'Saving Resource...' : editingId ? 'Update Resource' : 'Publish Resource'}
              </button>
            </div>
          </form>
        )}

        {/* Notes Search & List */}
        <div className="mb-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={15} />
            <input
              type="text"
              placeholder="Search by title, number, or category..."
              className="input-field pl-9 py-2 text-xs"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <span className="text-xs text-[var(--text-muted)] self-end sm:self-center font-medium">
            Total Resources: {filteredNotes.length}
          </span>
        </div>

        <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border)] overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[var(--bg-muted)] text-[var(--text-muted)] text-xs font-semibold uppercase tracking-wider border-b border-[var(--border)]">
                <tr>
                  <th className="px-5 py-3.5">#</th>
                  <th className="px-5 py-3.5">Lecture Title & Overview</th>
                  <th className="px-5 py-3.5">Category</th>
                  <th className="px-5 py-3.5">Resource Link / File</th>
                  <th className="px-5 py-3.5">Target</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {filteredNotes.map((note) => {
                  const cat = NOTE_CATEGORIES.find((c) => c.value === note.category) || NOTE_CATEGORIES[0];
                  const isLink = note.fileType === 'link' || note.externalUrl;
                  return (
                    <tr key={note._id} className="hover:bg-[var(--bg-muted)]/50 transition-colors">
                      <td className="px-5 py-3.5 font-mono font-bold text-xs text-[var(--accent)]">
                        Lec {note.lectureNumber}
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="font-semibold text-xs sm:text-sm text-[var(--text-primary)]">
                          {note.lectureTitle}
                        </p>
                        <p className="text-xs text-[var(--text-muted)] line-clamp-1 max-w-xs">
                          {note.description || 'No description provided'}
                        </p>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${cat.color}`}>
                          {cat.label}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        {isLink ? (
                          <a
                            href={note.fileUrl || note.externalUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs font-semibold text-emerald-600 hover:underline inline-flex items-center gap-1.5"
                          >
                            <ExternalLink size={13} /> Open Cloud Link
                          </a>
                        ) : (
                          <a
                            href={note.fileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs font-semibold text-[var(--accent)] hover:underline inline-flex items-center gap-1.5"
                          >
                            <FileText size={13} /> {note.fileType?.toUpperCase() || 'FILE'}
                          </a>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-[var(--text-secondary)]">
                        {note.campus || 'All Campuses'} · {note.batch || 'All Batches'}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleEdit(note)}
                            className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-muted)] rounded-lg transition-colors"
                            title="Edit Note"
                          >
                            <Edit2 size={15} />
                          </button>
                          <button
                            onClick={() => handleDelete(note._id)}
                            className="p-1.5 text-rose-600 hover:bg-rose-500/10 rounded-lg transition-colors"
                            title="Delete Note"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {filteredNotes.length === 0 && !loading && (
            <div className="p-12 text-center text-sm text-[var(--text-muted)]">
              No lecture notes match your search.
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default ManageNotesPage;
