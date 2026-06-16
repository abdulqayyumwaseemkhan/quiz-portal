import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import API from '../api';
import { Trophy, CheckCircle2, XCircle, Home, FileText, Award } from 'lucide-react';
import { motion } from 'framer-motion';

const ResultPage = () => {
  const { resultId } = useParams();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);

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
    <div className="flex items-center justify-center min-h-screen bg-gray-50 text-primary-600">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-current mb-4"></div>
      <p className="ml-4 font-bold uppercase tracking-widest text-sm">Calibrating Results...</p>
    </div>
  );
  
  if (!result) return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
       <div className="bg-red-50 p-6 rounded-full text-red-500 mb-6">
          <XCircle size={48} />
       </div>
       <h1 className="text-2xl font-black text-gray-800 mb-2 uppercase">Result Not Found</h1>
       <p className="text-gray-500 mb-8">We couldn't find the quiz result you're looking for.</p>
       <Link to="/quizzes" className="btn-primary px-8 py-3 rounded-xl flex items-center gap-2">
          <Home size={20} /> Return to Home
       </Link>
    </div>
  );

  // If results are not released, don't send scores or specific answers
  if (result.quizId && !result.quizId.resultsReleased) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-xl w-full bg-white rounded-[2.5rem] shadow-2xl p-12 text-center border border-gray-100"
        >
          <div className="w-24 h-24 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner">
            <Award className="text-amber-500" size={48} />
          </div>
          <h1 className="text-4xl font-black text-gray-900 mb-4">Results Pending</h1>
          <p className="text-xl text-gray-500 font-medium mb-10 leading-relaxed">
            Great job, <span className="text-gray-900 font-black">{result.studentName}</span>! Your answers have been recorded.
          </p>
          <div className="bg-gray-50 rounded-2xl p-6 mb-10 border border-dashed border-gray-200">
            <p className="text-gray-600 font-bold">"{result.message || 'Results are being processed and will be released soon!'}"</p>
          </div>
          <Link to="/quizzes" className="btn-primary w-full h-16 text-lg flex items-center justify-center gap-3">
             <Home size={24} /> Back to Quizzes
          </Link>
        </motion.div>
      </div>
    );
  }

  const isPassed = result.percentage >= 50;

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-12 font-sans">
      <div className="max-w-4xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="card text-center mb-12 relative overflow-hidden p-10 border-none shadow-2xl"
        >
          <div className={`absolute top-0 left-0 w-full h-3 ${isPassed ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <div className="flex justify-center mb-6 pt-4">
            <motion.div 
              initial={{ rotate: -20, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              transition={{ type: "spring", stiffness: 200 }}
              className={`p-6 rounded-full ${isPassed ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}
            >
              <Trophy size={64} />
            </motion.div>
          </div>
          <h1 className="text-4xl font-black text-gray-800 mb-2">Quiz Completed!</h1>
          <p className="text-xl text-gray-500 mb-10 font-medium">Great effort, {result.studentName}!</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
            <motion.div whileHover={{ y: -5 }} className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
              <p className="text-gray-400 text-xs font-black mb-1 uppercase tracking-widest">Score</p>
              <p className="text-3xl font-extrabold text-gray-800">{result.score} / {result.totalPossibleMarks}</p>
            </motion.div>
            <motion.div whileHover={{ y: -5 }} className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
              <p className="text-gray-400 text-xs font-black mb-1 uppercase tracking-widest">Percentage</p>
              <p className={`text-4xl font-black ${isPassed ? 'text-green-600' : 'text-red-600'}`}>{result.percentage}%</p>
            </motion.div>
            <motion.div whileHover={{ y: -5 }} className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
              <p className="text-gray-400 text-xs font-black mb-1 uppercase tracking-widest">Result</p>
              <p className={`text-3xl font-extrabold ${isPassed ? 'text-green-600' : 'text-red-600'}`}>{isPassed ? 'PASSED' : 'FAILED'}</p>
            </motion.div>
          </div>

          <div className="flex flex-col md:flex-row justify-center gap-4">
            <Link to="/quizzes" className="btn-primary flex items-center justify-center gap-3 px-10 h-14 text-lg">
              <Home size={24} /> Back to Quizzes
            </Link>
          </div>
        </motion.div>

        <h2 className="text-3xl font-black text-gray-800 mb-8 flex items-center gap-3 px-4">
          <FileText className="text-primary-600" size={32} /> Review Answers
        </h2>

        <div className="space-y-8">
          {result.answers?.map((item, idx) => (
            <motion.div 
              key={idx}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className={`card border-l-8 p-8 transition-shadow hover:shadow-md ${item.isCorrect ? 'border-green-500' : 'border-red-500'}`}
            >
              <div className="flex justify-between items-start mb-6">
                <h4 className="text-xl font-bold text-gray-800 leading-tight">
                  <span className="text-gray-400 mr-2 text-sm">Question {idx + 1}</span><br/>
                  {item.questionId?.questionText}
                </h4>
                {item.isCorrect ? (
                  <span className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-full text-xs font-black uppercase tracking-wider">
                    <CheckCircle2 size={16} /> Correct
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2 bg-red-100 text-red-700 px-4 py-2 rounded-full text-xs font-black uppercase tracking-wider">
                    <XCircle size={16} /> Incorrect
                  </span>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm mt-6 p-6 bg-gray-50 rounded-2xl border border-gray-100">
                <div>
                  <p className="text-gray-400 font-bold mb-2 uppercase tracking-tighter">Your Answer</p>
                  <p className={`text-lg font-black ${item.isCorrect ? 'text-green-700' : 'text-red-700'}`}>{item.answer || 'No Answer'}</p>
                </div>
                {!item.isCorrect && (
                  <div>
                    <p className="text-gray-400 font-bold mb-2 uppercase tracking-tighter">Correct Answer</p>
                    <p className="text-lg font-black text-green-700">{item.questionId.correctAnswer}</p>
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
