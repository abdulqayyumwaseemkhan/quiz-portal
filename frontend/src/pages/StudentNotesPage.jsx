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
  if (category === 'slides' || fileType === 'pptx' || fileType === 'ppt')
    return <Presentation size={18} />;
  if (category === 'code' || fileType === 'zip') return <FileArchive size={18} />;
  if (category === 'link' || fileType === 'link') return <LinkIcon size={18} />;
  if (category === 'cheatsheet') return <BookOpen size={18} />;
  if (['png', 'jpg', 'jpeg'].includes(fileType.toLowerCase())) return <FileImage size={18} />;
  return <FileText size={18} />;
};

const CATEGORIES = [
  { id: '', label: 'All Materials' },
  { id: 'handout', label: 'Handouts' },
  { id: 'slides', label: 'Lecture Slides' },
  { id: 'code', label: 'Starter Code' },
  { id: 'link', label: 'Reference Links' },
  { id: 'cheatsheet', label: 'Summary Notes' },
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

  const fetchNotes = React.useCallback(
    async (silent = false) => {
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
    },
    [student, cacheKey]
  );

  useEffect(() => {
    if (student) fetchNotes(cacheKey && clientCache.has(cacheKey) ? true : false);
  }, [student, fetchNotes, cacheKey]);

  useLiveRefresh(() => fetchNotes(true), 12000, [
    'NOTE_CREATED',
    'NOTE_UPDATED',
    'NOTE_DELETED',
  ]);

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
    <div className="student-portal min-h-screen pb-16">
      <StudentNavbar student={student} />
      <main className="lg:pl-60">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)]">
                Course Notes &amp; Reference Materials
              </h1>
              <p className="text-sm text-[var(--text-secondary)] mt-1">
                Download lecture handouts, slide decks, starter archives, and reading links
              </p>
            </div>
            <div className="relative w-full sm:w-72">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]"
                size={15}
              />
              <input
                type="text"
                placeholder="Search by topic or lecture..."
                className="input-field pl-9 py-2 text-xs"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Crisp Academic Category Filter Bar */}
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`py-1.5 px-3 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                  selectedCategory === cat.id
                    ? 'btn-primary'
                    : 'btn-secondary'
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
                  className="h-44 rounded-md bg-[var(--bg-surface)] border border-[var(--border)] animate-pulse"
                />
              ))}
            </div>
          ) : filteredNotes.length === 0 ? (
            <div className="card p-12 text-center">
              <FileText className="mx-auto text-[var(--text-secondary)] mb-3" size={32} />
              <p className="font-semibold text-base text-[var(--text-primary)]">
                No reference materials found
              </p>
              <p className="text-xs text-[var(--text-secondary)] mt-1">
                Course notes published for your batch will appear here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredNotes.map((note) => {
                const isLink = note.fileType === 'link' || note.externalUrl;
                return (
                  <div
                    key={note._id}
                    className="card p-5 flex flex-col justify-between hover:border-[var(--brand-secondary)] transition-colors"
                  >
                    <div>
                      <div className="flex items-start justify-between mb-3">
                        <div className="p-2 rounded bg-[var(--accent-subtle)] text-[var(--accent)]">
                          {getFileIcon(note.fileType, note.category)}
                        </div>
                        <span className="academic-badge font-mono">
                          Lecture {note.lectureNumber}
                        </span>
                      </div>
                      <h3 className="text-base font-bold mb-1.5 line-clamp-1 text-[var(--text-primary)]">
                        {note.lectureTitle}
                      </h3>
                      <p className="text-xs text-[var(--text-secondary)] line-clamp-3 mb-4 leading-relaxed">
                        {note.description || 'Supplementary study material.'}
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
                          <ExternalLink size={14} /> Open External Resource
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
      </main>
    </div>
  );
};

export default StudentNotesPage;
