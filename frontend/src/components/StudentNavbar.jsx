import React, { useState, useEffect } from 'react';
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
  Mail,
  Phone,
  Shield,
  RotateCcw,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import api from '../api';
import { broadcastLiveUpdate, subscribeLiveUpdate } from '../utils/liveSync';

const StudentNavbar = ({ student }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);

  const [profileData, setProfileData] = useState(() => {
    try {
      const stored = localStorage.getItem('studentInfo');
      return stored ? JSON.parse(stored) : student || {};
    } catch {
      return student || {};
    }
  });

  const [email, setEmail] = useState('');
  const [contact, setContact] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  // Sync state whenever student prop updates
  useEffect(() => {
    if (student) {
      setProfileData((prev) => ({ ...prev, ...student }));
      setEmail(student.email || '');
      setContact(student.contact || '');
    }
  }, [student]);

  // Immediately reflect profile updates across open tabs & modals
  useEffect(() => {
    const unsubscribe = subscribeLiveUpdate((event) => {
      if (event?.type === 'STUDENT_PROFILE_UPDATED' && event.payload) {
        setProfileData((prev) => ({ ...prev, ...event.payload }));
        if (event.payload.email !== undefined) setEmail(event.payload.email);
        if (event.payload.contact !== undefined) setContact(event.payload.contact);
      }
    });
    return unsubscribe;
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('studentInfo');
    localStorage.removeItem('studentToken');
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

  const fetchLatestProfile = async () => {
    try {
      const { data } = await api.get('/student/profile');
      if (data) {
        setProfileData(data);
        setEmail(data.email || '');
        setContact(data.contact || '');
        const stored = JSON.parse(localStorage.getItem('studentInfo') || '{}');
        localStorage.setItem('studentInfo', JSON.stringify({ ...stored, ...data }));
      }
    } catch (err) {
      console.error('Could not refresh student profile from server:', err);
    }
  };

  const handleOpenProfileModal = () => {
    setFeedback({ type: '', message: '' });
    // Pre-fill with the best available data immediately
    const currentActive = profileData.studentId ? profileData : student || {};
    setEmail(currentActive.email || '');
    setContact(currentActive.contact || '');
    setProfileModalOpen(true);
    // Fetch latest fresh data from DB
    fetchLatestProfile();
  };

  const handleResetFormToCurrent = () => {
    setEmail(profileData.email || student?.email || '');
    setContact(profileData.contact || student?.contact || '');
    setFeedback({ type: 'success', message: 'Fields reset to current record details.' });
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setFeedback({ type: '', message: '' });
    setSavingProfile(true);
    try {
      const { data } = await api.put('/student/profile', { email, contact });
      setProfileData((prev) => ({ ...prev, email: data.email, contact: data.contact }));
      setEmail(data.email || '');
      setContact(data.contact || '');

      const stored = JSON.parse(localStorage.getItem('studentInfo') || '{}');
      const updatedInfo = { ...stored, email: data.email, contact: data.contact };
      localStorage.setItem('studentInfo', JSON.stringify(updatedInfo));
      broadcastLiveUpdate('STUDENT_PROFILE_UPDATED', data);
      setFeedback({ type: 'success', message: 'Contact details updated successfully.' });
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
      await api.put('/student/change-password', {
        currentPassword,
        newPassword,
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      broadcastLiveUpdate('STUDENT_PASSWORD_CHANGED', { studentId: activeUser.studentId });
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

  const activeUser = profileData.studentId ? profileData : student || {};

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
                onClick={handleOpenProfileModal}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[var(--border)] hover:bg-[var(--bg-muted)] text-left transition-colors"
                title="Account Details & Password Settings"
              >
                <User size={15} className="text-[var(--text-muted)]" />
                <div>
                  <p className="text-xs font-semibold text-[var(--text-primary)] leading-tight">
                    {activeUser.fullName || 'Student'}
                  </p>
                  <p className="text-[10px] font-mono text-[var(--text-muted)] leading-tight">
                    {activeUser.studentId || ''}
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={handleLogout}
                className="p-2 rounded-lg text-rose-500 hover:bg-rose-500/10 transition-colors"
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
                onClick={handleOpenProfileModal}
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
                <p className="text-xs font-semibold text-[var(--text-primary)]">{activeUser.fullName}</p>
                <p className="text-[11px] font-mono text-[var(--text-muted)]">ID: {activeUser.studentId}</p>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-500 hover:bg-rose-500/10"
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
          <div className="card max-w-lg w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <div>
                <h2 className="text-base font-bold text-[var(--text-primary)]">Student Profile & Settings</h2>
                <p className="text-xs text-[var(--text-muted)]">
                  View registered details, update contact info, or change password
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
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-500'
                }`}
              >
                {feedback.type === 'success' ? <Check size={15} /> : <AlertCircle size={15} />}
                <span>{feedback.message}</span>
              </div>
            )}

            {/* Current Enrolled Details Card */}
            <div className="p-4 rounded-xl bg-[var(--bg-muted)] border border-[var(--border)] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                  Registered Profile Details
                </span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[var(--bg-surface)] border border-[var(--border)] text-[var(--text-secondary)]">
                  {activeUser.studentId || 'ID'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                <div>
                  <span className="text-[var(--text-muted)] block text-[11px]">Full Name</span>
                  <span className="font-semibold text-[var(--text-primary)]">
                    {activeUser.fullName || '—'}
                  </span>
                </div>
                <div>
                  <span className="text-[var(--text-muted)] block text-[11px]">Campus & Batch</span>
                  <span className="font-semibold text-[var(--text-primary)]">
                    {activeUser.campus || '—'} · {activeUser.batch || '—'}
                  </span>
                </div>
                <div>
                  <span className="text-[var(--text-muted)] block text-[11px] flex items-center gap-1">
                    <Mail size={12} /> Registered Email
                  </span>
                  <span className="font-mono text-[var(--text-primary)] truncate block">
                    {activeUser.email || <em className="text-[var(--text-muted)]">Not provided</em>}
                  </span>
                </div>
                <div>
                  <span className="text-[var(--text-muted)] block text-[11px] flex items-center gap-1">
                    <Phone size={12} /> Registered Contact
                  </span>
                  <span className="font-mono text-[var(--text-primary)] block">
                    {activeUser.contact || <em className="text-[var(--text-muted)]">Not provided</em>}
                  </span>
                </div>
              </div>
            </div>

            {/* Edit Contact Information Form */}
            <form onSubmit={handleSaveProfile} className="space-y-3 pt-1">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                  Update Contact Information
                </h3>
                <button
                  type="button"
                  onClick={handleResetFormToCurrent}
                  className="text-[11px] text-[var(--text-muted)] hover:text-[var(--text-primary)] flex items-center gap-1 underline"
                  title="Revert to current record"
                >
                  <RotateCcw size={11} /> Reset
                </button>
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={15} />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="student@example.com"
                    className="input-field pl-9 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Phone / WhatsApp Contact
                </label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={15} />
                  <input
                    type="text"
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    placeholder="0300-1234567"
                    className="input-field pl-9 text-xs font-mono"
                  />
                </div>
              </div>

              <button type="submit" disabled={savingProfile} className="btn-secondary w-full text-xs py-2">
                {savingProfile ? 'Saving Changes...' : 'Save Updated Contact Info'}
              </button>
            </form>

            {/* Change Password Form */}
            <form onSubmit={handleChangePassword} className="space-y-3 pt-4 border-t border-[var(--border)]">
              <div className="flex items-center gap-2">
                <Shield size={15} className="text-[var(--text-secondary)]" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                  Change Password
                </h3>
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Current Password
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  required
                  className="input-field text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min 6 characters"
                    required
                    minLength={6}
                    className="input-field text-xs"
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
                    placeholder="Re-type password"
                    required
                    minLength={6}
                    className="input-field text-xs"
                  />
                </div>
              </div>

              <button type="submit" disabled={savingPassword} className="btn-primary w-full text-xs py-2.5">
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
