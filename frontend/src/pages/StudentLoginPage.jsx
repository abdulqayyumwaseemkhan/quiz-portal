import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IdCard, BookOpen, Lock, Eye, EyeOff, KeyRound, ShieldCheck, Sun, Moon } from 'lucide-react';
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
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] flex flex-col justify-between p-4 relative">
      {/* Top Bar */}
      <div className="max-w-6xl w-full mx-auto pt-2 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-[var(--bg-surface)] border border-[var(--border)] flex items-center justify-center text-[var(--text-primary)]">
            <BookOpen size={18} />
          </div>
          <div>
            <span className="text-sm font-bold tracking-tight block leading-none">BanoQabil</span>
            <span className="text-[11px] text-[var(--text-muted)] font-medium">Learning Portal</span>
          </div>
        </div>

        <button
          type="button"
          onClick={toggleTheme}
          className="p-2.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-muted)] transition-colors"
          title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
        >
          {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
        </button>
      </div>

      {/* Main Centered Login Card */}
      <div className="max-w-md w-full mx-auto my-8 card p-7 sm:p-9">
        <div className="mb-7">
          <span className="inline-block text-[11px] font-semibold uppercase tracking-widest px-2.5 py-1 rounded-md bg-[var(--bg-muted)] text-[var(--text-secondary)] mb-3">
            Student Sign In
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
            Welcome to LMS Portal
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Enter your Student ID and password to access lectures, quizzes, and assignments.
          </p>
        </div>

        {!mustChangeStep ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5">
                Student ID
              </label>
              <div className="relative">
                <IdCard className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={17} />
                <input
                  type="text"
                  placeholder="e.g. BQ-WD-101"
                  className="input-field pl-10 font-mono"
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
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={17} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  className="input-field pl-10 pr-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 text-sm font-semibold flex items-center justify-center gap-2 mt-2"
            >
              {loading ? 'Signing in...' : 'Sign In to Portal'}
            </button>

            <div className="pt-4 border-t border-[var(--border)] text-center text-xs text-[var(--text-muted)]">
              Use the Student ID and password provided by your instructor.
            </div>
          </form>
        ) : (
          <form onSubmit={handleFirstPasswordChange} className="space-y-4">
            <div className="p-3.5 rounded-xl bg-[var(--bg-muted)] border border-[var(--border)] flex items-start gap-3">
              <ShieldCheck className="text-[var(--text-primary)] shrink-0 mt-0.5" size={18} />
              <div className="text-xs text-[var(--text-secondary)] leading-relaxed">
                <p className="font-semibold text-[var(--text-primary)]">Set Personal Password</p>
                Signed in as <strong>{loggedStudent?.fullName}</strong> ({loggedStudent?.studentId}). Choose a new password to secure your account.
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5">
                New Password
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={17} />
                <input
                  type="password"
                  placeholder="Minimum 6 characters"
                  className="input-field pl-10"
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
                <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={17} />
                <input
                  type="password"
                  placeholder="Re-enter new password"
                  className="input-field pl-10"
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
                placeholder="e.g. 0300-1234567"
                className="input-field"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={updatingPassword}
              className="btn-primary w-full py-3 text-sm font-semibold"
            >
              {updatingPassword ? 'Saving...' : 'Save Password & Continue'}
            </button>
          </form>
        )}
      </div>

      {/* Footer */}
      <div className="text-center text-[11px] text-[var(--text-muted)] pb-2">
        BanoQabil Web Development Learning Management System
      </div>
    </div>
  );
};

export default StudentLoginPage;
