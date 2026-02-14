import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../api';
import { Clock, AlertCircle, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

const QuizAttemptPage = () => {
  const { quizId } = useParams();
  const navigate = useNavigate();
  
  // Memoize student to prevent re-parsing and reference changes on every render
  const student = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('studentInfo'));
    } catch {
      return null;
    }
  }, []);

  const [quiz, setQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [userAnswers, setUserAnswers] = useState([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Stable submit function
  const submitQuiz = useCallback(async (finalAnswers = userAnswers) => {
    if (submitting || !student) return;
    setSubmitting(true);
    try {
      const { data } = await API.post('/student/submit', {
        studentName: student.fullName,
        studentId: student.studentId,
        quizId,
        userAnswers: finalAnswers
      });
      toast.success('Quiz submitted successfully!');
      navigate(`/result/${data._id}`, { replace: true });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error submitting quiz');
      navigate('/quizzes', { replace: true });
    } finally {
      setSubmitting(false);
    }
  }, [quizId, student, userAnswers, navigate, submitting]);

  // Initial data fetch
  useEffect(() => {
    const checkStatus = async () => {
      if (!student) {
        navigate('/', { replace: true });
        return;
      }
      try {
        const { data: status } = await API.get(`/student/check-attempt/${quizId}/${student.studentId}`);
        if (status.attempted) {
          toast.error('You have already attempted this quiz');
          navigate('/quizzes', { replace: true });
          return;
        }
        
        const { data: content } = await API.get(`/student/quiz/${quizId}/${student.studentId}`);
        setQuiz(content.quiz);
        setQuestions(content.questions);
        
        // Ensure duration is a valid number
        const duration = content.quiz.duration || 30;
        setTimeLeft(duration * 60);
        setLoading(false);
      } catch (error) {
        toast.error('Failed to load quiz');
        navigate('/quizzes', { replace: true });
      }
    };
    checkStatus();
  }, [quizId, navigate, student]); // student is now memoized, so this is stable

  // Timer logic - simplified to avoid re-dependency loops
  useEffect(() => {
    if (loading || submitting || timeLeft <= 0) {
        if (timeLeft <= 0 && !loading && !submitting) {
            submitQuiz();
        }
        return;
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
            clearInterval(timer);
            return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [loading, submitting, timeLeft === 0, submitQuiz]); 

  // Prevent back/refresh
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  const handleAnswerSelect = (answer) => {
    setUserAnswers(prev => {
      const updated = [...prev];
      const idx = updated.findIndex(ua => ua.questionId === questions[currentIdx]._id);
      if (idx > -1) {
        updated[idx].answer = answer;
      } else {
        updated.push({ questionId: questions[currentIdx]._id, answer });
      }
      return updated;
    });
  };

  const getFormatTime = (seconds) => {
    if (!seconds || seconds < 0) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600 mb-4"></div>
        <p className="text-gray-500 font-bold uppercase tracking-widest text-sm">Synchronizing Quiz Data...</p>
      </div>
    );
  }

  const currentQuestion = questions[currentIdx];
  const selectedAnswer = userAnswers.find(ua => ua.questionId === currentQuestion?._id)?.answer || '';

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <header className="bg-white shadow-xl px-8 py-5 sticky top-0 z-50 flex justify-between items-center border-b border-gray-100">
        <div className="flex items-center gap-4">
           <div className="bg-primary-50 p-3 rounded-2xl">
              <CheckCircle2 className="text-primary-600" size={24} />
           </div>
           <div>
              <h2 className="text-xl font-black text-gray-800 tracking-tight uppercase italic">{quiz.title}</h2>
              <div className="flex gap-4 mt-0.5">
                 <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Question {currentIdx + 1} of {questions.length}</p>
                 <p className="text-[10px] text-primary-500 font-black uppercase tracking-widest">• {student?.fullName}</p>
              </div>
           </div>
        </div>
        
        <div className={`flex items-center gap-3 px-6 py-3 rounded-2xl shadow-inner transition-all duration-500 ${timeLeft < 60 ? 'bg-red-50 text-red-600 animate-pulse' : 'bg-gray-50 text-gray-700'}`}>
          <Clock size={22} className={timeLeft < 60 ? 'animate-bounce' : ''} />
          <span className="font-mono text-2xl font-black tracking-tighter">{getFormatTime(timeLeft)}</span>
        </div>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto p-8">
        <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl shadow-gray-200/50 border border-gray-50 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-2 h-full bg-primary-600"></div>
          
          <div className="mb-10">
            <span className="inline-flex items-center px-4 py-1.5 bg-gray-100 text-gray-500 text-[10px] font-black rounded-full mb-6 uppercase tracking-[0.15em]">
              {currentQuestion?.type === 'mcq' ? 'Multiple Choice Scenario' : 'Direct Inquiry'} • {currentQuestion?.marks} Value
            </span>
            <h3 className="text-3xl font-black text-gray-900 leading-[1.2] italic tracking-tight">
              {currentQuestion?.questionText}
            </h3>
          </div>

          <div className="space-y-4">
            {currentQuestion?.type === 'mcq' ? (
              <div className="grid grid-cols-1 gap-4">
                {currentQuestion.options.map((opt, i) => (
                  <button
                    key={i}
                    onClick={() => handleAnswerSelect(opt)}
                    className={`group w-full text-left p-6 rounded-3xl border-2 transition-all flex items-center justify-between ${
                      selectedAnswer === opt 
                        ? 'border-primary-600 bg-primary-50 text-primary-700 ring-4 ring-primary-100 shadow-lg' 
                        : 'border-gray-50 bg-gray-50/50 hover:border-primary-200 hover:bg-white hover:shadow-md'
                    }`}
                  >
                    <span className={`text-lg font-bold ${selectedAnswer === opt ? 'text-primary-700' : 'text-gray-600'}`}>{opt}</span>
                    <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${selectedAnswer === opt ? 'bg-primary-600 border-primary-600 text-white' : 'border-gray-200 group-hover:border-primary-300'}`}>
                       {selectedAnswer === opt && <CheckCircle2 size={16} />}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="relative">
                <input
                  type="text"
                  placeholder="Enter your definitive answer..."
                  className="w-full h-20 px-8 rounded-3xl border-2 border-gray-50 bg-gray-50 focus:bg-white focus:border-primary-600 focus:ring-4 focus:ring-primary-100 outline-none text-xl font-bold transition-all shadow-inner"
                  value={selectedAnswer}
                  onChange={(e) => handleAnswerSelect(e.target.value)}
                />
              </div>
            )}
          </div>
        </div>

        <div className="mt-12 flex justify-between items-center gap-6">
          <button
            disabled={currentIdx === 0}
            onClick={() => setCurrentIdx(prev => prev - 1)}
            className="h-16 px-10 rounded-2xl bg-white text-gray-400 font-black uppercase text-xs tracking-widest shadow-sm border border-gray-100 hover:text-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            Previous Stage
          </button>
          
          <div className="flex-1 flex justify-end gap-4">
            {currentIdx === questions.length - 1 ? (
              <button
                onClick={() => submitQuiz()}
                disabled={submitting}
                className="h-16 px-12 rounded-2xl bg-green-600 text-white font-black uppercase text-sm tracking-[0.2em] shadow-xl shadow-green-500/30 hover:bg-green-700 transition-all flex items-center gap-3"
              >
                {submitting ? 'Transmitting...' : 'Final Submission'}
              </button>
            ) : (
              <button
                onClick={() => setCurrentIdx(prev => prev + 1)}
                className="h-16 px-12 rounded-2xl bg-[#0f172a] text-white font-black uppercase text-sm tracking-[0.2em] shadow-xl shadow-gray-900/30 hover:bg-black transition-all"
              >
                Proceed Next
              </button>
            )}
          </div>
        </div>
      </main>

      <footer className="p-10 text-center">
        <div className="inline-flex items-center gap-2 px-6 py-2 bg-amber-50 rounded-full border border-amber-100 text-[10px] font-black uppercase tracking-widest text-amber-600 shadow-sm animate-pulse">
          <AlertCircle size={14} />
          Session Integrity Monitor: Do not refresh this interface
        </div>
      </footer>
    </div>
  );
};

export default QuizAttemptPage;
