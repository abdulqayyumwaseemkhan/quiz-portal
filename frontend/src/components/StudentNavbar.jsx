import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  BookOpen,
  FileArchive,
  FileText,
  Video,
  CalendarCheck,
  User,
  Menu,
  X,
  LogOut,
  Sun,
  Moon,
  Check,
  AlertCircle,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import api from '../api';

const StudentNavbar = ({ student }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);

  const [email, setEmail] = useState(student?.email || '');
  const [contact, setContact] = useState(student?.contact || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  const handleLogout = () => {
    localStorage.removeItem('studentInfo');
    navigate('/', { replace: true });
  };

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Lectures', path: '/student-lectures', icon: Video },
    { name: 'Quizzes', path: '/quizzes', icon: BookOpen },
    { name: 'Assignments', path: '/student-assignments', icon: FileArchive },
    { name: 'Attendance', path: '/student-attendance', icon: CalendarCheck },
    { name: 'Notes', path: '/student-notes', icon: FileText },
  ];

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setFeedback({ type: '', message: '' });
    setSavingProfile(true);
    try {
      const { data } = await api.put('/api/student/profile', { email, contact });
      const stored = JSON.parse(localStorage.getItem('studentInfo') || '{}');
      localStorage.setItem(
        'studentInfo',
        JSON.stringify({ ...stored, email: data.email, contact: data.contact })
      );
      setFeedback({ type: 'success', message: 'Contact details updated.' });
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Failed to update contact details.',
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setFeedback({ type: '', message: '' });
    if (newPassword.length < 6) {
      setFeedback({ type: 'error', message: 'New password must be at least 6 characters.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setFeedback({ type: 'error', message: 'New password and confirmation do not match.' });
      return;
    }
    setSavingPassword(true);
    try {
      await api.put('/api/student/change-password', {
        currentPassword,
        newPassword,
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setFeedback({ type: 'success', message: 'Password updated successfully.' });
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Failed to change password.',
      });
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <>
      <nav className="sticky top-0 z-40 bg-[var(--bg-surface)] border-b border-[var(--border)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <Link to="/dashboard" className="flex items-center gap-2.5">
              <div className="bg-[var(--accent)] p-2 rounded-lg text-white">
                <BookOpen size={18} />
              </div>
              <div>
                <span className="text-base font-bold text-[var(--text-primary)] tracking-tight block leading-none">
                  BanoQabil
                </span>
                <span className="text-[11px] text-[var(--text-muted)] font-medium">
                  Student Portal
                </span>
              </div>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden lg:flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname.startsWith(item.path);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                      isActive
                        ? 'bg-[var(--accent)] text-white'
                        : 'text-[var(--text-secondary)] hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <Icon size={15} /> {item.name}
                  </Link>
                );
              })}
            </div>

            <div className="hidden md:flex items-center gap-2.5">
              <button
                type="button"
                onClick={toggleTheme}
                className="p-2 rounded-lg border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-muted)] transition-colors"
                title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
              >
                {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
              </button>

              <button
                type="button"
                onClick={() => {
                  setFeedback({ type: '', message: '' });
                  setProfileModalOpen(true);
                }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[var(--border)] hover:bg-[var(--bg-muted)] text-left transition-colors"
                title="Account & Password Settings"
              >
                <User size={15} className="text-[var(--text-muted)]" />
                <div>
                  <p className="text-xs font-semibold text-[var(--text-primary)] leading-tight">
                    {student?.fullName}
                  </p>
                  <p className="text-[10px] font-mono text-[var(--text-muted)] leading-tight">
                    {student?.studentId}
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={handleLogout}
                className="p-2 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-colors"
                title="Sign out"
              >
                <LogOut size={17} />
              </button>
            </div>

            {/* Mobile actions */}
            <div className="flex lg:hidden items-center gap-1.5">
              <button
                type="button"
                onClick={toggleTheme}
                className="p-2 rounded-lg border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-muted)]"
                aria-label="Toggle theme"
              >
                {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
              </button>
              <button
                type="button"
                onClick={() => {
                  setFeedback({ type: '', message: '' });
                  setProfileModalOpen(true);
                }}
                className="p-2 rounded-lg border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-muted)]"
                aria-label="Account settings"
              >
                <User size={17} />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="p-2 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-muted)]"
                aria-label="Toggle menu"
              >
                {isOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Drawer */}
        {isOpen && (
          <div className="lg:hidden bg-[var(--bg-surface)] border-t border-[var(--border)] px-4 py-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname.startsWith(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-[var(--accent)] text-white font-semibold'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--bg-muted)]'
                  }`}
                >
                  <Icon size={17} /> {item.name}
                </Link>
              );
            })}
            <div className="pt-2 mt-2 border-t border-[var(--border)] flex items-center justify-between px-2">
              <div>
                <p className="text-xs font-semibold text-[var(--text-primary)]">{student?.fullName}</p>
                <p className="text-[11px] font-mono text-[var(--text-muted)]">ID: {student?.studentId}</p>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10"
              >
                <LogOut size={15} /> Sign Out
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* Account & Password Settings Modal */}
      {profileModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl max-w-md w-full p-6 shadow-xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <div>
                <h2 className="text-base font-bold text-[var(--text-primary)]">Account Settings</h2>
                <p className="text-xs text-[var(--text-muted)]">
                  {student?.fullName} · {student?.studentId}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setProfileModalOpen(false)}
                className="p-1.5 rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-muted)]"
              >
                <X size={18} />
              </button>
            </div>

            {feedback.message && (
              <div
                className={`p-3 rounded-lg text-xs font-medium flex items-center gap-2 border ${
                  feedback.type === 'success'
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400'
                }`}
              >
                {feedback.type === 'success' ? <Check size={15} /> : <AlertCircle size={15} />}
                <span>{feedback.message}</span>
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                Contact Information
              </h3>
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student@example.com"
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Phone / WhatsApp Contact
                </label>
                <input
                  type="text"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  placeholder="0300-1234567"
                  className="input-field"
                />
              </div>
              <button type="submit" disabled={savingProfile} className="btn-secondary w-full">
                {savingProfile ? 'Saving...' : 'Update Contact Info'}
              </button>
            </form>

            <form onSubmit={handleChangePassword} className="space-y-3 pt-4 border-t border-[var(--border)]">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                Change Password
              </h3>
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Current Password
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  New Password (min 6 characters)
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  className="input-field"
                />
              </div>
              <button type="submit" disabled={savingPassword} className="btn-primary w-full">
                {savingPassword ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default StudentNavbar;
