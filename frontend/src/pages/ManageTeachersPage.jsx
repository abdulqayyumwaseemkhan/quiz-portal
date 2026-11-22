import React, { useState, useEffect, useCallback } from 'react';
import API from '../api';
import Navbar from '../components/AdminNavbar';
import { useAuth } from '../context/AuthContext';
import {
  Users,
  UserPlus,
  ShieldCheck,
  Shield,
  Trash2,
  KeyRound,
  RefreshCw,
  Search,
  CheckCircle2,
  X,
  Mail,
  Lock,
} from 'lucide-react';
import toast from 'react-hot-toast';

const ManageTeachersPage = () => {
  const { admin } = useAuth();
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Add modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ email: '', password: '', role: 'admin' });
  const [addingTeacher, setAddingTeacher] = useState(false);

  // Reset password modal state
  const [resetModalTeacher, setResetModalTeacher] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  const isSuperAdmin = admin?.role === 'superadmin';

  const fetchTeachers = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await API.get('/admin/teachers');
      setTeachers(data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to fetch teachers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isSuperAdmin) {
      fetchTeachers();
    }
  }, [isSuperAdmin, fetchTeachers]);

  const handleGeneratePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$';
    let pwd = '';
    for (let i = 0; i < 9; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setAddForm((prev) => ({ ...prev, password: pwd }));
  };

  const handleAddTeacher = async (e) => {
    e.preventDefault();
    if (!addForm.email || !addForm.password) {
      toast.error('Please enter both email and password');
      return;
    }
    if (addForm.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setAddingTeacher(true);
    try {
      const { data } = await API.post('/admin/teachers', addForm);
      setTeachers((prev) => [data, ...prev]);
      setShowAddModal(false);
      setAddForm({ email: '', password: '', role: 'admin' });
      toast.success(`Teacher account created for ${data.email}!`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create teacher account');
    } finally {
      setAddingTeacher(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!resetModalTeacher) return;
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setSavingPassword(true);
    try {
      await API.put(`/admin/teachers/${resetModalTeacher._id}`, { password: newPassword });
      toast.success(`Password updated for ${resetModalTeacher.email}`);
      setResetModalTeacher(null);
      setNewPassword('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reset password');
    } finally {
      setSavingPassword(false);
    }
  };

  const handleDeleteTeacher = async (teacher) => {
    if (teacher._id === admin?._id) {
      toast.error('You cannot delete your own active super admin account');
      return;
    }
    const confirm = window.confirm(
      `Are you sure you want to delete teacher account ${teacher.email}? This cannot be undone.`
    );
    if (!confirm) return;

    try {
      await API.delete(`/admin/teachers/${teacher._id}`);
      setTeachers((prev) => prev.filter((t) => t._id !== teacher._id));
      toast.success('Teacher account deleted');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete teacher');
    }
  };

  const handleToggleRole = async (teacher) => {
    if (teacher._id === admin?._id) {
      toast.error('You cannot change your own role');
      return;
    }
    const nextRole = teacher.role === 'superadmin' ? 'admin' : 'superadmin';
    const confirm = window.confirm(
      `Change role of ${teacher.email} to ${nextRole === 'superadmin' ? 'Super Admin' : 'Teacher / Regular Admin'}?`
    );
    if (!confirm) return;

    try {
      const { data } = await API.put(`/admin/teachers/${teacher._id}`, { role: nextRole });
      setTeachers((prev) => prev.map((t) => (t._id === data._id ? { ...t, role: data.role } : t)));
      toast.success(`Role updated to ${data.role}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update role');
    }
  };

  const filteredTeachers = teachers.filter((t) =>
    t.email.toLowerCase().includes(searchQuery.trim().toLowerCase())
  );

  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen flex bg-[var(--bg-primary)] text-[var(--text-primary)]">
        <Navbar />
        <main className="flex-1 lg:ml-64 p-8 flex flex-col items-center justify-center text-center">
          <div className="p-4 rounded-2xl bg-rose-500/10 text-rose-500 mb-3">
            <Shield size={36} />
          </div>
          <h2 className="text-xl font-bold">Access Restricted</h2>
          <p className="text-xs text-[var(--text-secondary)] mt-1 max-w-sm">
            Only Super Admins can manage other teacher accounts and administrators.
          </p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <Navbar />
      <main className="flex-1 lg:ml-64 p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Teachers & Admins</h1>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              Create and manage teacher accounts. Each teacher manages their own enrolled students and courses.
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              onClick={fetchTeachers}
              className="btn-secondary flex items-center gap-2 text-xs sm:text-sm"
              title="Refresh list"
            >
              <RefreshCw size={15} /> Refresh
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="btn-primary flex items-center gap-2 text-xs sm:text-sm shadow-sm"
            >
              <UserPlus size={16} /> Add Teacher
            </button>
          </div>
        </header>

        {/* Search */}
        <div className="mb-5 max-w-md relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={15} />
          <input
            type="text"
            placeholder="Search teachers by email..."
            className="input-field pl-9 text-xs sm:text-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Table / List */}
        <div className="card overflow-hidden p-0 border border-[var(--border)]">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[var(--bg-muted)] text-[var(--text-secondary)] uppercase text-[11px] font-bold tracking-wider border-b border-[var(--border)]">
                <tr>
                  <th className="py-3 px-4">Teacher / Admin Email</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Students Enrolled</th>
                  <th className="py-3 px-4">Created Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {loading ? (
                  <tr>
                    <td colSpan="5" className="py-8 text-center text-[var(--text-muted)]">
                      Loading teachers...
                    </td>
                  </tr>
                ) : filteredTeachers.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="py-8 text-center text-[var(--text-muted)]">
                      No teacher accounts found. Click "Add Teacher" above to create one.
                    </td>
                  </tr>
                ) : (
                  filteredTeachers.map((teacher) => {
                    const isSelf = teacher._id === admin?._id;
                    return (
                      <tr key={teacher._id} className="hover:bg-[var(--bg-muted)]/30 transition-colors">
                        <td className="py-3.5 px-4 font-semibold text-[var(--text-primary)]">
                          <div className="flex items-center gap-2">
                            <span className="p-1.5 rounded-lg bg-[var(--accent-subtle)] text-[var(--accent)]">
                              <Mail size={13} />
                            </span>
                            <span>{teacher.email}</span>
                            {isSelf && (
                              <span className="text-[10px] bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 px-2 py-0.5 rounded-full font-bold">
                                You
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <button
                            type="button"
                            onClick={() => !isSelf && handleToggleRole(teacher)}
                            disabled={isSelf}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold cursor-pointer ${
                              teacher.role === 'superadmin'
                                ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                                : 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30'
                            }`}
                            title={isSelf ? 'Cannot change your own role' : 'Click to toggle role'}
                          >
                            <ShieldCheck size={12} />
                            <span>{teacher.role === 'superadmin' ? 'Super Admin' : 'Teacher / Admin'}</span>
                          </button>
                        </td>
                        <td className="py-3.5 px-4 font-mono font-semibold">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-[var(--bg-muted)] text-[var(--text-secondary)]">
                            <Users size={12} /> {teacher.studentCount} Students
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-[var(--text-muted)]">
                          {teacher.createdAt ? new Date(teacher.createdAt).toLocaleDateString() : '-'}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setResetModalTeacher(teacher);
                                setNewPassword('');
                              }}
                              className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-muted)] transition-colors"
                              title="Reset Password"
                            >
                              <KeyRound size={15} />
                            </button>
                            {!isSelf && (
                              <button
                                type="button"
                                onClick={() => handleDeleteTeacher(teacher)}
                                className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 transition-colors"
                                title="Delete Account"
                              >
                                <Trash2 size={15} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add Teacher Modal */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <div className="card w-full max-w-md p-6 relative">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <X size={18} />
              </button>
              <h2 className="text-lg font-bold mb-1">Create Teacher Account</h2>
              <p className="text-xs text-[var(--text-secondary)] mb-4">
                The new teacher will log in and independently manage their own students and assignments.
              </p>
              <form onSubmit={handleAddTeacher} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    placeholder="teacher@banoqabil.edu.pk"
                    className="input-field text-xs"
                    value={addForm.email}
                    onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold">Password</label>
                    <button
                      type="button"
                      onClick={handleGeneratePassword}
                      className="text-[11px] font-bold text-[var(--accent)] hover:underline"
                    >
                      Generate Secure Password
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="At least 6 characters"
                    className="input-field font-mono text-xs"
                    value={addForm.password}
                    onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Portal Role</label>
                  <select
                    className="input-field text-xs"
                    value={addForm.role}
                    onChange={(e) => setAddForm({ ...addForm, role: e.target.value })}
                  >
                    <option value="admin">Teacher / Regular Admin (Own Students)</option>
                    <option value="superadmin">Super Admin (Full Portal Access)</option>
                  </select>
                </div>
                <div className="pt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="btn-secondary flex-1 py-2 text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={addingTeacher}
                    className="btn-primary flex-1 py-2 text-xs"
                  >
                    {addingTeacher ? 'Creating...' : 'Create Account'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Reset Password Modal */}
        {resetModalTeacher && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <div className="card w-full max-w-sm p-6 relative">
              <button
                type="button"
                onClick={() => setResetModalTeacher(null)}
                className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <X size={18} />
              </button>
              <h2 className="text-base font-bold mb-1">Set New Password</h2>
              <p className="text-xs text-[var(--text-secondary)] mb-4">
                Update password for <span className="font-semibold text-[var(--text-primary)]">{resetModalTeacher.email}</span>
              </p>
              <form onSubmit={handleResetPassword} className="space-y-3.5">
                <div>
                  <input
                    type="text"
                    required
                    placeholder="Enter new password (min 6 chars)"
                    className="input-field font-mono text-xs"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setResetModalTeacher(null)}
                    className="btn-secondary flex-1 py-2 text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingPassword}
                    className="btn-primary flex-1 py-2 text-xs"
                  >
                    {savingPassword ? 'Saving...' : 'Save Password'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default ManageTeachersPage;
