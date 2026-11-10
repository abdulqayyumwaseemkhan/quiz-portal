import React, { useState, useEffect } from 'react';
import API from '../api';
import Navbar from '../components/AdminNavbar';
import { Plus, Trash2, FileText, UploadCloud } from 'lucide-react';
import toast from 'react-hot-toast';

const ManageNotesPage = () => {
  const [notes, setNotes] = useState([]);
  const [meta, setMeta] = useState({ campuses: [], batches: [] });
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [formData, setFormData] = useState({
    lectureNumber: '',
    lectureTitle: '',
    description: '',
    campus: '',
    batch: '',
  });
  const [file, setFile] = useState(null);

  useEffect(() => {
    fetchNotes();
    fetchMeta();
  }, []);

  const fetchNotes = async () => {
    try {
      const { data } = await API.get('/notes');
      setNotes(data);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load notes');
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

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!file) {
      toast.error('Please select a file to upload');
      return;
    }

    setUploading(true);
    const data = new FormData();
    data.append('lectureNumber', formData.lectureNumber);
    data.append('lectureTitle', formData.lectureTitle);
    data.append('description', formData.description);
    data.append('campus', formData.campus);
    data.append('batch', formData.batch);
    data.append('file', file);

    try {
      const response = await API.post('/notes', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const newNotes = [...notes, response.data].sort((a, b) => a.lectureNumber - b.lectureNumber);
      setNotes(newNotes);

      setFormData({ lectureNumber: '', lectureTitle: '', description: '', campus: '', batch: '' });
      setFile(null);
      setShowAdd(false);
      toast.success('Note uploaded successfully');
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

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <Navbar />
      <main className="md:ml-64 p-4 sm:p-8 max-w-6xl">
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Lecture Notes</h1>
            <p className="text-sm text-[var(--text-muted)] mt-1">
              Upload and organize downloadable slides, PDFs, and starter files
            </p>
          </div>
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="btn-primary flex items-center gap-2 self-start"
          >
            {showAdd ? 'Cancel' : <><Plus size={16} /> Upload Note</>}
          </button>
        </header>

        {showAdd && (
          <form
            onSubmit={handleAddNote}
            className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl p-6 mb-6 space-y-4"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Lecture Number *
                </label>
                <input
                  type="number"
                  min="1"
                  placeholder="e.g. 1"
                  className="input-field"
                  value={formData.lectureNumber}
                  onChange={(e) => setFormData({ ...formData, lectureNumber: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Lecture Title *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Introduction to React"
                  className="input-field"
                  value={formData.lectureTitle}
                  onChange={(e) => setFormData({ ...formData, lectureTitle: e.target.value })}
                  required
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Description
                </label>
                <textarea
                  placeholder="Brief overview of the lecture material..."
                  className="input-field h-20"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
              <div className="md:col-span-2">
                <label className="flex items-center justify-center w-full h-16 px-4 bg-[var(--bg-primary)] border border-dashed border-[var(--border)] rounded-lg cursor-pointer hover:border-[var(--accent)] transition-colors">
                  <span className="flex items-center space-x-2 text-sm">
                    <UploadCloud className="w-5 h-5 text-[var(--text-muted)]" />
                    <span className="font-medium text-[var(--text-secondary)]">
                      {file ? file.name : 'Select file (PDF, PPT, DOC, ZIP, PNG, JPG)'}
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
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Campus (Optional)
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
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Batch (Optional)
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
            </div>
            <div className="flex justify-end pt-2">
              <button type="submit" disabled={uploading} className="btn-primary">
                {uploading ? 'Uploading...' : 'Save Lecture Note'}
              </button>
            </div>
          </form>
        )}

        <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[var(--bg-muted)] text-[var(--text-muted)] text-xs font-semibold uppercase tracking-wider border-b border-[var(--border)]">
                <tr>
                  <th className="px-5 py-3.5">#</th>
                  <th className="px-5 py-3.5">Lecture Details</th>
                  <th className="px-5 py-3.5">File</th>
                  <th className="px-5 py-3.5">Target</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {notes.map((note) => (
                  <tr key={note._id} className="hover:bg-[var(--bg-muted)]/50 transition-colors">
                    <td className="px-5 py-3.5 font-mono font-semibold text-[var(--text-muted)]">
                      {note.lectureNumber}
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="font-semibold text-[var(--text-primary)]">{note.lectureTitle}</p>
                      <p className="text-xs text-[var(--text-muted)] line-clamp-1">
                        {note.description || 'No description'}
                      </p>
                    </td>
                    <td className="px-5 py-3.5">
                      <a
                        href={note.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-semibold text-[var(--accent)] hover:underline inline-flex items-center gap-1.5"
                      >
                        <FileText size={14} /> {note.fileType?.toUpperCase() || 'FILE'}
                      </a>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-[var(--text-secondary)]">
                      {note.campus || 'All Campuses'} · {note.batch || 'All Batches'}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => handleDelete(note._id)}
                        className="p-2 text-rose-600 hover:bg-rose-500/10 rounded-lg transition-colors"
                        title="Delete Note"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {notes.length === 0 && !loading && (
            <div className="p-12 text-center text-sm text-[var(--text-muted)]">
              No lecture notes uploaded yet.
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default ManageNotesPage;
