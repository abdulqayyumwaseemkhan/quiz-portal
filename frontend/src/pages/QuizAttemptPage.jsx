import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../api';
import {
  Clock,
  AlertCircle,
  CheckCircle2,
  Cloud,
  Code2,
  Play,
  RotateCcw,
  WifiOff,
  AlertTriangle,
  X,
  FileQuestion,
} from 'lucide-react';
import toast from 'react-hot-toast';

function buildPreviewDocument(code, lang) {
  if (lang === 'react') {
    return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
    <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>body { font-family: sans-serif; padding: 12px; margin: 0; background: #fff; color: #111; }</style>
  </head>
  <body>
    <div id="root"></div>
    <script type="text/babel">
      try {
        ${code || ''}
        if (typeof App !== 'undefined') {
          ReactDOM.createRoot(document.getElementById('root')).render(<App />);
        }
      } catch(e) {
        document.getElementById('root').innerHTML = '<div style="color:red;font-family:monospace;padding:10px;">Runtime Error: ' + e.message + '</div>';
      }
    </script>
  </body>
</html>`;
  }
  if (lang === 'javascript') {
    return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>body { font-family: monospace; padding: 12px; margin: 0; background: #0f172a; color: #4ade80; white-space: pre-wrap; font-size: 13px; line-height: 1.5; }</style>
  </head>
  <body>
    <div id="log"></div>
    <script>
      const logEl = document.getElementById('log');
      const log = (...args) => { logEl.innerText += args.join(' ') + '\\n'; };
      console.log = log;
      console.error = (...args) => { logEl.innerHTML += '<span style="color:#f87171;">' + args.join(' ') + '</span>\\n'; };
      try {
        ${code || ''}
      } catch(e) {
        console.error('Error: ' + e.message);
      }
    </script>
  </body>
</html>`;
  }
  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <style>body { font-family: sans-serif; margin: 0; padding: 12px; box-sizing: border-box; }</style>
  </head>
  <body>
    ${code || ''}
  </body>
</html>`;
}

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

  // Offline, Coding & Confirmation Modal states
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [codeTab, setCodeTab] = useState('code'); // 'code' | 'preview'

  const deadlineMsRef = useRef(null);
  const dirtyRef = useRef(false);
  const latestAnswersRef = useRef([]);
  const timeLeftRef = useRef(0);

  useEffect(() => {
    timeLeftRef.current = timeLeft;
  }, [timeLeft]);

  useEffect(() => {
    latestAnswersRef.current = userAnswers;
  }, [userAnswers]);

  // Online / Offline fair pause & resume listeners
  useEffect(() => {
    const handleOffline = () => {
      setIsOffline(true);
      setSyncState('offline');
      toast.error('Network disconnected. Quiz paused and your work is safely saved offline.', {
        duration: 6000,
      });
      if (student && attemptInfo?._id) {
        API.put(`/student/quiz/${quizId}/pause`, {
          studentId: student.studentId,
          attemptId: attemptInfo._id,
        }).catch(() => {});
      }
    };

    const handleOnline = () => {
      setIsOffline(false);
      setSyncState('saving');
      toast.success('Network reconnected! Resuming quiz timer.', { duration: 4000 });
      deadlineMsRef.current = Date.now() + timeLeftRef.current * 1000;
      if (student) {
        API.put(`/student/quiz/${quizId}/autosave`, {
          studentId: student.studentId,
          attemptId: attemptInfo?._id,
          userAnswers: latestAnswersRef.current,
        })
          .then(() => setSyncState('saved'))
          .catch(() => {});
      }
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, [quizId, student, attemptInfo]);

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
    if (loading || submitting || isOffline || !deadlineMsRef.current) return;

    const timer = setInterval(() => {
      const remaining = Math.max(0, Math.round((deadlineMsRef.current - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining <= 0) {
        clearInterval(timer);
        submitQuiz(latestAnswersRef.current);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [loading, submitting, isOffline, submitQuiz]);

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

  // Auto-populate starter code for coding questions if empty
  useEffect(() => {
    const currentQ = questions[currentIdx];
    if (currentQ?.type === 'code' && currentQ.starterCode) {
      const existing = userAnswers.find((ua) => ua.questionId === currentQ._id);
      if (!existing || existing.answer === undefined || existing.answer === '') {
        handleAnswerSelect(currentQ.starterCode);
      }
    }
  }, [currentIdx, questions]);

  const handleCodeKeyDown = (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = e.target.selectionStart;
      const end = e.target.selectionEnd;
      const val = e.target.value;
      const nextVal = val.substring(0, start) + '  ' + val.substring(end);
      handleAnswerSelect(nextVal);
      setTimeout(() => {
        if (e.target) {
          e.target.selectionStart = e.target.selectionEnd = start + 2;
        }
      }, 0);
    }
  };

  const getFormatTime = (seconds) => {
    if (!seconds || seconds < 0) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (loading) {
    return (
      <div className="student-portal min-h-screen flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-2xl space-y-4">
          <div className="h-16 rounded-md bg-[var(--bg-surface)] border border-[var(--border)] animate-pulse" />
          <div className="h-80 rounded-md bg-[var(--bg-surface)] border border-[var(--border)] animate-pulse" />
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentIdx];
  const selectedAnswer =
    userAnswers.find((ua) => ua.questionId === currentQuestion?._id)?.answer || '';
  const answeredCount = userAnswers.filter((ua) => String(ua.answer || '').trim() !== '').length;
  const unansweredCount = Math.max(0, questions.length - answeredCount);

  return (
    <div className="student-portal min-h-screen flex flex-col">
      {/* Offline Alert Banner */}
      {isOffline && (
        <div className="academic-badge-warning border-b px-4 py-2.5 text-xs font-semibold flex items-center justify-center gap-2 sticky top-0 z-[60]">
          <WifiOff size={16} />
          <span>Internet disconnected. Your quiz timer is paused and answers are saved locally. Reconnect to resume.</span>
        </div>
      )}

      <header className="bg-[var(--bg-sidebar)] text-[var(--sidebar-text)] px-4 sm:px-8 py-3 sticky top-0 z-50 flex flex-wrap justify-between items-center gap-3 border-b border-[var(--sidebar-border)]">
        <div>
          <h2 className="text-sm sm:text-base font-bold text-white truncate max-w-xs sm:max-w-md">
            {quiz?.title}
          </h2>
          <p className="text-xs text-[var(--sidebar-muted)]">
            Question {currentIdx + 1} of {questions.length} · Answered {answeredCount}/{questions.length}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-[var(--sidebar-muted)]">
            <Cloud size={14} />
            {syncState === 'saving'
              ? 'Saving...'
              : syncState === 'offline'
              ? 'Saved locally'
              : 'Progress saved'}
          </span>

          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md font-mono text-sm sm:text-base font-bold border ${
              isOffline
                ? 'academic-badge-warning'
                : timeLeft < 60
                ? 'academic-badge-danger animate-pulse'
                : 'bg-[var(--sidebar-hover)] border-[var(--sidebar-border)] text-white'
            }`}
          >
            <Clock size={16} />
            <span>{isOffline ? 'PAUSED' : getFormatTime(timeLeft)}</span>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 lg:p-8">
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
                className={`w-8 h-8 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                  isCurrent
                    ? 'btn-primary p-0'
                    : isAnswered
                    ? 'academic-badge-success border justify-center'
                    : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border border-[var(--border)] hover:bg-[var(--bg-hover)]'
                }`}
              >
                {idx + 1}
              </button>
            );
          })}
        </div>

        <div className="card p-6 sm:p-7">
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <span className="academic-badge academic-badge-info">
                {currentQuestion?.type === 'code'
                  ? `Coding Task (${currentQuestion?.codeLanguage === 'react' ? 'React' : currentQuestion?.codeLanguage === 'javascript' ? 'JavaScript' : 'HTML/CSS'})`
                  : currentQuestion?.type === 'long'
                  ? 'Long Answer'
                  : currentQuestion?.type === 'short'
                  ? 'Short Answer'
                  : 'Multiple Choice'}
              </span>
              <span className="text-xs text-[var(--text-secondary)] font-medium">
                · {currentQuestion?.marks} {currentQuestion?.marks === 1 ? 'Mark' : 'Marks'}
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-bold leading-relaxed text-[var(--text-primary)]">
              {currentQuestion?.questionText}
            </h3>
          </div>

          {/* MCQ Question Rendering */}
          {currentQuestion?.type === 'mcq' && (
            <div className="space-y-2.5">
              {(currentQuestion.options || []).map((opt, i) => {
                const isSelected = selectedAnswer === opt;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleAnswerSelect(opt)}
                    className={`w-full text-left p-3.5 rounded-md border transition-colors flex items-center justify-between gap-3 cursor-pointer ${
                      isSelected
                        ? 'border-[var(--accent)] bg-[var(--accent-subtle)] text-[var(--text-primary)] font-semibold'
                        : 'border-[var(--border)] bg-[var(--bg-input)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)]'
                    }`}
                  >
                    <span className="text-sm">{opt}</span>
                    <div
                      className={`w-4 h-4 rounded-sm border flex items-center justify-center shrink-0 ${
                        isSelected
                          ? 'bg-[var(--accent)] border-[var(--accent)] text-[var(--btn-primary-text)]'
                          : 'border-[var(--border)]'
                      }`}
                    >
                      {isSelected && <CheckCircle2 size={12} />}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Short Answer Rendering */}
          {currentQuestion?.type === 'short' && (
            <div>
              <label className="block text-xs font-semibold uppercase text-[var(--text-secondary)] mb-2">
                Your Answer:
              </label>
              <input
                type="text"
                placeholder="Type your concise answer..."
                className="input-field py-3.5 text-base"
                value={selectedAnswer}
                onChange={(e) => handleAnswerSelect(e.target.value)}
              />
            </div>
          )}

          {/* Long Question / Detailed Theory Rendering */}
          {currentQuestion?.type === 'long' && (
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-semibold uppercase text-[var(--text-secondary)]">
                  Your Detailed Answer:
                </label>
                <span className="text-xs text-[var(--text-muted)] font-mono">
                  {selectedAnswer.length} characters
                </span>
              </div>
              <textarea
                placeholder="Write your comprehensive answer, explanation, or code breakdown here..."
                className="input-field min-h-[160px] text-sm leading-relaxed"
                value={selectedAnswer}
                onChange={(e) => handleAnswerSelect(e.target.value)}
              />
            </div>
          )}

          {/* Live Code Question with Interactive Sandbox Preview */}
          {currentQuestion?.type === 'code' && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] pb-2.5">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCodeTab('code')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                      codeTab === 'code'
                        ? 'bg-[var(--accent)] text-white'
                        : 'bg-[var(--bg-muted)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <Code2 size={14} />
                    <span>Code Editor</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCodeTab('preview')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                      codeTab === 'preview'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-[var(--bg-muted)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <Play size={14} />
                    <span>Run & Live Preview</span>
                  </button>
                </div>

                {currentQuestion.starterCode && (
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm('Reset code back to the starter template?')) {
                        handleAnswerSelect(currentQuestion.starterCode);
                      }
                    }}
                    className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] flex items-center gap-1"
                  >
                    <RotateCcw size={12} />
                    <span>Reset Starter Code</span>
                  </button>
                )}
              </div>

              {codeTab === 'code' ? (
                <div className="rounded-md border border-[var(--border)] bg-[#1B222B] overflow-hidden">
                  <div className="p-2 bg-[#171F29] border-b border-[#35414E] flex justify-between items-center text-[11px] text-[#A4AFBC] font-mono">
                    <span>
                      {currentQuestion.codeLanguage === 'react'
                        ? 'React JSX Component'
                        : currentQuestion.codeLanguage === 'javascript'
                        ? 'JavaScript'
                        : 'index.html (HTML & CSS)'}
                    </span>
                    <span className="text-[10px]">Supports Tab Indentation</span>
                  </div>
                  <textarea
                    value={selectedAnswer}
                    onChange={(e) => handleAnswerSelect(e.target.value)}
                    onKeyDown={handleCodeKeyDown}
                    placeholder="// Write your code solution here..."
                    className="w-full h-80 p-4 font-mono text-xs sm:text-sm bg-transparent text-[#E6EBF1] resize-y focus:outline-none leading-relaxed"
                    spellCheck="false"
                  />
                </div>
              ) : (
                <div className="rounded-xl border border-[var(--border)] bg-white overflow-hidden shadow-inner">
                  <div className="p-2 bg-slate-100 border-b text-[11px] text-slate-600 font-mono flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        <div className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                        <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                      </div>
                      <span>Live Output Preview</span>
                    </div>
                    <span className="text-[10px] text-slate-400">Sandboxed Runtime</span>
                  </div>
                  <iframe
                    title="Live Preview"
                    srcDoc={buildPreviewDocument(selectedAnswer, currentQuestion.codeLanguage)}
                    sandbox="allow-scripts"
                    className="w-full h-80 border-0"
                  />
                </div>
              )}
            </div>
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
              onClick={() => setShowSubmitConfirm(true)}
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

      {/* Submit Confirmation Dialog Modal */}
      {showSubmitConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="card max-w-md w-full p-6 shadow-2xl border border-[var(--border)] bg-[var(--bg-surface)] relative">
            <button
              onClick={() => !submitting && setShowSubmitConfirm(false)}
              className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              disabled={submitting}
            >
              <X size={18} />
            </button>

            <div className="flex items-start gap-3.5 mb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-500/15 text-blue-600 flex items-center justify-center shrink-0">
                <FileQuestion size={22} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[var(--text-primary)]">
                  Submit Quiz Confirmation
                </h3>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  Are you ready to submit your answers?
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[var(--bg-muted)] border border-[var(--border)] mb-4 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-[var(--text-secondary)]">Total Questions:</span>
                <span className="font-semibold text-[var(--text-primary)]">{questions.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-secondary)]">Answered:</span>
                <span className="font-bold text-emerald-600">{answeredCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-secondary)]">Unanswered:</span>
                <span className={`font-bold ${unansweredCount > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {unansweredCount}
                </span>
              </div>
            </div>

            {unansweredCount > 0 && (
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-700 dark:text-amber-300 mb-5 leading-relaxed">
                <strong>Notice:</strong> You still have <strong>{unansweredCount}</strong> unanswered question(s). Unanswered questions will receive 0 marks.
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowSubmitConfirm(false)}
                disabled={submitting}
                className="btn-secondary py-2 px-4 text-xs font-semibold"
              >
                Keep Answering
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowSubmitConfirm(false);
                  submitQuiz();
                }}
                disabled={submitting}
                className="btn-primary py-2 px-5 text-xs font-semibold flex items-center gap-1.5"
              >
                <CheckCircle2 size={14} />
                <span>{submitting ? 'Submitting...' : 'Yes, Submit Quiz'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="p-4 text-center">
        <div className="inline-flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
          <AlertCircle size={13} /> Answers are automatically saved locally and synced to the server.
        </div>
      </footer>
    </div>
  );
};

export default QuizAttemptPage;
