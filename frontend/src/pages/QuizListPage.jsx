import React, { useState, useEffect, useMemo, useCallback } from 'react';
import API from '../api';
import { Clock, BookOpen, ChevronRight, Search, Calendar, AlertCircle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import StudentNavbar from '../components/StudentNavbar';
import { useLiveRefresh } from '../utils/liveSync';

const QuizListPage = () => {
  const [quizzes, setQuizzes] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  const student = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('studentInfo'));
    } catch {
      return null;
    }
  }, []);
  const navigate = useNavigate();

  useEffect(() => {
    if (!student) {
      navigate('/', { replace: true });
    }
  }, [student, navigate]);

  const fetchQuizzes = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const { data } = await API.get(`/student/quizzes/${student.studentId}`);
      setQuizzes(data);
    } catch (error) {
      console.error(error);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [student]);

  useEffect(() => {
    if (student) fetchQuizzes(false);
  }, [student, fetchQuizzes]);

  // Silently re-sync quizzes when admin publishes a quiz or user refocused window
  useLiveRefresh(fetchQuizzes, 12000, ['QUIZ_PUBLISHED', 'QUIZ_SUBMITTED']);

  const filteredQuizzes = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return quizzes;
    return quizzes.filter((item) => item.title.toLowerCase().includes(q));
  }, [quizzes, searchTerm]);

  const isQuizAvailable = (quiz) => {
    const now = new Date();
    if (quiz.startDate && new Date(quiz.startDate) > now) return 'upcoming';
    if (quiz.endDate && new Date(quiz.endDate) < now) return 'expired';
    return 'available';
  };

  return (
    <div className="min-h-screen pb-20 md:pb-12">
      <StudentNavbar student={student} />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8">
        <header className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Quizzes</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Attempt active quizzes for {student?.campus} ({student?.batch})
          </p>
        </header>

        <div className="relative mb-6">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={18} />
          <input
            type="text"
            placeholder="Search quizzes..."
            className="input-field pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-64 rounded-2xl bg-[var(--bg-muted)] animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredQuizzes.map((quiz) => {
              const status = isQuizAvailable(quiz);
              const isLocked = status !== 'available';
              const info = quiz.attemptInfo || {};

              return (
                <div
                  key={quiz._id}
                  className="card flex flex-col justify-between p-6"
                >
                  <div>
                    <div className="flex items-start justify-between mb-4">
                      <div className="p-2.5 rounded-xl bg-[var(--accent-subtle)] text-[var(--accent)]">
                        <BookOpen size={20} />
                      </div>
                      <div className="text-right">
                        <div className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--text-secondary)]">
                          <Clock size={14} /> {quiz.duration} min
                        </div>
                        <p className="text-xs font-bold text-[var(--text-primary)] mt-0.5">
                          {quiz.totalMarks} Marks
                        </p>
                      </div>
                    </div>

                    <h3 className="text-lg font-bold mb-1.5 line-clamp-1">{quiz.title}</h3>
                    <p className="text-xs text-[var(--text-secondary)] line-clamp-2 mb-4 leading-relaxed">
                      {quiz.description}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-[var(--border)] space-y-2.5">
                    {status === 'upcoming' && (
                      <div className="flex items-center gap-2 text-amber-600 bg-amber-500/10 p-2.5 rounded-lg text-xs font-medium">
                        <Calendar size={14} /> Starts: {new Date(quiz.startDate).toLocaleString()}
                      </div>
                    )}
                    {status === 'expired' && (
                      <div className="flex items-center gap-2 text-rose-600 bg-rose-500/10 p-2.5 rounded-lg text-xs font-medium">
                        <AlertCircle size={14} /> Closed: {new Date(quiz.endDate).toLocaleString()}
                      </div>
                    )}

                    {info.hasCompletedAttempt && (
                      <div className="flex items-center justify-between text-xs px-1">
                        <span className="text-[var(--text-secondary)]">
                          Attempts: {info.attemptsUsed} / {info.attemptsAllowed || 1}
                        </span>
                        {quiz.resultsReleased && info.resultId ? (
                          <Link
                            to={`/result/${info.resultId}`}
                            className="font-semibold text-[var(--accent)] hover:underline"
                          >
                            View Result ({info.latestPercentage}%)
                          </Link>
                        ) : (
                          <span className="text-amber-600 font-medium">Result Pending</span>
                        )}
                      </div>
                    )}

                    {info.inProgress && !isLocked ? (
                      <Link
                        to={`/quiz/attempt/${quiz._id}`}
                        className="btn-primary w-full py-2.5 flex items-center justify-center gap-1.5 text-xs font-semibold"
                      >
                        Resume In-Progress Quiz <ChevronRight size={16} />
                      </Link>
                    ) : info.attempted ? (
                      quiz.resultsReleased && info.resultId ? (
                        <Link
                          to={`/result/${info.resultId}`}
                          className="btn-secondary w-full py-2.5 flex items-center justify-center gap-1.5 text-xs font-semibold"
                        >
                          View Result <ChevronRight size={16} />
                        </Link>
                      ) : (
                        <button
                          disabled
                          className="w-full py-2.5 rounded-xl bg-[var(--bg-muted)] text-[var(--text-muted)] text-xs font-semibold cursor-not-allowed"
                        >
                          Attempt Submitted (Pending Release)
                        </button>
                      )
                    ) : isLocked ? (
                      <button
                        disabled
                        className="w-full py-2.5 rounded-xl bg-[var(--bg-muted)] text-[var(--text-muted)] text-xs font-semibold cursor-not-allowed"
                      >
                        {status === 'upcoming' ? 'Not Started Yet' : 'Quiz Closed'}
                      </button>
                    ) : (
                      <Link
                        to={`/quiz/attempt/${quiz._id}`}
                        className="btn-primary w-full py-2.5 flex items-center justify-center gap-1.5 text-xs font-semibold"
                      >
                        {info.attemptsUsed > 0
                          ? `Retake Quiz (Attempt ${info.attemptsUsed + 1} of ${info.attemptsAllowed})`
                          : 'Start Quiz'}{' '}
                        <ChevronRight size={16} />
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {filteredQuizzes.length === 0 && !loading && (
          <div className="card p-14 text-center">
            <BookOpen className="mx-auto text-[var(--text-muted)] mb-3" size={40} />
            <p className="font-semibold text-base">No quizzes available</p>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              When your instructor publishes a quiz for your batch, it will appear here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuizListPage;
