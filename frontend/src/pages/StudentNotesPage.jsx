import React, { useState, useEffect } from 'react';
import API from '../api';
import { FileText, FileArchive, FileImage, Download, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import StudentNavbar from '../components/StudentNavbar';

const getFileIcon = (fileType = '') => {
  const type = fileType.toLowerCase();
  if (type === 'zip') return <FileArchive size={20} />;
  if (['png', 'jpg', 'jpeg'].includes(type)) return <FileImage size={20} />;
  return <FileText size={20} />;
};

const StudentNotesPage = () => {
  const [notes, setNotes] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const student = React.useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('studentInfo'));
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    if (!student) {
      navigate('/', { replace: true });
    }
  }, [student, navigate]);

  useEffect(() => {
    const fetchNotes = async () => {
      try {
        const { data } = await API.get(`/student/notes/${student.studentId}`);
        setNotes(data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    if (student) fetchNotes();
  }, [student]);

  const filteredNotes = notes.filter((n) =>
    n.lectureTitle.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] pb-14">
      <StudentNavbar student={student} />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Lecture Notes & Resources</h1>
            <p className="text-sm text-[var(--text-muted)] mt-1">
              Download slides, code archives, and reference documents
            </p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
              size={16}
            />
            <input
              type="text"
              placeholder="Search lecture notes..."
              className="input-field pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="h-44 rounded-xl bg-[var(--bg-surface)] border border-[var(--border)] animate-pulse"
              />
            ))}
          </div>
        ) : filteredNotes.length === 0 ? (
          <div className="text-center py-16 bg-[var(--bg-surface)] rounded-xl border border-[var(--border)]">
            <FileText className="mx-auto text-[var(--text-muted)] mb-3" size={32} />
            <p className="font-semibold text-base">No lecture notes found</p>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              Course notes published for your batch will appear here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredNotes.map((note) => (
              <div
                key={note._id}
                className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl p-5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between mb-3">
                    <div className="p-2.5 rounded-lg bg-[var(--accent-subtle)] text-[var(--accent)]">
                      {getFileIcon(note.fileType)}
                    </div>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[var(--bg-muted)] text-[var(--text-secondary)]">
                      Lecture {note.lectureNumber}
                    </span>
                  </div>
                  <h3 className="text-base font-bold mb-1">{note.lectureTitle}</h3>
                  <p className="text-xs text-[var(--text-muted)] line-clamp-3 mb-4">
                    {note.description || 'No description provided.'}
                  </p>
                </div>

                <div className="pt-3 border-t border-[var(--border)]">
                  <a
                    href={note.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-primary w-full flex items-center justify-center gap-2 text-xs"
                  >
                    <Download size={15} /> Download ({note.fileType?.toUpperCase() || 'FILE'})
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentNotesPage;
