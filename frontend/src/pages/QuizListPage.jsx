import React, { useState, useEffect } from 'react';
import API from '../api';
import { Clock, BookOpen, ChevronRight, User, Search, Calendar, AlertCircle } from 'lucide-react';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';

const QuizListPage = () => {
  const [quizzes, setQuizzes] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const student = React.useMemo(() => {
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

  const handleLogout = () => {
    localStorage.removeItem('studentInfo');
    navigate('/', { replace: true });
  };

  useEffect(() => {
    const fetchQuizzes = async () => {
      try {
        const { data } = await API.get('/student/quizzes');
        
        // Fetch attempt status for each quiz
        const quizzesWithStatus = await Promise.all(data.map(async (quiz) => {
          const { data: statusData } = await API.get(`/student/check-attempt/${quiz._id}/${student.studentId}`);
          return { ...quiz, attemptInfo: statusData };
        }));
        
        setQuizzes(quizzesWithStatus);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    if (student) fetchQuizzes();
  }, [student]);

  const filteredQuizzes = quizzes.filter(q => 
    q.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isQuizAvailable = (quiz) => {
    const now = new Date();
    if (quiz.startDate && new Date(quiz.startDate) > now) return 'upcoming';
    if (quiz.endDate && new Date(quiz.endDate) < now) return 'expired';
    return 'available';
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f8fafc] p-6 md:p-12 font-sans">
      <div className="max-w-6xl mx-auto">
        <header className="flex flex-col md:flex-row justify-between items-center mb-12 bg-white p-8 rounded-3xl shadow-sm border border-gray-100 gap-6">
          <div className="flex items-center gap-4">
             <div className="bg-primary-600 p-4 rounded-2xl text-white shadow-lg shadow-primary-500/30">
                <BookOpen size={32} />
             </div>
             <div>
                <h1 className="text-3xl font-black text-gray-900 tracking-tight">Available Quizzes</h1>
                <p className="text-gray-500 font-medium">Select a challenge to prove your skills</p>
             </div>
          </div>
          
          <div className="flex items-center gap-4">
            <Link to="/student-notes" className="flex items-center gap-2 bg-gray-50 px-5 py-3 rounded-xl font-bold text-gray-600 hover:text-amber-600 hover:bg-amber-50 transition-colors">
               <FileText size={20} /> Notes
            </Link>
            <Link to="/student-assignments" className="flex items-center gap-2 bg-gray-50 px-5 py-3 rounded-xl font-bold text-gray-600 hover:text-blue-600 hover:bg-blue-50 transition-colors">
               <BookOpen size={20} /> Assignments
            </Link>
            <div className="flex items-center gap-4 bg-gray-50 p-2 rounded-2xl border border-gray-100">
              <div className="px-4 py-2 text-right hidden md:block">
                <p className="font-black text-gray-800 uppercase tracking-tighter">{student?.fullName}</p>
                <p className="text-xs text-gray-400 font-bold">STU ID: {student?.studentId}</p>
              </div>
            <button 
              onClick={handleLogout}
              className="bg-white p-3 rounded-xl shadow-sm text-red-500 hover:bg-red-50 transition-colors"
              title="Logout"
            >
              <User size={24} />
            </button>
          </div>
          </div>
        </header>

        <div className="relative mb-12">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400" size={24} />
            <input 
               type="text"
               placeholder="Search by quiz title..."
               className="w-full h-16 pl-16 pr-8 bg-white rounded-2xl shadow-sm border-none focus:ring-4 focus:ring-primary-100 text-lg font-medium transition-all"
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <AnimatePresence>
            {filteredQuizzes.map((quiz, idx) => {
              const status = isQuizAvailable(quiz);
              const isLocked = status !== 'available';
              
              return (
                <motion.div 
                  key={quiz._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className={`card group relative flex flex-col justify-between overflow-hidden p-8 border-none shadow-xl hover:shadow-2xl transition-all h-[320px] rounded-3xl ${isLocked ? 'opacity-75 grayscale-[0.5]' : ''}`}
                >
                  <div className={`absolute top-0 left-0 w-full h-2 ${status === 'upcoming' ? 'bg-amber-400' : status === 'expired' ? 'bg-red-400' : 'bg-primary-500'}`}></div>
                  
                  <div>
                    <div className="flex items-start justify-between mb-6">
                      <div className={`p-3 rounded-2xl ${isLocked ? 'bg-gray-100 text-gray-400' : 'bg-primary-50 text-primary-600'}`}>
                        <BookOpen size={24} />
                      </div>
                      <div className="flex flex-col items-end">
                        <div className="flex items-center gap-1 text-sm font-black text-gray-400 mb-1 uppercase tracking-widest">
                          <Clock size={16} />
                          <span>{quiz.duration} min</span>
                        </div>
                        <span className="text-xs font-bold text-gray-300">{quiz.totalMarks} Marks</span>
                      </div>
                    </div>
                    
                    <h3 className="text-2xl font-black text-gray-800 mb-2 truncate leading-tight">{quiz.title}</h3>
                    <p className="text-gray-500 text-sm font-medium line-clamp-2 mb-4 leading-relaxed">{quiz.description}</p>
                  </div>

                  <div className="mt-auto">
                    {status === 'upcoming' && (
                       <div className="flex items-center gap-2 text-amber-600 bg-amber-50 p-4 rounded-2xl text-xs font-bold uppercase tracking-wider mb-2">
                          <Calendar size={16} />
                          Starts: {new Date(quiz.startDate).toLocaleString()}
                       </div>
                    )}
                    {status === 'expired' && (
                       <div className="flex items-center gap-2 text-red-600 bg-red-50 p-4 rounded-2xl text-xs font-bold uppercase tracking-wider mb-2">
                          <AlertCircle size={16} /> Closed: {new Date(quiz.endDate).toLocaleString()}
                       </div>
                    )}
                    
                    {quiz.attemptInfo?.attempted ? (
                      <div className="flex flex-col gap-2">
                        <div className={`flex items-center gap-2 p-4 rounded-2xl text-xs font-bold uppercase tracking-wider ${quiz.resultsReleased ? 'text-green-600 bg-green-50' : 'text-amber-600 bg-amber-50'}`}>
                           <AlertCircle size={16} /> 
                           {quiz.resultsReleased ? 'Results Released' : 'Result Pending Release'}
                        </div>
                        <Link
                          to={`/result/${quiz.attemptInfo.resultId}`}
                          className="w-full h-14 bg-gray-900 text-white flex items-center justify-center gap-2 text-sm font-black uppercase tracking-widest rounded-2xl hover:bg-gray-800 transition-all"
                        >
                          View Result <ChevronRight size={20} />
                        </Link>
                      </div>
                    ) : isLocked ? (
                       <button disabled className="w-full py-4 rounded-2xl bg-gray-100 text-gray-400 font-black uppercase tracking-widest text-sm cursor-not-allowed">
                          {status === 'upcoming' ? 'Not Started' : 'Quiz Closed'}
                       </button>
                    ) : (
                      <Link
                        to={`/quiz/attempt/${quiz._id}`}
                        className="btn-primary w-full h-14 flex items-center justify-center gap-2 text-sm font-black uppercase tracking-widest rounded-2xl group-hover:gap-4 transition-all"
                      >
                        Start Quiz <ChevronRight size={20} />
                      </Link>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {filteredQuizzes.length === 0 && !loading && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-32 bg-white rounded-3xl shadow-sm border-2 border-dashed border-gray-100"
          >
            <div className="bg-gray-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
               <Search className="text-gray-300" size={48} />
            </div>
            <p className="text-gray-400 font-black text-2xl tracking-tight">No quizzes found.</p>
            <p className="text-gray-300 font-medium mt-1">Try searching for something else or contact your admin.</p>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default QuizListPage;
