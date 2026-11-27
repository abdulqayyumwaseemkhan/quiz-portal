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
  Code2,
  GraduationCap,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import api from '../api';
import { broadcastLiveUpdate, subscribeLiveUpdate } from '../utils/liveSync';
import { clientCache } from '../utils/clientCache';

const StudentNavbar = ({ student, compact = false }) => {
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

  useEffect(() => {
    if (student) {
      setProfileData((prev) => ({ ...prev, ...student }));
      setEmail(student.email || '');
      setContact(student.contact || '');
    }
  }, [student]);

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
    clientCache.clear();
    localStorage.removeItem('studentInfo');
    localStorage.removeItem('studentToken');
    navigate('/', { replace: true });
  };

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Video Lectures', path: '/student-lectures', icon: Video },
    { name: 'Quizzes & Exams', path: '/quizzes', icon: BookOpen },
    { name: 'Assignments', path: '/student-assignments', icon: FileArchive },
    { name: 'Practice Web IDE', path: '/practice-ide', icon: Code2 },
    { name: 'Attendance Record', path: '/student-attendance', icon: CalendarCheck },
    { name: 'Course Notes', path: '/student-notes', icon: FileText },
  ];

  const currentNavItem =
    navItems.find((item) => location.pathname.startsWith(item.path)) ||
    (location.pathname.startsWith('/result')
      ? { name: 'Assessment Result' }
      : { name: 'Academic Portal' });

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
    const currentActive = profileData.studentId ? profileData : student || {};
    setEmail(currentActive.email || '');
    setContact(currentActive.contact || '');
    setProfileModalOpen(true);
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
      {/* Top Academic Bar:
          - In compact mode (Web IDE): visible on all screen sizes using Sidebar Academic Slate (#26374A / #171F29)
          - In standard mode: mobile/tablet bar (< lg) in Academic Slate, desktop top header bar (lg:pl-60) on surface */}
      {compact ? (
        <header className="h-12 bg-[var(--bg-sidebar)] text-[var(--sidebar-text)] border-b border-[var(--sidebar-border)] px-3 sm:px-5 flex items-center justify-between shrink-0 z-40">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsOpen(true)}
              className="p-1.5 rounded text-[var(--sidebar-muted)] hover:text-white hover:bg-[var(--sidebar-hover)] transition-colors cursor-pointer"
              title="Open Navigation Menu"
            >
              <Menu size={18} />
            </button>
            <Link to="/dashboard" className="flex items-center gap-2">
              <div className="w-7 h-7 rounded bg-[#526F91] flex items-center justify-center text-white">
                <GraduationCap size={16} />
              </div>
              <span className="text-sm font-semibold tracking-tight text-white">
                BanoQabil <span className="text-[var(--sidebar-muted)] font-normal hidden sm:inline">| Academic LMS</span>
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleTheme}
              className="p-1.5 rounded border border-[var(--sidebar-border)] text-[var(--sidebar-muted)] hover:text-white hover:bg-[var(--sidebar-hover)] transition-colors cursor-pointer"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            </button>
            <button
              type="button"
              onClick={handleOpenProfileModal}
              className="px-2.5 py-1 rounded border border-[var(--sidebar-border)] text-xs text-[var(--sidebar-text)] hover:bg-[var(--sidebar-hover)] flex items-center gap-1.5 cursor-pointer"
            >
              <User size={13} className="text-[var(--brand-accent)]" />
              <span className="hidden sm:inline font-medium">{activeUser.fullName || 'Student'}</span>
            </button>
          </div>
        </header>
      ) : (
        <>
          {/* Mobile & Tablet Header (< lg) */}
          <header className="lg:hidden sticky top-0 z-40 h-14 bg-[var(--bg-sidebar)] text-[var(--sidebar-text)] border-b border-[var(--sidebar-border)] px-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setIsOpen(true)}
                className="p-1.5 rounded text-[var(--sidebar-muted)] hover:text-white hover:bg-[var(--sidebar-hover)]"
                aria-label="Open navigation menu"
              >
                <Menu size={20} />
              </button>
              <Link to="/dashboard" className="flex items-center gap-2">
                <div className="w-7 h-7 rounded bg-[#526F91] flex items-center justify-center text-white">
                  <GraduationCap size={16} />
                </div>
                <span className="text-sm font-semibold tracking-tight text-white">
                  BanoQabil LMS
                </span>
              </Link>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={toggleTheme}
                className="p-2 rounded border border-[var(--sidebar-border)] text-[var(--sidebar-muted)] hover:text-white hover:bg-[var(--sidebar-hover)]"
                aria-label="Toggle theme"
              >
                {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
              </button>
              <button
                type="button"
                onClick={handleOpenProfileModal}
                className="p-2 rounded border border-[var(--sidebar-border)] text-[var(--sidebar-muted)] hover:text-white hover:bg-[var(--sidebar-hover)]"
                aria-label="Account settings"
              >
                <User size={16} />
              </button>
            </div>
          </header>

          {/* Desktop Top Academic Header Bar (lg+) */}
          <header className="hidden lg:flex sticky top-0 z-30 h-14 lg:pl-60 bg-[var(--bg-header)] border-b border-[var(--border)]">
            <div className="flex-1 max-w-6xl mx-auto px-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-[var(--text-primary)]">
                  {currentNavItem.name}
                </span>
                {(activeUser.campus || activeUser.batch) && (
                  <span className="academic-badge">
                    {activeUser.campus}
                    {activeUser.campus && activeUser.batch ? ' · ' : ''}
                    {activeUser.batch}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="btn-secondary py-1.5 px-2.5 text-xs flex items-center gap-1.5"
                  title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                >
                  {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
                  <span>{theme === 'dark' ? 'Light' : 'Dark'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleOpenProfileModal}
                  className="btn-secondary py-1.5 px-3 text-xs flex items-center gap-2"
                  title="Student Profile & Security Settings"
                >
                  <User size={14} className="text-[var(--text-secondary)]" />
                  <span className="font-medium text-[var(--text-primary)]">
                    {activeUser.fullName || 'Student'}
                  </span>
                  {activeUser.studentId && (
                    <span className="font-mono text-[11px] text-[var(--text-secondary)] border-l border-[var(--border)] pl-2">
                      {activeUser.studentId}
                    </span>
                  )}
                </button>
              </div>
            </div>
          </header>
        </>
      )}

      {/* Slide-over Backdrop (Mobile/Tablet or Compact IDE Drawer) */}
      {isOpen && (
        <div
          className={`fixed inset-0 z-50 bg-black/50 ${compact ? '' : 'lg:hidden'}`}
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Academic University Sidebar (#26374A in Light Mode / #171F29 in Dark Mode) */}
      <aside
        className={`fixed top-0 left-0 z-50 h-screen w-60 bg-[var(--bg-sidebar)] text-[var(--sidebar-text)] border-r border-[var(--sidebar-border)] flex flex-col transition-transform duration-200 ${
          compact
            ? isOpen
              ? 'translate-x-0'
              : '-translate-x-full'
            : isOpen
            ? 'translate-x-0'
            : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Institution Header */}
        <div className="h-14 px-5 border-b border-[var(--sidebar-border)] flex items-center justify-between shrink-0">
          <Link
            to="/dashboard"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-2.5"
          >
            <div className="w-8 h-8 rounded bg-[#526F91] flex items-center justify-center text-white shrink-0">
              <GraduationCap size={18} />
            </div>
            <div>
              <span className="text-sm font-bold tracking-tight text-white block leading-none">
                BanoQabil
              </span>
              <span className="text-[11px] text-[var(--sidebar-muted)] font-medium block mt-0.5">
                Student Portal
              </span>
            </div>
          </Link>

          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className={`${
              compact ? 'inline-flex' : 'lg:hidden'
            } p-1 rounded text-[var(--sidebar-muted)] hover:text-white`}
            aria-label="Close sidebar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <p className="px-2.5 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-[var(--sidebar-muted)]/80">
            Academic Menu
          </p>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-md text-[13px] transition-colors ${
                  isActive
                    ? 'bg-[var(--sidebar-active-bg)] text-[var(--sidebar-active-text)] font-semibold border-l-2 border-[#A0B5C8]'
                    : 'text-[var(--sidebar-muted)] hover:bg-[var(--sidebar-hover)] hover:text-white font-medium'
                }`}
              >
                <Icon size={16} className="shrink-0" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </div>

        {/* Bottom Student Account Footer */}
        <div className="p-3.5 border-t border-[var(--sidebar-border)] space-y-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              handleOpenProfileModal();
            }}
            className="w-full px-2.5 py-2 rounded-md hover:bg-[var(--sidebar-hover)] text-left flex items-center gap-2.5 transition-colors cursor-pointer"
          >
            <div className="w-8 h-8 rounded bg-[var(--sidebar-hover)] border border-[var(--sidebar-border)] flex items-center justify-center text-[var(--brand-accent)] shrink-0">
              <User size={15} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-white truncate">
                {activeUser.fullName || 'Student'}
              </p>
              <p className="text-[11px] font-mono text-[var(--sidebar-muted)] truncate">
                ID: {activeUser.studentId || '—'}
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md text-xs font-medium text-[#E09F9E] hover:bg-white/5 hover:text-[#F2B8B6] border border-[var(--sidebar-border)] transition-colors cursor-pointer"
          >
            <LogOut size={14} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Account & Password Settings Modal */}
      {profileModalOpen && (
        <div className="student-portal fixed inset-0 z-50 bg-black/55 flex items-center justify-center p-4">
          <div className="card max-w-lg w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <div>
                <h2 className="text-base font-bold text-[var(--text-primary)]">
                  Student Profile &amp; Account Security
                </h2>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  Review enrollment details, update contact information, or change password
                </p>
              </div>
              <button
                type="button"
                onClick={() => setProfileModalOpen(false)}
                className="p-1.5 rounded text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {feedback.message && (
              <div
                className={`p-3 rounded-md text-xs font-medium flex items-center gap-2 border ${
                  feedback.type === 'success'
                    ? 'academic-badge-success'
                    : 'academic-badge-danger'
                }`}
              >
                {feedback.type === 'success' ? <Check size={15} /> : <AlertCircle size={15} />}
                <span>{feedback.message}</span>
              </div>
            )}

            <div className="p-4 rounded-md bg-[var(--bg-muted)] border border-[var(--border)] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                  Enrollment Record
                </span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[var(--bg-surface)] border border-[var(--border)] text-[var(--text-primary)]">
                  {activeUser.studentId || 'ID'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[var(--text-secondary)] block text-[11px]">Full Name</span>
                  <span className="font-semibold text-[var(--text-primary)]">
                    {activeUser.fullName || '—'}
                  </span>
                </div>
                <div>
                  <span className="text-[var(--text-secondary)] block text-[11px]">
                    Campus &amp; Batch
                  </span>
                  <span className="font-semibold text-[var(--text-primary)]">
                    {activeUser.campus || '—'} · {activeUser.batch || '—'}
                  </span>
                </div>
                <div>
                  <span className="text-[var(--text-secondary)] flex items-center gap-1 text-[11px]">
                    <Mail size={12} /> Registered Email
                  </span>
                  <span className="font-mono text-[var(--text-primary)] truncate block">
                    {activeUser.email || (
                      <em className="text-[var(--text-secondary)]">Not provided</em>
                    )}
                  </span>
                </div>
                <div>
                  <span className="text-[var(--text-secondary)] flex items-center gap-1 text-[11px]">
                    <Phone size={12} /> Registered Contact
                  </span>
                  <span className="font-mono text-[var(--text-primary)] block">
                    {activeUser.contact || (
                      <em className="text-[var(--text-secondary)]">Not provided</em>
                    )}
                  </span>
                </div>
              </div>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-3 pt-1">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                  Update Contact Information
                </h3>
                <button
                  type="button"
                  onClick={handleResetFormToCurrent}
                  className="text-[11px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-1 underline cursor-pointer"
                >
                  <RotateCcw size={11} /> Reset
                </button>
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]"
                    size={15}
                  />
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
                  <Phone
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]"
                    size={15}
                  />
                  <input
                    type="text"
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    placeholder="0300-1234567"
                    className="input-field pl-9 text-xs font-mono"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={savingProfile}
                className="btn-secondary w-full text-xs py-2"
              >
                {savingProfile ? 'Saving Changes...' : 'Save Contact Details'}
              </button>
            </form>

            <form
              onSubmit={handleChangePassword}
              className="space-y-3 pt-4 border-t border-[var(--border)]"
            >
              <div className="flex items-center gap-2">
                <Shield size={15} className="text-[var(--text-secondary)]" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
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

              <button
                type="submit"
                disabled={savingPassword}
                className="btn-primary w-full text-xs py-2.5"
              >
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
