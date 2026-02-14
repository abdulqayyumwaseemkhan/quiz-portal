import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, IdCard, GraduationCap, Search, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import API from '../api';
import toast from 'react-hot-toast';

const StudentLoginPage = () => {
  const [studentId, setStudentId] = useState('');
  const [studentData, setStudentData] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLookup = async (e) => {
    e.preventDefault();
    if (!studentId) return toast.error('Please enter your Student ID');
    
    setLoading(true);
    try {
      const { data } = await API.get(`/student/verify-id/${studentId}`);
      setStudentData(data);
      toast.success(`Welcome back, ${data.fullName}`);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Invalid Student ID');
      setStudentData(null);
    } finally {
      setLoading(false);
    }
  };

  const proceedToQuizzes = () => {
    localStorage.setItem('studentInfo', JSON.stringify(studentData));
    navigate('/quizzes');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-white flex items-center justify-center p-4 font-sans">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full glass p-8 rounded-3xl relative z-10 shadow-2xl"
      >
        <div className="text-center mb-8">
          <motion.div 
            whileHover={{ scale: 1.1, rotate: 5 }}
            className="bg-primary-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-primary-200"
          >
            <GraduationCap className="text-primary-600" size={32} />
          </motion.div>
          <h2 className="text-3xl font-extrabold text-gray-800 tracking-tight">BanoQabil Web Dev</h2>
          <p className="text-gray-500 mt-2 font-medium tracking-widest uppercase text-xs">Official Quiz Portal</p>
        </div>

        {!studentData ? (
          <form onSubmit={handleLookup} className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">Enter Student ID</label>
              <div className="relative">
                <IdCard className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="e.g. STU123"
                  className="input-field pl-10 border-2 h-14"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                />
              </div>
            </div>

            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit" 
              disabled={loading}
              className="btn-primary w-full py-4 text-lg shadow-xl shadow-primary-500/30 flex items-center justify-center gap-2"
            >
              {loading ? 'Searching...' : <><Search size={20} /> Verify My ID</>}
            </motion.button>
          </form>
        ) : (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <div className="bg-green-50 p-6 rounded-2xl border-2 border-green-100 mb-6">
               <CheckCircle2 className="text-green-500 mx-auto mb-3" size={48} />
               <p className="text-gray-500 text-sm font-bold uppercase tracking-widest">Student Found</p>
               <h3 className="text-2xl font-black text-gray-800 mt-1">{studentData.fullName}</h3>
               <p className="text-gray-400 text-xs mt-1">ID: {studentData.studentId}</p>
            </div>

            <div className="space-y-4">
              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={proceedToQuizzes}
                className="btn-primary w-full py-4 text-lg shadow-xl shadow-primary-500/30"
              >
                Access My Dashboard
              </motion.button>
              <button 
                onClick={() => setStudentData(null)}
                className="text-gray-400 text-sm font-bold hover:text-gray-600 transition-colors uppercase tracking-widest"
              >
                Not you? Search again
              </button>
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};

export default StudentLoginPage;
