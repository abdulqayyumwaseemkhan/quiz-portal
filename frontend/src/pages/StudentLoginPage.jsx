import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IdCard,
  GraduationCap,
  Lock,
  Eye,
  EyeOff,
  KeyRound,
  ShieldCheck,
  Sun,
  Moon,
} from 'lucide-react';
import API from '../api';
import { useTheme } from '../context/ThemeContext';
import toast from 'react-hot-toast';

const StudentLoginPage = () => {
  const [studentId, setStudentId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // First-login password change state
  const [mustChangeStep, setMustChangeStep] = useState(false);
  const [loggedStudent, setLoggedStudent] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [contact, setContact] = useState('');
  const [updatingPassword, setUpdatingPassword] = useState(false);

  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!studentId.trim() || !password) {
      return toast.error('Please enter your Student ID and password');
    }

    setLoading(true);
    try {
      const { data } = await API.post('/student/login', {
        studentId: studentId.trim(),
        password,
      });

      localStorage.setItem('studentToken', data.token);
      localStorage.setItem('studentInfo', JSON.stringify(data));

      if (data.mustChangePassword) {
        setLoggedStudent(data);
        setContact(data.contact || '');
        setMustChangeStep(true);
        toast('Please set a new personal password to continue.');
      } else {
        toast.success(`Welcome back, ${data.fullName}`);
        navigate('/dashboard');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Invalid Student ID or password');
    } finally {
      setLoading(false);
    }
  };

  const handleFirstPasswordChange = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      return toast.error('New password must be at least 6 characters');
    }
    if (newPassword !== confirmPassword) {
      return toast.error('Passwords do not match');
    }

    setUpdatingPassword(true);
    try {
      await API.put('/student/change-password', {
        currentPassword: password,
        newPassword,
      });

      if (contact.trim() !== (loggedStudent?.contact || '')) {
        await API.put('/student/profile', { contact: contact.trim() });
      }

      const updatedStudent = {
        ...loggedStudent,
        contact: contact.trim(),
        mustChangePassword: false,
      };
      localStorage.setItem('studentInfo', JSON.stringify(updatedStudent));
      toast.success('Password updated. Welcome to the portal!');
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update password');
    } finally {
      setUpdatingPassword(false);
    }
  };

  return (
    <div className="student-portal min-h-screen flex flex-col justify-between">
      {/* Institutional Academic Header Strip */}
      <header className="h-14 bg-[var(--bg-sidebar)] text-[var(--sidebar-text)] border-b border-[var(--sidebar-border)] px-4 sm:px-8 flex items-center justify-between">
        <div className="max-w-6xl w-full mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-[#526F91] flex items-center justify-center text-white">
              <GraduationCap size={18} />
            </div>
            <div>
              <span className="text-sm font-bold tracking-tight text-white block leading-none">
                BanoQabil
              </span>
              <span className="text-[11px] text-[var(--sidebar-muted)] font-medium block mt-0.5">
                Academic Learning Portal
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={toggleTheme}
            className="px-3 py-1.5 rounded border border-[var(--sidebar-border)] text-xs font-medium text-[var(--sidebar-text)] hover:bg-[var(--sidebar-hover)] flex items-center gap-1.5 transition-colors cursor-pointer"
            title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          >
            {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
            <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
          </button>
        </div>
      </header>

      {/* Centered Academic Login Card */}
      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="max-w-md w-full card p-6 sm:p-8">
          <div className="mb-6 pb-4 border-b border-[var(--border)]">
            <span className="academic-badge mb-2.5 uppercase tracking-wider">
              Student Authentication
            </span>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)]">
              Sign In to Student Portal
            </h1>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1">
              Enter your assigned Student ID and password to access your coursework.
            </p>
          </div>

          {!mustChangeStep ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5">
                  Student ID
                </label>
                <div className="relative">
                  <IdCard
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]"
                    size={16}
                  />
                  <input
                    type="text"
                    placeholder="123456"
                    className="input-field pl-9 font-mono"
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    autoComplete="username"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]"
                    size={16}
                  />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    className="input-field pl-9 pr-10"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full py-2.5 text-sm font-semibold mt-1"
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>

              <div className="pt-4 border-t border-[var(--border)] text-center text-xs text-[var(--text-secondary)]">
                Use the Student ID and credentials issued by your department instructor.
              </div>
            </form>
          ) : (
            <form onSubmit={handleFirstPasswordChange} className="space-y-4">
              <div className="p-3.5 rounded-md bg-[var(--bg-muted)] border border-[var(--border)] flex items-start gap-3">
                <ShieldCheck className="text-[var(--accent)] shrink-0 mt-0.5" size={18} />
                <div className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  <p className="font-semibold text-[var(--text-primary)]">
                    Set Personal Password
                  </p>
                  Signed in as <strong>{loggedStudent?.fullName}</strong> (
                  {loggedStudent?.studentId}). Choose a new password to secure your account.
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <KeyRound
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]"
                    size={16}
                  />
                  <input
                    type="password"
                    placeholder="Minimum 6 characters"
                    className="input-field pl-9"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5">
                  Confirm New Password
                </label>
                <div className="relative">
                  <KeyRound
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]"
                    size={16}
                  />
                  <input
                    type="password"
                    placeholder="Re-enter new password"
                    className="input-field pl-9"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5">
                  Contact Number (Optional)
                </label>
                <input
                  type="text"
                  placeholder="0300-1234567"
                  className="input-field"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                />
              </div>

              <button
                type="submit"
                disabled={updatingPassword}
                className="btn-primary w-full py-2.5 text-sm font-semibold"
              >
                {updatingPassword ? 'Saving...' : 'Save Password & Continue'}
              </button>
            </form>
          )}
        </div>
      </main>

      <footer className="py-4 text-center text-xs text-[var(--text-secondary)] border-t border-[var(--border)] bg-[var(--bg-surface)]">
        BanoQabil Academic Learning Management System
      </footer>
    </div>
  );
};

export default StudentLoginPage;
