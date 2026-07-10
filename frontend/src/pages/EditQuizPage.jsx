import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../api';
import Navbar from '../components/AdminNavbar';
import { Save, ArrowLeft, Clock, Calendar, Type } from 'lucide-react';
import toast from 'react-hot-toast';

const EditQuizPage = () => {
    const { quizId } = useParams();
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
      title: '',
      description: '',
      duration: '',
      totalMarks: '',
      startDate: '',
      endDate: ''
    });
    const [loading, setLoading] = useState(true);

    const toLocalDatetimeLocal = (utcString) => {
      if (!utcString) return '';
      const date = new Date(utcString);
      const offset = date.getTimezoneOffset() * 60000;
      return new Date(date.getTime() - offset).toISOString().slice(0, 16);
    };
  
    useEffect(() => {
      const fetchQuiz = async () => {
        try {
          const { data } = await API.get(`/quizzes/${quizId}`);
          setFormData({
            title: data.title,
            description: data.description,
            duration: data.duration,
            totalMarks: data.totalMarks,
            startDate: toLocalDatetimeLocal(data.startDate),
            endDate: toLocalDatetimeLocal(data.endDate)
          });
        } catch (error) {
          toast.error('Failed to load quiz details');
        } finally {
          setLoading(false);
        }
      };
      fetchQuiz();
    }, [quizId]);
  
    const handleSubmit = async (e) => {
      e.preventDefault();
      try {
        const payload = {
          ...formData,
          startDate: formData.startDate ? new Date(formData.startDate).toISOString() : null,
          endDate: formData.endDate ? new Date(formData.endDate).toISOString() : null,
        };
        await API.put(`/quizzes/${quizId}`, payload);
        toast.success('Quiz updated successfully');
        navigate('/admin/dashboard');
      } catch (error) {
        toast.error('Failed to update quiz');
      }
    };
  
    if (loading) return <div className="p-12 text-center text-gray-600">Loading...</div>;

  return (
    <div className="min-h-screen bg-transparent text-[#13315c] flex">
      <Navbar />
      <main className="flex-1 ml-64 p-8">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-500 hover:text-[#13315c] mb-8 font-black uppercase text-xs tracking-widest transition-all">
          <ArrowLeft size={16} /> Back to Catalog
        </button>

        <header className="mb-10">
          <h1 className="text-4xl font-black text-[#13315c] tracking-tighter">Modify Program Registry</h1>
          <p className="text-gray-600 font-medium">Update configurations for {formData.title}</p>
        </header>

        <form onSubmit={handleSubmit} className="max-w-4xl bg-white p-12 rounded-[2.5rem] shadow-2xl shadow-black/50 border border-[#8da9c4]/30">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
            <div className="md:col-span-2">
              <label className="block text-xs font-black text-gray-500 uppercase tracking-[0.2em] mb-3">Quiz Identifier (Title)</label>
              <div className="relative">
                <Type className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={20} />
                <input
                  type="text"
                  className="input-field pl-12 h-16 text-lg font-bold"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-black text-gray-500 uppercase tracking-[0.2em] mb-3">Course description</label>
              <textarea
                className="input-field h-32 py-4 px-6"
                placeholder="Details about this quiz..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-black text-gray-500 uppercase tracking-[0.2em] mb-3">Session Duration (Min)</label>
              <div className="relative">
                <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={20} />
                <input
                  type="number"
                  className="input-field pl-12 h-16 font-bold"
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-black text-gray-500 uppercase tracking-[0.2em] mb-3">Cumulative Marks</label>
              <input
                type="number"
                className="input-field h-16 px-6 font-bold"
                value={formData.totalMarks}
                onChange={(e) => setFormData({ ...formData, totalMarks: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-black text-gray-500 uppercase tracking-[0.2em] mb-3">Deployment Start</label>
              <div className="relative">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={20} />
                <input
                  type="datetime-local"
                  className="input-field pl-12 h-16 font-bold"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-black text-gray-500 uppercase tracking-[0.2em] mb-3">Deployment End</label>
              <div className="relative">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={20} />
                <input
                  type="datetime-local"
                  className="input-field pl-12 h-16 font-bold"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                />
              </div>
            </div>
          </div>

          <button type="submit" className="btn-primary w-full h-16 text-lg shadow-2xl shadow-primary-500/30 flex items-center justify-center gap-3">
            <Save size={24} /> Sync Changes to Registry
          </button>
        </form>
      </main>
    </div>
  );
};

export default EditQuizPage;
