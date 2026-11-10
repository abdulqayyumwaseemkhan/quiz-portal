import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import API from '../api';
import StudentNavbar from '../components/StudentNavbar';
import {
  Play,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Calendar,
  Layers,
  Search,
  Video,
} from 'lucide-react';
import toast from 'react-hot-toast';

const StudentLecturesPage = () => {
  const [lectures, setLectures] = useState([]);
  const [activeLectureId, setActiveLectureId] = useState(null);
  const [playerReady, setPlayerReady] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedModule, setSelectedModule] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const student = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('studentInfo'));
    } catch {
      return null;
    }
  }, []);

  const lastWatchedKey = useMemo(
    () => (student ? `last_watched_lecture_${student.studentId}` : null),
    [student]
  );

  useEffect(() => {
    if (!student) {
      navigate('/', { replace: true });
    }
  }, [student, navigate]);

  useEffect(() => {
    const fetchLectures = async () => {
      try {
        const { data } = await API.get(`/student/lectures/${student.studentId}`);
        setLectures(data);

        if (data.length > 0) {
          const fromQuery = searchParams.get('id');
          const fromStorage = lastWatchedKey ? localStorage.getItem(lastWatchedKey) : null;
          const initial =
            data.find((l) => l._id === fromQuery) ||
            data.find((l) => l._id === fromStorage) ||
            data[0];
          setActiveLectureId(initial._id);
          setPlayerReady(true);
        }
      } catch {
        toast.error('Failed to load lectures');
      } finally {
        setLoading(false);
      }
    };
    if (student) fetchLectures();
  }, [student, lastWatchedKey, searchParams]);

  const selectLecture = (lectureId) => {
    setActiveLectureId(lectureId);
    setPlayerReady(true);
    if (lastWatchedKey) {
      localStorage.setItem(lastWatchedKey, lectureId);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleToggleWatched = async (lecture) => {
    try {
      const { data } = await API.post(`/student/lectures/${lecture._id}/watched`, {
        studentId: student.studentId,
      });
      setLectures((prev) =>
        prev.map((l) => (l._id === lecture._id ? { ...l, isWatched: data.isWatched } : l))
      );
      toast.success(data.isWatched ? 'Marked as watched' : 'Marked as unwatched');
    } catch {
      toast.error('Could not update watched status');
    }
  };

  const modules = useMemo(
    () => [...new Set(lectures.map((l) => l.courseModule || 'General'))],
    [lectures]
  );

  const filteredLectures = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return lectures.filter((l) => {
      const matchQuery =
        !q ||
        l.title.toLowerCase().includes(q) ||
        (l.description || '').toLowerCase().includes(q);
      const matchModule = selectedModule ? (l.courseModule || 'General') === selectedModule : true;
      return matchQuery && matchModule;
    });
  }, [lectures, searchTerm, selectedModule]);

  const activeIndex = useMemo(
    () => lectures.findIndex((l) => l._id === activeLectureId),
    [lectures, activeLectureId]
  );
  const activeLecture = activeIndex >= 0 ? lectures[activeIndex] : null;
  const prevLecture = activeIndex > 0 ? lectures[activeIndex - 1] : null;
  const nextLecture =
    activeIndex >= 0 && activeIndex < lectures.length - 1 ? lectures[activeIndex + 1] : null;

  const watchedCount = useMemo(
    () => lectures.filter((l) => l.isWatched).length,
    [lectures]
  );
  const progressPercent = lectures.length
    ? Math.round((watchedCount / lectures.length) * 100)
    : 0;

  return (
    <div className="min-h-screen pb-20 md:pb-12">
      <StudentNavbar student={student} />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8 space-y-6">
        {/* Header & Course Progress */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Video Lectures</h1>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              Watch course recordings directly in the portal and track your completion
            </p>
          </div>

          {lectures.length > 0 && (
            <div className="card px-4 py-3 flex items-center gap-4 min-w-[220px]">
              <div className="flex-1">
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span>Course Progress</span>
                  <span>
                    {watchedCount}/{lectures.length} ({progressPercent}%)
                  </span>
                </div>
                <div className="w-full h-2 bg-[var(--bg-muted)] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[var(--accent)] transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Custom Branded Media Player Container */}
        {activeLecture && (
          <div className="card p-0 overflow-hidden border border-[var(--border)]">
            {/* Top Player Bar */}
            <div className="px-4 sm:px-6 py-3 bg-[var(--bg-muted)] border-b border-[var(--border)] flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <span className="px-2.5 py-0.5 rounded-md bg-[var(--accent)] text-white text-xs font-bold">
                  Lecture {activeLecture.order}
                </span>
                <span className="text-xs font-medium text-[var(--text-secondary)]">
                  {activeLecture.courseModule || 'General'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                <Calendar size={13} />
                <span>
                  {activeLecture.lectureDate
                    ? new Date(activeLecture.lectureDate).toLocaleDateString()
                    : ''}
                </span>
              </div>
            </div>

            {/* Responsive 16:9 Embedded Player (Never redirects away from portal) */}
            <div className="relative w-full aspect-video bg-slate-950">
              {playerReady ? (
                <iframe
                  key={activeLecture._id}
                  src={activeLecture.embedUrl}
                  title={activeLecture.title}
                  loading="lazy"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                  allowFullScreen
                  referrerPolicy="strict-origin-when-cross-origin"
                  className="w-full h-full border-0"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setPlayerReady(true)}
                  className="w-full h-full flex flex-col items-center justify-center text-white gap-3"
                >
                  <div className="w-16 h-16 rounded-full bg-[var(--accent)] flex items-center justify-center">
                    <Play size={28} />
                  </div>
                  <span className="text-sm font-semibold">Click to Load Video Player</span>
                </button>
              )}
            </div>

            {/* Lecture Info, Resources, Mark Watched & Prev/Next Controls */}
            <div className="p-5 sm:p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg sm:text-xl font-bold">{activeLecture.title}</h2>
                  {activeLecture.description && (
                    <p className="text-sm text-[var(--text-secondary)] mt-1.5 whitespace-pre-line leading-relaxed">
                      {activeLecture.description}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {activeLecture.resourceUrl && (
                    <a
                      href={activeLecture.resourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-secondary py-2 px-3.5 text-xs flex items-center gap-1.5"
                    >
                      <ExternalLink size={14} /> Lecture Notes / Code
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => handleToggleWatched(activeLecture)}
                    className={`py-2 px-4 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                      activeLecture.isWatched
                        ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30'
                        : 'btn-primary'
                    }`}
                  >
                    <CheckCircle2 size={15} />
                    {activeLecture.isWatched ? 'Watched' : 'Mark as Watched'}
                  </button>
                </div>
              </div>

              <div className="pt-4 border-t border-[var(--border)] flex items-center justify-between gap-3">
                <button
                  type="button"
                  disabled={!prevLecture}
                  onClick={() => prevLecture && selectLecture(prevLecture._id)}
                  className="btn-secondary py-2 px-4 text-xs flex items-center gap-1.5 disabled:opacity-40"
                >
                  <ChevronLeft size={15} /> Previous Lecture
                </button>

                <button
                  type="button"
                  disabled={!nextLecture}
                  onClick={() => nextLecture && selectLecture(nextLecture._id)}
                  className="btn-secondary py-2 px-4 text-xs flex items-center gap-1.5 disabled:opacity-40"
                >
                  Next Lecture <ChevronRight size={15} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={16} />
            <input
              type="text"
              placeholder="Search lectures by title or topic..."
              className="input-field pl-9 py-2.5 text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          {modules.length > 1 && (
            <select
              className="input-field sm:w-64 py-2.5 text-sm"
              value={selectedModule}
              onChange={(e) => setSelectedModule(e.target.value)}
            >
              <option value="">All Modules</option>
              {modules.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Lectures List / Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-36 rounded-2xl bg-[var(--bg-muted)] animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredLectures.map((lec) => {
              const isCurrent = lec._id === activeLectureId;
              return (
                <button
                  key={lec._id}
                  type="button"
                  onClick={() => selectLecture(lec._id)}
                  className={`card p-5 text-left transition-all flex flex-col justify-between ${
                    isCurrent
                      ? 'ring-2 ring-[var(--accent)] bg-[var(--accent-subtle)]/40'
                      : 'hover:border-[var(--accent)]'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2.5">
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded bg-[var(--bg-muted)] text-[var(--text-primary)]">
                        Lecture {lec.order}
                      </span>
                      {lec.isWatched ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
                          <CheckCircle2 size={14} /> Watched
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-[var(--text-muted)]">
                          <Play size={13} /> Watch
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold text-base line-clamp-1 mb-1">{lec.title}</h3>
                    <p className="text-xs text-[var(--text-secondary)] line-clamp-2">
                      {lec.description || 'Click to open in player'}
                    </p>
                  </div>

                  <div className="pt-3 mt-3 border-t border-[var(--border)] flex items-center justify-between text-[11px] text-[var(--text-muted)]">
                    <span className="flex items-center gap-1 truncate">
                      <Layers size={12} /> {lec.courseModule || 'General'}
                    </span>
                    <span>
                      {lec.lectureDate ? new Date(lec.lectureDate).toLocaleDateString() : ''}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {filteredLectures.length === 0 && !loading && (
          <div className="card p-14 text-center">
            <Video className="mx-auto text-[var(--text-muted)] mb-3" size={40} />
            <p className="font-semibold text-base">No lectures found</p>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              Recorded class sessions will appear here once published by your instructor.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentLecturesPage;
