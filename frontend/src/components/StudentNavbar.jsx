import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { BookOpen, FileArchive, FileText, User, Menu, X, LogOut } from 'lucide-react';

const StudentNavbar = ({ student }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('studentInfo');
    navigate('/', { replace: true });
  };

  const navItems = [
    { name: 'Quizzes', path: '/quizzes', icon: BookOpen },
    { name: 'Assignments', path: '/student-assignments', icon: FileArchive },
    { name: 'Notes', path: '/student-notes', icon: FileText },
  ];

  return (
    <nav className="glass sticky top-0 z-50 border-b-0 rounded-none shadow-[0_4px_30px_rgba(0,0,0,0.1)] backdrop-blur-xl border-white/10">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex items-center justify-between h-20">
          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-br from-primary-500 to-primary-600 p-2 rounded-xl text-white shadow-[0_0_15px_rgba(236,243,158,0.5)]">
              <BookOpen size={24} />
            </div>
            <span className="text-xl font-black text-white tracking-tight">BanoQabil</span>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            <div className="flex items-center gap-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname.startsWith(item.path);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all duration-300 ${
                      isActive ? 'bg-white/10 text-white shadow-inner' : 'text-slate-400 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <Icon size={18} /> {item.name}
                  </Link>
                );
              })}
            </div>

            <div className="h-8 w-px bg-white/10"></div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-bold text-white uppercase">{student?.fullName}</p>
                <p className="text-xs font-semibold text-slate-400 tracking-wider">ID: {student?.studentId}</p>
              </div>
              <button 
                onClick={handleLogout}
                className="p-2 rounded-xl text-rose-400 hover:bg-rose-500/20 hover:text-rose-300 hover:shadow-[0_0_15px_rgba(244,63,94,0.3)] transition-all duration-300"
                title="Logout"
              >
                <LogOut size={20} />
              </button>
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 rounded-xl text-slate-400 hover:bg-white/10 hover:text-white transition-all"
            >
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Nav */}
      {isOpen && (
        <div className="md:hidden bg-[#110e20]/95 backdrop-blur-xl border-t border-white/10 shadow-inner">
          <div className="px-4 py-4 space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname.startsWith(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                    isActive ? 'bg-white/10 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white'
                  }`}
                  onClick={() => setIsOpen(false)}
                >
                  <Icon size={20} /> {item.name}
                </Link>
              );
            })}
            <div className="border-t border-white/10 pt-2 mt-2">
              <div className="px-4 py-2 mb-2">
                <p className="text-sm font-bold text-white uppercase">{student?.fullName}</p>
                <p className="text-xs font-semibold text-slate-400 tracking-wider">ID: {student?.studentId}</p>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-rose-400 hover:bg-rose-500/20 transition-all"
              >
                <LogOut size={20} /> Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default StudentNavbar;
