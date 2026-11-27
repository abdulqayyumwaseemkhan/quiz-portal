import React, { useState, useEffect, useMemo, useCallback } from 'react';
import API from '../api';
import { Clock, BookOpen, ChevronRight, Search, Calendar, AlertCircle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import StudentNavbar from '../components/StudentNavbar';
import { useLiveRefresh } from '../utils/liveSync';
import { clientCache } from '../utils/clientCache';

const QuizListPage = () => {
  const student = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('studentInfo'));
    } catch {
      return null;
    }
  }, []);
  const navigate = useNavigate();

  const cacheKey = student?.studentId ? `student_quizzes_${student.studentId}` : null;
  const cached = cacheKey ? clientCache.get(cacheKey) : null;

  const [quizzes, setQuizzes] = useState(cached || []);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(!cached);

  useEffect(() => {
    if (!student) {
      navigate('/', { replace: true });
    }
  }, [student, navigate]);

  const fetchQuizzes = useCallback(
    async (silent = false) => {
      const hasCache = cacheKey && clientCache.has(cacheKey);
      if (!silent && !hasCache) setLoading(true);
      try {
        const { data } = await API.get(`/student/quizzes/${student.studentId}`);
        setQuizzes(data);
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
    if (student) fetchQuizzes(cacheKey && clientCache.has(cacheKey) ? true : false);
  }, [student, fetchQuizzes, cacheKey]);

  useLiveRefresh(fetchQuizzes, 12000, [
    'QUIZ_PUBLISHED',
    'QUIZ_SUBMITTED',
    'QUIZ_RESULT_DELETED',
  ]);

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
    <div className="student-portal min-h-screen pb-16">
      <StudentNavbar student={student} />
      <main className="lg:pl-60">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8">
          <header className="mb-6">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)]">
              Quizzes &amp; Examinations
            </h1>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              Scheduled assessments for {student?.campus} ({student?.batch})
            </p>
          </header>

          <div className="relative mb-6">
            <Search
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]"
              size={16}
            />
            <input
              type="text"
              placeholder="Search assessments by title..."
              className="input-field pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[1, 2, 3].map((n) => (
                <div
                  key={n}
                  className="h-56 rounded-md bg-[var(--bg-surface)] border border-[var(--border)] animate-pulse"
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredQuizzes.map((quiz) => {
                const status = isQuizAvailable(quiz);
                const isLocked = status !== 'available';
                const info = quiz.attemptInfo || {};

                return (
                  <div key={quiz._id} className="card flex flex-col justify-between p-5">
                    <div>
                      <div className="flex items-start justify-between mb-3.5">
                        <div className="flex items-center gap-2">
                          <div className="p-2 rounded bg-[var(--accent-subtle)] text-[var(--accent)]">
                            <BookOpen size={17} />
                          </div>
                          <span className="academic-badge uppercase tracking-wider">
                            {quiz.quizType === 'class_test'
                              ? 'Class Test'
                              : quiz.quizType === 'mid_term'
                              ? 'Mid Term'
                              : quiz.quizType === 'final_term'
                              ? 'Final Exam'
                              : quiz.quizType === 'assessment'
                              ? 'Practical'
                              : 'Quiz'}
                          </span>
                        </div>
                        <div className="text-right">
                          <div className="inline-flex items-center gap-1 text-xs font-medium text-[var(--text-secondary)]">
                            <Clock size={13} /> {quiz.duration} min
                          </div>
                          <p className="text-xs font-bold text-[var(--text-primary)] mt-0.5">
                            {quiz.totalMarks} Marks
                          </p>
                        </div>
                      </div>

                      <h3 className="text-base font-bold mb-1.5 line-clamp-1 text-[var(--text-primary)]">
                        {quiz.title}
                      </h3>
                      <p className="text-xs text-[var(--text-secondary)] line-clamp-2 mb-4 leading-relaxed">
                        {quiz.description || 'Complete all questions within the allotted duration.'}
                      </p>
                    </div>

                    <div className="pt-3.5 border-t border-[var(--border)] space-y-2.5">
                      {status === 'upcoming' && (
                        <div className="academic-badge academic-badge-warning w-full justify-start py-2 px-2.5">
                          <Calendar size={13} /> Opens: {new Date(quiz.startDate).toLocaleString()}
                        </div>
                      )}
                      {status === 'expired' && (
                        <div className="academic-badge academic-badge-danger w-full justify-start py-2 px-2.5">
                          <AlertCircle size={13} /> Closed:{' '}
                          {new Date(quiz.endDate).toLocaleString()}
                        </div>
                      )}

                      {info.hasCompletedAttempt && (
                        <div className="flex items-center justify-between text-xs">
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
                            <span className="text-[var(--status-warning)] font-medium">
                              Result Pending
                            </span>
                          )}
                        </div>
                      )}

                      {info.inProgress && !isLocked ? (
                        <Link
                          to={`/quiz/attempt/${quiz._id}`}
                          className="btn-primary w-full py-2 flex items-center justify-center gap-1.5 text-xs font-semibold"
                        >
                          Resume Assessment <ChevronRight size={15} />
                        </Link>
                      ) : info.attempted ? (
                        quiz.resultsReleased && info.resultId ? (
                          <Link
                            to={`/result/${info.resultId}`}
                            className="btn-secondary w-full py-2 flex items-center justify-center gap-1.5 text-xs font-semibold"
                          >
                            View Result <ChevronRight size={15} />
                          </Link>
                        ) : (
                          <button
                            disabled
                            className="w-full py-2 rounded-md bg-[var(--bg-muted)] border border-[var(--border)] text-[var(--text-secondary)] text-xs font-medium cursor-not-allowed"
                          >
                            Submitted (Pending Release)
                          </button>
                        )
                      ) : isLocked ? (
                        <button
                          disabled
                          className="w-full py-2 rounded-md bg-[var(--bg-muted)] border border-[var(--border)] text-[var(--text-secondary)] text-xs font-medium cursor-not-allowed"
                        >
                          {status === 'upcoming' ? 'Not Open Yet' : 'Assessment Closed'}
                        </button>
                      ) : (
                        <Link
                          to={`/quiz/attempt/${quiz._id}`}
                          className="btn-primary w-full py-2 flex items-center justify-center gap-1.5 text-xs font-semibold"
                        >
                          {info.attemptsUsed > 0
                            ? `Retake (Attempt ${info.attemptsUsed + 1}/${info.attemptsAllowed})`
                            : 'Start Assessment'}{' '}
                          <ChevronRight size={15} />
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {filteredQuizzes.length === 0 && !loading && (
            <div className="card p-12 text-center">
              <BookOpen className="mx-auto text-[var(--text-secondary)] mb-3" size={34} />
              <p className="font-semibold text-base text-[var(--text-primary)]">
                No assessments available
              </p>
              <p className="text-xs text-[var(--text-secondary)] mt-1">
                Scheduled quizzes and exams for your batch will be listed here.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default QuizListPage;
