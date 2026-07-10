import React, { useState } from 'react';
import API from '../api';
import Navbar from '../components/AdminNavbar';
import { useNavigate } from 'react-router-dom';
import { Save, ArrowLeft, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

const CreateQuizPage = () => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    duration: 30,
    totalMarks: 10,
    startDate: '',
    endDate: ''
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...formData,
        startDate: formData.startDate ? new Date(formData.startDate).toISOString() : null,
        endDate: formData.endDate ? new Date(formData.endDate).toISOString() : null,
      };
      const { data } = await API.post('/quizzes', payload);
      toast.success('Quiz created! Now add some questions.');
      navigate(`/admin/manage-questions/${data._id}`);
    } catch (error) {
      toast.error('Failed to create quiz');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-transparent text-[#13315c] flex">
      <Navbar />
      <main className="flex-1 ml-64 p-8 max-w-5xl">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-600 hover:text-[#13315c] mb-6 transition-colors font-medium">
          <ArrowLeft size={20} /> Back
        </button>

        <header className="mb-10">
            <h1 className="text-4xl font-black text-[#13315c] mb-2">Configure New Quiz</h1>
            <p className="text-gray-600 font-medium">Set the identity, timing rules, and availability for your test</p>
        </header>

        <motion.form 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleSubmit} 
          className="card bg-white p-10 space-y-8 shadow-xl border-none rounded-3xl"
        >
          <div className="grid grid-cols-1 gap-8">
            <div className="space-y-2">
              <label className="block text-xs font-black text-gray-500 uppercase tracking-widest">Quiz Title</label>
              <input
                type="text"
                placeholder="e.g. JavaScript Fundamentals Final"
                className="input-field py-4 text-lg border-2"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-black text-gray-500 uppercase tracking-widest">Description</label>
              <textarea
                placeholder="Shortly explain what this quiz covers..."
                className="input-field py-4 min-h-[120px] border-2"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="block text-xs font-black text-gray-500 uppercase tracking-widest">Duration (Minutes)</label>
                <input
                  type="number"
                  className="input-field py-4 border-2"
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: Number(e.target.value) })}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-black text-gray-500 uppercase tracking-widest">Total Marks</label>
                <input
                  type="number"
                  className="input-field py-4 border-2"
                  value={formData.totalMarks}
                  onChange={(e) => setFormData({ ...formData, totalMarks: Number(e.target.value) })}
                  required
                />
              </div>
            </div>

            <div className="p-6 bg-[#8da9c4]/20 rounded-2xl border border-primary-100">
               <div className="flex items-center gap-2 mb-6 text-primary-700">
                  <Calendar size={20} />
                  <h3 className="font-bold uppercase tracking-wider text-sm">Schedule Availability (Optional)</h3>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-[#13315c] uppercase">Start Date & Time</label>
                    <input
                      type="datetime-local"
                      className="input-field border-primary-200"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-[#13315c] uppercase">End Date & Time</label>
                    <input
                      type="datetime-local"
                      className="input-field border-primary-200"
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    />
                  </div>
               </div>
               <p className="mt-4 text-xs text-[#13315c] font-medium">If left blank, the quiz will be available immediately and forever.</p>
            </div>
          </div>

          <div className="pt-6">
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-5 text-xl font-black flex items-center justify-center gap-3 shadow-2xl shadow-primary-500/30 rounded-2xl"
            >
              <Save size={24} /> {loading ? 'Creating...' : 'Create & Proceed to Questions'}
            </motion.button>
          </div>
        </motion.form>
      </main>
    </div>
  );
};

export default CreateQuizPage;
