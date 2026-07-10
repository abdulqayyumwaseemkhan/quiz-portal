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
    <nav className="glass sticky top-0 z-50 border-b-0 rounded-none shadow-none">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex items-center justify-between h-20">
          <div className="flex items-center gap-4">
            <div className="bg-[#13315c] p-2 rounded-xl text-white shadow-none">
              <BookOpen size={24} />
            </div>
            <span className="text-xl font-black text-[#13315c] tracking-tight">BanoQabil</span>
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
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all duration-200 ${
                      isActive ? 'bg-[#13315c] text-white' : 'text-gray-600 hover:bg-gray-50 hover:text-[#13315c]'
                    }`}
                  >
                    <Icon size={18} /> {item.name}
                  </Link>
                );
              })}
            </div>

            <div className="h-8 w-px bg-[#8da9c4]/50"></div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-bold text-[#13315c] uppercase">{student?.fullName}</p
                <p className="text-xs font-semibold text-gray-600 tracking-wider">ID: {student?.studentId}</p>
              </div>
              <button 
                onClick={handleLogout}
                className="p-2 rounded-xl text-rose-400 hover:bg-rose-500/20 hover:text-rose-300 transition-all duration-200 shadow-none"
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
              className="p-2 rounded-xl text-gray-600 hover:bg-gray-50 hover:text-[#13315c] transition-all"
            >
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Nav */}
      {isOpen && (
        <div className="md:hidden bg-[#eef4ed] border-t border-[#8da9c4]/30">
          <div className="px-4 py-4 space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname.startsWith(item.path);
              return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                      isActive ? 'bg-[#13315c] text-white' : 'text-gray-600 hover:bg-gray-50 hover:text-[#13315c]'
                    }`}
                    onClick={() => setIsOpen(false)}
                  >
                  <Icon size={20} /> {item.name}
                </Link>
              );
            })}
            <div className="border-t border-[#8da9c4]/30 pt-2 mt-2">
              <div className="px-4 py-2 mb-2">
                <p className="text-sm font-bold text-[#13315c] uppercase">{student?.fullName}</p>
                <p className="text-xs font-semibold text-gray-600 tracking-wider">ID: {student?.studentId}</p>
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
