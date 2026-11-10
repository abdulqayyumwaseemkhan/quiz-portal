import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { IdCard, GraduationCap, Lock, Eye, EyeOff, KeyRound, ShieldCheck } from 'lucide-react';
import API from '../api';
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
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full card p-8">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-[var(--accent-subtle)] text-[var(--accent)] flex items-center justify-center mx-auto mb-4">
            <GraduationCap size={28} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
            Student Portal
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Web Development LMS
          </p>
        </div>

        {!mustChangeStep ? (
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-2">
                Student ID
              </label>
              <div className="relative">
                <IdCard className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={18} />
                <input
                  type="text"
                  placeholder="e.g. BQ-WD-101"
                  className="input-field pl-10"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  autoComplete="username"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={18} />
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
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 text-sm font-semibold flex items-center justify-center gap-2"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>

            <div className="pt-4 border-t border-[var(--border)] flex justify-between items-center text-xs text-[var(--text-muted)]">
              <span>Use credentials sent to your email</span>
              <Link to="/admin/login" className="text-[var(--accent)] hover:underline font-medium">
                Admin Login
              </Link>
            </div>
          </form>
        ) : (
          <form onSubmit={handleFirstPasswordChange} className="space-y-5">
            <div className="p-3.5 rounded-xl bg-[var(--accent-subtle)] border border-[var(--border)] flex items-start gap-3">
              <ShieldCheck className="text-[var(--accent)] shrink-0 mt-0.5" size={18} />
              <div className="text-xs text-[var(--text-secondary)] leading-relaxed">
                <p className="font-semibold text-[var(--text-primary)]">First Login Security Check</p>
                Signed in as <strong>{loggedStudent?.fullName}</strong> ({loggedStudent?.studentId}). Please choose a new password you will remember.
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-2">
                New Password
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={18} />
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
              <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-2">
                Confirm New Password
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={18} />
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
              <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-2">
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
    </div>
  );
};

export default StudentLoginPage;
