import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import API from '../api';
import { Lock, Mail, ShieldCheck, Sun, Moon } from 'lucide-react';
import toast from 'react-hot-toast';

const AdminLoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await API.post('/admin/login', { email, password });
      login(data);
      toast.success('Login successful');
      navigate('/admin/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] flex items-center justify-center p-4 relative">
      <button
        type="button"
        onClick={toggleTheme}
        className="absolute top-4 right-4 p-2.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-muted)]"
        title="Toggle theme"
      >
        {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
      </button>

      <div className="max-w-md w-full bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl shadow-sm p-6 sm:p-8">
        <div className="text-center mb-7">
          <div className="bg-[var(--accent-subtle)] text-[var(--accent)] w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3">
            <ShieldCheck size={24} />
          </div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">BanoQabil Admin</h1>
          <p className="text-[var(--text-muted)] mt-1 text-xs font-medium uppercase tracking-wider">
            Instructor & Administrator Sign In
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
              Work Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={17} />
              <input
                type="email"
                placeholder="admin@portal.com"
                className="input-field pl-9"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={17} />
              <input
                type="password"
                placeholder="Enter password"
                className="input-field pl-9"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-2.5 text-sm font-semibold mt-2"
          >
            {loading ? 'Signing in...' : 'Sign In to Dashboard'}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-[var(--border)] text-center">
          <Link to="/" className="text-xs font-medium text-[var(--text-muted)] hover:text-[var(--accent)]">
            Back to Student Portal
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AdminLoginPage;
