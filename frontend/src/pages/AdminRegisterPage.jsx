import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import API from '../api';
import { Lock, Mail, User, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

const AdminRegisterPage = () => {
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await API.post('/admin/register', formData);
      toast.success('Registration successful! Please log in.');
      navigate('/admin/login');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-10"
      >
        <div className="text-center mb-10">
          <div className="bg-primary-100 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 -rotate-6 border-2 border-primary-200">
            <ShieldCheck className="text-primary-600" size={32} />
          </div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tight italic">Admin Registry</h2>
          <p className="text-gray-400 mt-2 uppercase tracking-[0.2em] text-[10px] font-black">Create your management account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Full Name</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={20} />
              <input
                type="text"
                placeholder="Manager Name"
                className="input-field pl-12 h-14 border-2"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={20} />
              <input
                type="email"
                placeholder="admin@banoqabil.com"
                className="input-field pl-12 h-14 border-2"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={20} />
              <input
                type="password"
                placeholder="••••••••"
                className="input-field pl-12 h-14 border-2"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-4 text-lg bg-primary-600 hover:bg-primary-700 shadow-xl shadow-primary-500/30 rounded-2xl transition-all"
          >
            {loading ? 'Processing...' : 'Register Account'}
          </button>
        </form>

        <div className="mt-8 text-center">
            <p className="text-gray-400 text-sm font-medium">Already have an account?</p>
            <Link to="/admin/login" className="text-primary-600 font-black uppercase text-xs tracking-tighter hover:underline mt-1 inline-block">
                Sign In Instead
            </Link>
        </div>
      </motion.div>
    </div>
  );
};

export default AdminRegisterPage;
