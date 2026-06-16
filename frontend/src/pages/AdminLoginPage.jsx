import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../api';
import { Lock, Mail, ShieldAlert } from 'lucide-react';
import toast from 'react-hot-toast';

const AdminLoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await API.post('/admin/login', { email, password });
      login(data);
      toast.success('Login successful!');
      navigate('/admin/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-900 rounded-2xl shadow-2xl p-8">
        <div className="text-center mb-10">
          <div className="bg-primary-500/10 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 rotate-3">
            <ShieldAlert className="text-primary-400" size={32} />
          </div>
          <h2 className="text-3xl font-bold text-slate-100">BanoQabil Admin</h2>
          <p className="text-slate-400 mt-2 uppercase tracking-widest text-xs font-bold">Web Dev Portal Access</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">Work Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
              <input
                type="email"
                placeholder="admin@portal.com"
                className="input-field pl-10 h-12"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
              <input
                type="password"
                placeholder="••••••••"
                className="input-field pl-10 h-12"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-4 text-lg bg-primary-600 hover:bg-primary-700 shadow-xl shadow-primary-500/20"
          >
            {loading ? 'Authenticating...' : 'Sign In to Dashboard'}
          </button>
        </form>
        {/* Registration link removed as per requirement */}
      </div>
    </div>
  );
};

export default AdminLoginPage;
