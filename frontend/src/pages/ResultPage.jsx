import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import API from '../api';
import { Trophy, CheckCircle2, XCircle, Home, FileText, Award } from 'lucide-react';
import { motion } from 'framer-motion';
import StudentNavbar from '../components/StudentNavbar';

const ResultPage = () => {
  const { resultId } = useParams();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);

  const student = React.useMemo(() => {
    try { return JSON.parse(localStorage.getItem('studentInfo')); } 
    catch { return null; }
  }, []);

  useEffect(() => {
    const fetchResult = async () => {
      try {
        const { data } = await API.get(`/student/result/${resultId}`);
        setResult(data);
      } catch (error) {
        console.error('Error fetching result:', error);
      } finally {
        setLoading(false);
      }
    };
    if (resultId) fetchResult();
  }, [resultId]);

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-slate-950 text-primary-500">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-current mb-4"></div>
      <p className="ml-4 font-bold uppercase tracking-widest text-sm">Calibrating Results...</p>
    </div>
  );
  
  if (!result) return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
       <div className="bg-red-500/10 p-6 rounded-full text-rose-500 mb-6">
          <XCircle size={48} />
       </div>
       <h1 className="text-2xl font-black text-slate-100 mb-2 uppercase">Result Not Found</h1>
       <p className="text-slate-400 mb-8">We couldn't find the quiz result you're looking for.</p>
       <Link to="/quizzes" className="btn-primary px-8 py-3 rounded-xl flex items-center gap-2">
          <Home size={20} /> Return to Home
       </Link>
    </div>
  );

  // If results are not released, don't send scores or specific answers
  if (result.quizId && !result.quizId.resultsReleased) {
    return (
      <div className="min-h-screen bg-slate-950 font-sans">
        <StudentNavbar student={student} />
        <div className="flex items-center justify-center p-6 min-h-[calc(100vh-80px)]">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-xl w-full bg-slate-900 rounded-2xl shadow-2xl p-12 text-center border border-slate-800"
          >
            <div className="w-24 h-24 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner">
              <Award className="text-amber-400" size={48} />
            </div>
            <h1 className="text-4xl font-black text-slate-100 mb-4">Results Pending</h1>
            <p className="text-xl text-slate-400 font-medium mb-10 leading-relaxed">
              Great job, <span className="text-slate-100 font-black">{result.studentName}</span>! Your answers have been recorded.
            </p>
            <div className="bg-slate-800 rounded-xl p-6 mb-10 border border-dashed border-slate-700">
              <p className="text-slate-300 font-bold">"{result.message || 'Results are being processed and will be released soon!'}"</p>
            </div>
            <Link to="/quizzes" className="btn-primary w-full h-16 text-lg flex items-center justify-center gap-3">
               <Home size={24} /> Back to Quizzes
            </Link>
          </motion.div>
        </div>
      </div>
    );
  }

  const isPassed = result.percentage >= 50;

  return (
    <div className="min-h-screen bg-slate-950 font-sans">
      <StudentNavbar student={student} />
      <div className="p-6 md:p-12 max-w-4xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="card text-center mb-12 relative overflow-hidden p-10 border border-slate-800 shadow-2xl bg-slate-900 rounded-2xl"
        >
          <div className={`absolute top-0 left-0 w-full h-3 ${isPassed ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
          <div className="flex justify-center mb-6 pt-4">
            <motion.div 
              initial={{ rotate: -20, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              transition={{ type: "spring", stiffness: 200 }}
              className={`p-6 rounded-full ${isPassed ? 'bg-emerald-500/20 text-emerald-500' : 'bg-red-500/20 text-rose-500'}`}
            >
              <Trophy size={64} />
            </motion.div>
          </div>
          <h1 className="text-4xl font-black text-slate-100 mb-2">Quiz Completed!</h1>
          <p className="text-xl text-slate-400 mb-10 font-medium">Great effort, {result.studentName}!</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
            <motion.div whileHover={{ y: -5 }} className="bg-slate-800 p-8 rounded-xl shadow-sm border border-slate-700">
              <p className="text-slate-500 text-xs font-black mb-1 uppercase tracking-widest">Score</p>
              <p className="text-3xl font-extrabold text-slate-100">{result.score} / {result.totalPossibleMarks}</p>
            </motion.div>
            <motion.div whileHover={{ y: -5 }} className="bg-slate-800 p-8 rounded-xl shadow-sm border border-slate-700">
              <p className="text-slate-500 text-xs font-black mb-1 uppercase tracking-widest">Percentage</p>
              <p className={`text-4xl font-black ${isPassed ? 'text-emerald-500' : 'text-rose-500'}`}>{result.percentage}%</p>
            </motion.div>
            <motion.div whileHover={{ y: -5 }} className="bg-slate-800 p-8 rounded-xl shadow-sm border border-slate-700">
              <p className="text-slate-500 text-xs font-black mb-1 uppercase tracking-widest">Result</p>
              <p className={`text-3xl font-extrabold ${isPassed ? 'text-emerald-500' : 'text-rose-500'}`}>{isPassed ? 'PASSED' : 'FAILED'}</p>
            </motion.div>
          </div>

          <div className="flex flex-col md:flex-row justify-center gap-4">
            <Link to="/quizzes" className="btn-primary flex items-center justify-center gap-3 px-10 h-14 text-lg">
              <Home size={24} /> Back to Quizzes
            </Link>
          </div>
        </motion.div>

        <h2 className="text-3xl font-black text-slate-100 mb-8 flex items-center gap-3 px-4">
          <FileText className="text-primary-500" size={32} /> Review Answers
        </h2>

        <div className="space-y-8">
          {result.answers?.map((item, idx) => (
            <motion.div 
              key={idx}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className={`card border-l-8 p-8 transition-shadow hover:shadow-lg bg-slate-900 border-t border-r border-b border-t-slate-800 border-r-slate-800 border-b-slate-800 ${item.isCorrect ? 'border-l-green-500' : 'border-l-red-500'}`}
            >
              <div className="flex justify-between items-start mb-6">
                <h4 className="text-xl font-bold text-slate-100 leading-tight">
                  <span className="text-slate-500 mr-2 text-sm">Question {idx + 1}</span><br/>
                  {item.questionId?.questionText}
                </h4>
                {item.isCorrect ? (
                  <span className="inline-flex items-center gap-2 bg-emerald-500/20 text-green-400 px-4 py-2 rounded-full text-xs font-black uppercase tracking-wider">
                    <CheckCircle2 size={16} /> Correct
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2 bg-red-500/20 text-red-400 px-4 py-2 rounded-full text-xs font-black uppercase tracking-wider">
                    <XCircle size={16} /> Incorrect
                  </span>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm mt-6 p-6 bg-slate-800 rounded-xl border border-slate-700">
                <div>
                  <p className="text-slate-500 font-bold mb-2 uppercase tracking-tighter">Your Answer</p>
                  <p className={`text-lg font-black ${item.isCorrect ? 'text-green-400' : 'text-red-400'}`}>{item.answer || 'No Answer'}</p>
                </div>
                {!item.isCorrect && (
                  <div>
                    <p className="text-slate-500 font-bold mb-2 uppercase tracking-tighter">Correct Answer</p>
                    <p className="text-lg font-black text-green-400">{item.questionId.correctAnswer}</p>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ResultPage;
