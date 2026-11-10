import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../api';
import { Clock, AlertCircle, CheckCircle2, Cloud } from 'lucide-react';
import toast from 'react-hot-toast';

const QuizAttemptPage = () => {
  const { quizId } = useParams();
  const navigate = useNavigate();

  const student = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('studentInfo'));
    } catch {
      return null;
    }
  }, []);

  const storageKey = useMemo(
    () => (student ? `quiz_draft_${quizId}_${student.studentId}` : null),
    [quizId, student]
  );

  const [quiz, setQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [attemptInfo, setAttemptInfo] = useState(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [userAnswers, setUserAnswers] = useState([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [syncState, setSyncState] = useState('saved'); // 'saved' | 'saving' | 'offline'

  const deadlineMsRef = useRef(null);
  const dirtyRef = useRef(false);
  const latestAnswersRef = useRef([]);

  useEffect(() => {
    latestAnswersRef.current = userAnswers;
  }, [userAnswers]);

  // Idempotent submit function
  const submitQuiz = useCallback(
    async (finalAnswers = latestAnswersRef.current) => {
      if (submitting || !student) return;
      setSubmitting(true);
      try {
        const { data } = await API.post('/student/submit', {
          studentName: student.fullName,
          studentId: student.studentId,
          quizId,
          attemptId: attemptInfo?._id,
          userAnswers: finalAnswers,
        });
        if (storageKey) localStorage.removeItem(storageKey);
        toast.success('Quiz submitted!');
        navigate(`/result/${data._id}`, { replace: true });
      } catch (error) {
        toast.error(error.response?.data?.message || 'Error submitting quiz');
        navigate('/quizzes', { replace: true });
      } finally {
        setSubmitting(false);
      }
    },
    [quizId, student, attemptInfo, storageKey, navigate, submitting]
  );

  // Fetch quiz + questions + server-side timer in ONE request
  useEffect(() => {
    const startOrResume = async () => {
      if (!student) {
        navigate('/', { replace: true });
        return;
      }
      try {
        const { data } = await API.get(`/student/quiz/${quizId}/${student.studentId}`);
        setQuiz(data.quiz);
        setQuestions(data.questions || []);
        setAttemptInfo(data.attempt || null);

        // Merge server draftAnswers with localStorage draftAnswers
        const serverDraft = Array.isArray(data.attempt?.draftAnswers) ? data.attempt.draftAnswers : [];
        let localDraft = [];
        if (storageKey) {
          try {
            const raw = localStorage.getItem(storageKey);
            if (raw) localDraft = JSON.parse(raw);
          } catch {
            localDraft = [];
          }
        }

        const mergedMap = new Map();
        serverDraft.forEach((d) => {
          if (d?.questionId) mergedMap.set(d.questionId, d.answer);
        });
        localDraft.forEach((d) => {
          if (d?.questionId) mergedMap.set(d.questionId, d.answer);
        });

        const merged = Array.from(mergedMap.entries()).map(([questionId, answer]) => ({
          questionId,
          answer,
        }));
        setUserAnswers(merged);
        latestAnswersRef.current = merged;

        const remainingSec =
          data.attempt?.remainingSeconds ?? (Number(data.quiz?.duration) || 30) * 60;
        deadlineMsRef.current = Date.now() + remainingSec * 1000;
        setTimeLeft(remainingSec);
        setLoading(false);
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to start quiz');
        navigate('/quizzes', { replace: true });
      }
    };
    startOrResume();
  }, [quizId, navigate, student, storageKey]);

  // Server-anchored wall-clock countdown timer (immune to mobile tab throttling)
  useEffect(() => {
    if (loading || submitting || !deadlineMsRef.current) return;

    const timer = setInterval(() => {
      const remaining = Math.max(0, Math.round((deadlineMsRef.current - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining <= 0) {
        clearInterval(timer);
        submitQuiz(latestAnswersRef.current);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [loading, submitting, submitQuiz]);

  // Periodic debounced autosave to backend every 6 seconds when dirty
  useEffect(() => {
    if (loading || submitting || !student) return;

    const interval = setInterval(async () => {
      if (!dirtyRef.current) return;
      dirtyRef.current = false;
      setSyncState('saving');
      try {
        await API.put(`/student/quiz/${quizId}/autosave`, {
          studentId: student.studentId,
          attemptId: attemptInfo?._id,
          userAnswers: latestAnswersRef.current,
        });
        setSyncState('saved');
      } catch {
        dirtyRef.current = true;
        setSyncState('offline');
      }
    }, 6000);

    return () => clearInterval(interval);
  }, [loading, submitting, quizId, student, attemptInfo]);

  // Anti-cheat & accidental navigation protection
  const warningsRef = useRef(0);
  const submitQuizRef = useRef(submitQuiz);
  const stateRef = useRef({ submitting, timeLeft });

  useEffect(() => {
    submitQuizRef.current = submitQuiz;
    stateRef.current = { submitting, timeLeft };
  }, [submitQuiz, submitting, timeLeft]);

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    const handleVisibilityChange = () => {
      const { submitting: isSub, timeLeft: left } = stateRef.current;
      if (document.hidden && !isSub && left > 0) {
        warningsRef.current += 1;
        if (warningsRef.current === 1) {
          toast.error('Warning: Do not switch tabs during an active quiz attempt.', { duration: 5000 });
        } else if (warningsRef.current >= 3) {
          toast.error('Multiple tab switches detected. Submitting quiz...', { duration: 4000 });
          if (submitQuizRef.current) submitQuizRef.current();
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const handleAnswerSelect = (answer) => {
    const currentQ = questions[currentIdx];
    if (!currentQ) return;

    setUserAnswers((prev) => {
      const updated = [...prev];
      const idx = updated.findIndex((ua) => ua.questionId === currentQ._id);
      if (idx > -1) {
        updated[idx] = { questionId: currentQ._id, answer };
      } else {
        updated.push({ questionId: currentQ._id, answer });
      }
      if (storageKey) {
        try {
          localStorage.setItem(storageKey, JSON.stringify(updated));
        } catch {
          // ignore quota errors
        }
      }
      dirtyRef.current = true;
      return updated;
    });
  };

  const getFormatTime = (seconds) => {
    if (!seconds || seconds < 0) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-2xl space-y-4">
          <div className="h-16 rounded-2xl bg-[var(--bg-muted)] animate-pulse" />
          <div className="h-80 rounded-2xl bg-[var(--bg-muted)] animate-pulse" />
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentIdx];
  const selectedAnswer =
    userAnswers.find((ua) => ua.questionId === currentQuestion?._id)?.answer || '';
  const answeredCount = userAnswers.filter((ua) => String(ua.answer || '').trim() !== '').length;

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-[var(--bg-surface)] px-4 sm:px-8 py-3.5 sticky top-0 z-50 flex flex-wrap justify-between items-center gap-3 border-b border-[var(--border)]">
        <div>
          <h2 className="text-base sm:text-lg font-bold truncate max-w-xs sm:max-w-md">
            {quiz?.title}
          </h2>
          <p className="text-xs text-[var(--text-secondary)]">
            Question {currentIdx + 1} of {questions.length} • Answered {answeredCount}/{questions.length}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
            <Cloud size={14} />
            {syncState === 'saving'
              ? 'Saving...'
              : syncState === 'offline'
              ? 'Saved locally'
              : 'Progress saved'}
          </span>

          <div
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-mono text-base sm:text-lg font-bold ${
              timeLeft < 60
                ? 'bg-rose-500/15 text-rose-600 animate-pulse'
                : 'bg-[var(--bg-muted)] text-[var(--text-primary)]'
            }`}
          >
            <Clock size={18} />
            <span>{getFormatTime(timeLeft)}</span>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-3xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {/* Question Quick Navigator */}
        <div className="flex flex-wrap gap-1.5 mb-5">
          {questions.map((q, idx) => {
            const isAnswered = userAnswers.some(
              (ua) => ua.questionId === q._id && String(ua.answer || '').trim() !== ''
            );
            const isCurrent = idx === currentIdx;
            return (
              <button
                key={q._id}
                type="button"
                onClick={() => setCurrentIdx(idx)}
                className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                  isCurrent
                    ? 'bg-[var(--accent)] text-white'
                    : isAnswered
                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30'
                    : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border border-[var(--border)]'
                }`}
              >
                {idx + 1}
              </button>
            );
          })}
        </div>

        <div className="card p-6 sm:p-8">
          <div className="mb-6">
            <span className="inline-block px-2.5 py-1 rounded-md bg-[var(--bg-muted)] text-[var(--text-secondary)] text-xs font-semibold mb-3">
              {currentQuestion?.type === 'mcq' ? 'Multiple Choice' : 'Short Answer'} •{' '}
              {currentQuestion?.marks} {currentQuestion?.marks === 1 ? 'Mark' : 'Marks'}
            </span>
            <h3 className="text-lg sm:text-xl font-bold leading-snug">
              {currentQuestion?.questionText}
            </h3>
          </div>

          {currentQuestion?.type === 'mcq' ? (
            <div className="space-y-3">
              {(currentQuestion.options || []).map((opt, i) => {
                const isSelected = selectedAnswer === opt;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleAnswerSelect(opt)}
                    className={`w-full text-left p-4 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'border-[var(--accent)] bg-[var(--accent-subtle)] text-[var(--text-primary)] font-semibold'
                        : 'border-[var(--border)] bg-[var(--bg-surface)] hover:bg-[var(--bg-muted)]'
                    }`}
                  >
                    <span className="text-sm sm:text-base">{opt}</span>
                    <div
                      className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                        isSelected
                          ? 'bg-[var(--accent)] border-[var(--accent)] text-white'
                          : 'border-[var(--border)]'
                      }`}
                    >
                      {isSelected && <CheckCircle2 size={13} />}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <input
              type="text"
              placeholder="Type your answer..."
              className="input-field py-3.5 text-base"
              value={selectedAnswer}
              onChange={(e) => handleAnswerSelect(e.target.value)}
            />
          )}
        </div>

        <div className="mt-6 flex justify-between items-center gap-4">
          <button
            type="button"
            disabled={currentIdx === 0}
            onClick={() => setCurrentIdx((prev) => prev - 1)}
            className="btn-secondary py-2.5 px-5 text-xs sm:text-sm disabled:opacity-40"
          >
            Previous
          </button>

          {currentIdx === questions.length - 1 ? (
            <button
              type="button"
              onClick={() => submitQuiz()}
              disabled={submitting}
              className="btn-primary py-2.5 px-6 text-xs sm:text-sm"
            >
              {submitting ? 'Submitting...' : 'Submit Quiz'}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setCurrentIdx((prev) => prev + 1)}
              className="btn-primary py-2.5 px-6 text-xs sm:text-sm"
            >
              Next Question
            </button>
          )}
        </div>
      </main>

      <footer className="p-4 text-center">
        <div className="inline-flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
          <AlertCircle size={13} /> Answers are automatically saved locally and synced to the server.
        </div>
      </footer>
    </div>
  );
};

export default QuizAttemptPage;
