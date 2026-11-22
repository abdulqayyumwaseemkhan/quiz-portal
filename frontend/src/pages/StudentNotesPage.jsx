import React, { useState, useEffect } from 'react';
import API from '../api';
import {
  FileText,
  FileArchive,
  FileImage,
  Download,
  Search,
  ExternalLink,
  Presentation,
  Link as LinkIcon,
  BookOpen,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import StudentNavbar from '../components/StudentNavbar';
import { clientCache } from '../utils/clientCache';
import { useLiveRefresh } from '../utils/liveSync';

const getFileIcon = (fileType = '', category = '') => {
  if (category === 'slides' || fileType === 'pptx' || fileType === 'ppt') return <Presentation size={20} />;
  if (category === 'code' || fileType === 'zip') return <FileArchive size={20} />;
  if (category === 'link' || fileType === 'link') return <LinkIcon size={20} />;
  if (category === 'cheatsheet') return <BookOpen size={20} />;
  if (['png', 'jpg', 'jpeg'].includes(fileType.toLowerCase())) return <FileImage size={20} />;
  return <FileText size={20} />;
};

const CATEGORIES = [
  { id: '', label: 'All Resources' },
  { id: 'handout', label: '📄 Handouts' },
  { id: 'slides', label: '📽️ Slides' },
  { id: 'code', label: '📦 Starter Code' },
  { id: 'link', label: '🔗 Cloud Links' },
  { id: 'cheatsheet', label: '📝 Cheat Sheets' },
];

const StudentNotesPage = () => {
  const student = React.useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('studentInfo'));
    } catch {
      return null;
    }
  }, []);

  const cacheKey = student?.studentId ? `student_notes_${student.studentId}` : null;
  const cached = cacheKey ? clientCache.get(cacheKey) : null;

  const [notes, setNotes] = useState(cached || []);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [loading, setLoading] = useState(!cached);
  const navigate = useNavigate();

  useEffect(() => {
    if (!student) {
      navigate('/', { replace: true });
    }
  }, [student, navigate]);

  const fetchNotes = React.useCallback(async (silent = false) => {
    const hasCache = cacheKey && clientCache.has(cacheKey);
    if (!silent && !hasCache) setLoading(true);
    try {
      const { data } = await API.get(`/student/notes/${student.studentId}`);
      setNotes(data);
      if (cacheKey) clientCache.set(cacheKey, data);
    } catch (error) {
      console.error(error);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [student, cacheKey]);

  useEffect(() => {
    if (student) fetchNotes(cacheKey && clientCache.has(cacheKey) ? true : false);
  }, [student, fetchNotes, cacheKey]);

  useLiveRefresh(() => fetchNotes(true), 12000, ['NOTE_CREATED', 'NOTE_UPDATED', 'NOTE_DELETED']);

  const filteredNotes = notes.filter((n) => {
    const q = searchTerm.trim().toLowerCase();
    const matchesSearch =
      !q ||
      n.lectureTitle.toLowerCase().includes(q) ||
      String(n.lectureNumber).includes(q) ||
      (n.description && n.description.toLowerCase().includes(q));

    const matchesCategory =
      !selectedCategory ||
      (n.category || (n.fileType === 'link' ? 'link' : 'handout')) === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] pb-14">
      <StudentNavbar student={student} />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Lecture Notes & Resources</h1>
            <p className="text-sm text-[var(--text-muted)] mt-1">
              Download lecture slides, handouts, code starters, and reference links
            </p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
              size={16}
            />
            <input
              type="text"
              placeholder="Search by topic, number..."
              className="input-field pl-9 py-2 text-xs"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex flex-wrap gap-2 pb-1">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`py-1.5 px-3 rounded-xl text-xs font-semibold transition-all ${
                selectedCategory === cat.id
                  ? 'bg-[var(--accent)] text-white shadow-sm'
                  : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border border-[var(--border)] hover:bg-[var(--bg-muted)]'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="h-44 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] animate-pulse"
              />
            ))}
          </div>
        ) : filteredNotes.length === 0 ? (
          <div className="text-center py-16 bg-[var(--bg-surface)] rounded-2xl border border-[var(--border)]">
            <FileText className="mx-auto text-[var(--text-muted)] mb-3" size={32} />
            <p className="font-semibold text-base">No lecture resources found</p>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              Course notes and resources published for your batch will appear here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredNotes.map((note) => {
              const isLink = note.fileType === 'link' || note.externalUrl;
              return (
                <div
                  key={note._id}
                  className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl p-5 flex flex-col justify-between hover:border-[var(--accent)] transition-all shadow-sm"
                >
                  <div>
                    <div className="flex items-start justify-between mb-3">
                      <div className="p-2.5 rounded-xl bg-[var(--accent-subtle)] text-[var(--accent)]">
                        {getFileIcon(note.fileType, note.category)}
                      </div>
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[var(--bg-muted)] text-[var(--text-secondary)] font-mono">
                        Lecture {note.lectureNumber}
                      </span>
                    </div>
                    <h3 className="text-base font-bold mb-1.5 line-clamp-1">{note.lectureTitle}</h3>
                    <p className="text-xs text-[var(--text-muted)] line-clamp-3 mb-4 leading-relaxed">
                      {note.description || 'No additional notes provided.'}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-[var(--border)]">
                    {isLink ? (
                      <a
                        href={note.fileUrl || note.externalUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-primary w-full flex items-center justify-center gap-2 text-xs py-2"
                      >
                        <ExternalLink size={14} /> Open Cloud Resource
                      </a>
                    ) : (
                      <a
                        href={note.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-secondary w-full flex items-center justify-center gap-2 text-xs py-2"
                      >
                        <Download size={14} /> Download ({note.fileType?.toUpperCase() || 'FILE'})
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentNotesPage;
