import React, { useState, useEffect } from 'react';
import API from '../api';
import Navbar from '../components/AdminNavbar';
import { Plus, Trash2, Edit, FileQuestion, Users, Award, BookOpen, Eye, EyeOff } from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

const AdminDashboard = () => {
  const [quizzes, setQuizzes] = useState([]);
  const [stats, setStats] = useState({ totalQuizzes: 0, totalAttempts: 0, totalStudents: 0 });
  const [studentsData, setStudentsData] = useState([]);
  const [resultsData, setResultsData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [quizRes, resultRes, studentRes] = await Promise.all([
          API.get('/quizzes'),
          API.get('/admin/results'),
          API.get('/admin/students')
        ]);
        setQuizzes(quizRes.data);
        setResultsData(resultRes.data);
        setStudentsData(studentRes.data);
        setStats({
          totalQuizzes: quizRes.data.length,
          totalAttempts: resultRes.data.length,
          totalStudents: studentRes.data.length
        });
      } catch (error) {
        toast.error('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this quiz and all its questions?')) {
      try {
        await API.delete(`/quizzes/${id}`);
        setQuizzes(quizzes.filter(q => q._id !== id));
        toast.success('Quiz deleted');
      } catch (error) {
        toast.error('Delete failed');
      }
    }
  };

  const toggleRelease = async (id, currentStatus) => {
    try {
      await API.put(`/quizzes/${id}`, { resultsReleased: !currentStatus });
      setQuizzes(quizzes.map(q => q._id === id ? { ...q, resultsReleased: !currentStatus } : q));
      toast.success(!currentStatus ? 'Results released to students' : 'Results hidden from students');
    } catch (error) {
      toast.error('Update failed');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
      <Navbar />
      <main className="flex-1 ml-64 p-10">
        <header className="flex justify-between items-center mb-12">
          <div>
            <h1 className="text-4xl font-black text-slate-100 tracking-tight">Admin Dashboard</h1>
            <p className="text-slate-400 font-medium mt-1">Global statistics and course management</p>
          </div>
          <Link to="/admin/create-quiz" className="btn-primary flex items-center gap-2 px-8 h-14 text-lg shadow-2xl shadow-primary-500/40">
            <Plus size={24} /> Create New Quiz
          </Link>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          <StatCard title="Total Quizzes" value={stats.totalQuizzes} icon={BookOpen} color="text-blue-400" bg="bg-blue-500/10" />
          <StatCard title="Total Students" value={stats.totalStudents} icon={Users} color="text-emerald-400" bg="bg-emerald-500/10" />
          <StatCard title="Quiz Attempts" value={stats.totalAttempts} icon={Award} color="text-violet-400" bg="bg-violet-500/10" />
        </div>

        <div className="mb-12">
          <h2 className="text-2xl font-bold text-slate-100 mb-6">Campus Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...new Set(studentsData.map(s => s.campus))].filter(Boolean).map(campus => {
              const campusStudents = studentsData.filter(s => s.campus === campus);
              const campusStudentIds = new Set(campusStudents.map(s => s.studentId));
              const campusResults = resultsData.filter(r => campusStudentIds.has(r.studentId) || r.campus === campus);
              
              const avgScore = campusResults.length 
                ? (campusResults.reduce((sum, r) => sum + r.percentage, 0) / campusResults.length).toFixed(1) 
                : 0;

              return (
                <div key={campus} className="card bg-slate-900 p-6 rounded-xl border border-slate-800 shadow-sm">
                  <h3 className="font-bold text-lg text-slate-200 mb-4">{campus}</h3>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-semibold text-slate-400">Students</span>
                    <span className="font-bold text-slate-100">{campusStudents.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold text-slate-400">Avg Score</span>
                    <span className={`font-bold ${avgScore >= 50 ? 'text-emerald-400' : 'text-primary-600'}`}>
                      {avgScore}%
                    </span>
                  </div>
                </div>
              );
            })}
            {studentsData.length > 0 && ![...new Set(studentsData.map(s => s.campus))].filter(Boolean).length && (
               <p className="text-slate-400 font-medium">No campus data available.</p>
            )}
          </div>
        </div>

        <div className="bg-slate-900 rounded-xl shadow-xl shadow-black/50 border border-slate-800 overflow-hidden">
          <div className="p-8 border-b border-slate-800 flex justify-between items-center">
            <h2 className="text-2xl font-semibold text-slate-200">Course Catalog</h2>
            <div className="flex gap-2">
                <span className="bg-primary-500/10 text-primary-600 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest">{quizzes.length} ACTIVE</span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-900/50 text-slate-500 text-[10px] font-semibold uppercase tracking-[0.2em]">
                <tr>
                  <th className="px-8 py-6">Quiz identity</th>
                  <th className="px-8 py-6">Timing Configuration</th>
                  <th className="px-8 py-6">Weightage</th>
                  <th className="px-8 py-6 text-right pr-12">Control Panel</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {quizzes.map((quiz) => (
                  <tr key={quiz._id} className="hover:bg-slate-900/50 transition-all group">
                    <td className="px-8 py-8">
                       <p className="font-bold text-lg text-slate-200 group-hover:text-primary-600 transition-colors uppercase tracking-tighter">{quiz.title}</p>
                       <p className="text-xs text-slate-500 font-medium mt-1 line-clamp-1 max-w-[200px]">{quiz.description}</p>
                    </td>
                    <td className="px-8 py-8">
                       <div className="flex flex-col gap-1">
                          <span className="inline-flex items-center gap-2 text-sm font-bold text-slate-300">
                             <div className="w-1.5 h-1.5 rounded-full bg-primary-500"></div>
                             {quiz.duration} Minutes
                          </span>
                           <span className="text-[10px] text-slate-500 font-semibold tracking-widest uppercase">
                             Added: {new Date(quiz.createdAt).toLocaleDateString()}
                          </span>
                       </div>
                    </td>
                    <td className="px-8 py-8">
                       <div className="bg-slate-800 h-12 w-12 rounded-xl flex items-center justify-center">
                          <span className="text-lg font-bold text-slate-200">{quiz.totalMarks}</span>
                       </div>
                    </td>
                    <td className="px-8 py-8 text-right pr-12">
                        <div className="flex justify-end gap-3 transition-all duration-300">
                            <button 
                              onClick={() => toggleRelease(quiz._id, quiz.resultsReleased)}
                              className={`p-3 rounded-lg shadow-sm border border-slate-800 transition-all ${
                                quiz.resultsReleased 
                                  ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20' 
                                  : 'bg-slate-800 text-slate-500 hover:bg-slate-700'
                              }`}
                              title={quiz.resultsReleased ? "Hide Results" : "Release Results"}
                            >
                              {quiz.resultsReleased ? <Eye size={20} /> : <EyeOff size={20} />}
                            </button>
                            <Link 
                              to={`/admin/manage-questions/${quiz._id}`}
                              className="p-3 bg-slate-900 text-primary-600 hover:bg-primary-500/10 rounded-lg shadow-sm border border-slate-800 transition-all"
                              title="Manage Questions"
                            >
                              <FileQuestion size={20} />
                            </Link>
                            <Link 
                              to={`/admin/edit-quiz/${quiz._id}`}
                              className="p-3 bg-slate-900 text-amber-400 hover:bg-amber-500/10 rounded-lg shadow-sm border border-slate-800 transition-all"
                              title="Edit Details"
                            >
                              <Edit size={20} />
                            </Link>
                            <button 
                              onClick={() => handleDelete(quiz._id)}
                              className="p-3 bg-slate-900 text-rose-500 hover:bg-rose-500/10 rounded-lg shadow-sm border border-slate-800 transition-all"
                              title="Delete Quiz"
                            >
                              <Trash2 size={20} />
                            </button>
                        </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {quizzes.length === 0 && !loading && (
            <div className="p-24 text-center">
               <div className="w-20 h-20 bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-6">
                  <FileQuestion className="text-slate-700" size={40} />
               </div>
               <p className="text-slate-500 font-semibold text-xl uppercase tracking-widest">Repository is Empty</p>
               <p className="text-slate-600 mt-2 font-medium">Create your first quiz to populate the catalog.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

const StatCard = ({ title, value, icon: Icon, color, bg }) => (
  <motion.div 
    whileHover={{ y: -8 }}
    className="card flex items-center gap-6 p-10 bg-slate-900 border-none shadow-xl shadow-black/50 rounded-xl"
  >
    <div className={`p-5 rounded-lg ${bg} ${color} shadow-inner`}>
      <Icon size={32} />
    </div>
    <div>
      <p className="text-slate-500 text-xs font-semibold uppercase tracking-[0.2em] mb-1">{title}</p>
      <p className="text-4xl font-bold text-slate-200 leading-none">{value}</p>
    </div>
  </motion.div>
);

export default AdminDashboard;
