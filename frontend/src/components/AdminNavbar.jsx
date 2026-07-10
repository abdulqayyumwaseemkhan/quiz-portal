import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, FileText, ClipboardList, LogOut, Users, FileArchive, BookOpen, MapPin, Barcode } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const AdminNavbar = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'Manage Campuses', path: '/admin/manage-campuses', icon: MapPin },
    { name: 'Manage Students', path: '/admin/manage-students', icon: Users },
    { name: 'Create Quiz', path: '/admin/create-quiz', icon: FileText },
    { name: 'Assignments', path: '/admin/manage-assignments', icon: FileArchive },
    { name: 'Lecture Notes', path: '/admin/manage-notes', icon: BookOpen },
    { name: 'Barcode Generator', path: '/admin/barcode-generator', icon: Barcode },
  ];

  return (
    <div className="w-64 bg-slate-900 h-screen shadow-2xl fixed left-0 top-0 flex flex-col z-50 border-r border-slate-800">
      <div className="p-6 border-b border-slate-800 text-center">
          <h2 className="text-2xl font-bold text-primary-500 tracking-tight">BanoQabil</h2>
          <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-[0.2em] mt-1">Admin Portal</p>
      </div>
      <nav className="flex-1 p-4 space-y-2 mt-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-4 rounded-lg transition-all ${
                isActive 
                  ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/30 font-semibold' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
              }`}
            >
              <Icon size={20} />
              <span className="text-sm">{item.name}</span>
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-slate-800">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-4 py-4 text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all font-semibold text-sm"
        >
          <LogOut size={20} />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
};

export default AdminNavbar;
