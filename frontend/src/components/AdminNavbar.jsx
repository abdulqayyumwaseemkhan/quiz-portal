import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  LogOut,
  Users,
  FileArchive,
  BookOpen,
  MapPin,
  Trophy,
  Video,
  CalendarCheck,
  Sun,
  Moon,
  Menu,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const AdminNavbar = () => {
  const { admin, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'Campuses & Batches', path: '/admin/manage-campuses', icon: MapPin },
    { name: 'Students', path: '/admin/manage-students', icon: Users },
    { name: 'Create Quiz', path: '/admin/create-quiz', icon: FileText },
    { name: 'Quiz Results', path: '/admin/results', icon: Trophy },
    { name: 'Video Lectures', path: '/admin/manage-lectures', icon: Video },
    { name: 'Attendance', path: '/admin/manage-attendance', icon: CalendarCheck },
    { name: 'Assignments', path: '/admin/manage-assignments', icon: FileArchive },
    { name: 'Lecture Notes', path: '/admin/manage-notes', icon: BookOpen },
  ];

  return (
    <>
      {/* Mobile Header */}
      <div className="md:hidden sticky top-0 z-40 flex items-center justify-between px-4 h-14 bg-[var(--bg-surface)] border-b border-[var(--border)]">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="p-2 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-muted)]"
            aria-label="Open navigation"
          >
            <Menu size={20} />
          </button>
          <span className="font-bold text-base text-[var(--text-primary)] tracking-tight">
            BanoQabil Admin
          </span>
        </div>
        <button
          type="button"
          onClick={toggleTheme}
          className="p-2 rounded-lg border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-muted)]"
          title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
        >
          {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
        </button>
      </div>

      {/* Mobile Drawer Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar (Desktop fixed, Mobile drawer) */}
      <aside
        className={`w-64 bg-[var(--bg-surface)] h-screen fixed left-0 top-0 flex flex-col z-50 border-r border-[var(--border)] transition-transform duration-200 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-[var(--text-primary)] tracking-tight">BanoQabil</h2>
            <p className="text-[11px] text-[var(--text-muted)] font-medium uppercase tracking-wider mt-0.5">
              {admin?.username ? `Admin · ${admin.username}` : 'Admin Portal'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="md:hidden p-1.5 rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-muted)]"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              location.pathname === item.path ||
              (item.path !== '/admin/dashboard' && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-[var(--accent)] text-white font-semibold'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Icon size={18} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-[var(--border)] space-y-1.5">
          <button
            type="button"
            onClick={toggleTheme}
            className="flex items-center justify-between w-full px-3.5 py-2.5 rounded-lg text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-muted)] transition-colors"
          >
            <span className="flex items-center gap-3">
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
              <span>{theme === 'dark' ? 'Light Theme' : 'Dark Theme'}</span>
            </span>
            <span className="text-xs px-2 py-0.5 rounded bg-[var(--bg-muted)] text-[var(--text-muted)] uppercase">
              {theme}
            </span>
          </button>

          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3.5 py-2.5 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors font-medium text-sm"
          >
            <LogOut size={18} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default AdminNavbar;
