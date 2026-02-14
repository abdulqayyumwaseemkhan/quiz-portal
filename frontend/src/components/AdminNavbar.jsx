import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, FileText, ClipboardList, LogOut, Users } from 'lucide-react';
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
    { name: 'Manage Students', path: '/admin/manage-students', icon: Users },
    { name: 'Create Quiz', path: '/admin/create-quiz', icon: FileText },
    { name: 'All Results', path: '/admin/results', icon: ClipboardList },
  ];

  return (
    <div className="w-64 bg-white h-screen shadow-2xl fixed left-0 top-0 flex flex-col z-50 border-r border-gray-100">
      <div className="p-6 border-b text-center">
          <h2 className="text-2xl font-black text-primary-600 tracking-tight">BanoQabil</h2>
          <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em] mt-1">Admin Portal</p>
      </div>
      <nav className="flex-1 p-4 space-y-2 mt-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-4 rounded-2xl transition-all ${
                isActive 
                  ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/30 font-bold' 
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <Icon size={20} />
              <span className="text-sm">{item.name}</span>
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-4 py-4 text-red-500 hover:bg-red-50 rounded-2xl transition-all font-bold text-sm"
        >
          <LogOut size={20} />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
};

export default AdminNavbar;
