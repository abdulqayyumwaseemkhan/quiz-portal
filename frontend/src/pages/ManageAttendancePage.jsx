import React, { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import API from '../api';
import Navbar from '../components/AdminNavbar';
import {
  Plus,
  CalendarCheck,
  CheckCircle2,
  Download,
  Trash2,
  Edit,
  Save,
  Search,
  Users,
  X,
  Check,
  UserCheck,
  UserX,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { broadcastLiveUpdate } from '../utils/liveSync';

const BUBBLE_OPTIONS = [
  {
    key: 'Present',
    short: 'P',
    label: 'Present',
    activeClass:
      'bg-emerald-600 text-white border-emerald-600 shadow-sm ring-2 ring-emerald-500/40 font-bold',
    inactiveClass:
      'border-[var(--border)] bg-[var(--bg-surface)] text-emerald-600/80 hover:bg-emerald-500/10',
  },
  {
    key: 'Absent',
    short: 'A',
    label: 'Absent',
    activeClass:
      'bg-rose-600 text-white border-rose-600 shadow-sm ring-2 ring-rose-500/40 font-bold',
    inactiveClass:
      'border-[var(--border)] bg-[var(--bg-surface)] text-rose-600/80 hover:bg-rose-500/10',
  },
  {
    key: 'Leave',
    short: 'L',
    label: 'Leave',
    activeClass:
      'bg-sky-600 text-white border-sky-600 shadow-sm ring-2 ring-sky-500/40 font-bold',
    inactiveClass:
      'border-[var(--border)] bg-[var(--bg-surface)] text-sky-600/80 hover:bg-sky-500/10',
  },
  {
    key: 'Late',
    short: 'T',
    label: 'Late',
    activeClass:
      'bg-amber-500 text-white border-amber-500 shadow-sm ring-2 ring-amber-500/40 font-bold',
    inactiveClass:
      'border-[var(--border)] bg-[var(--bg-surface)] text-amber-600/80 hover:bg-amber-500/10',
  },
];

const ManageAttendancePage = () => {
  const [activeTab, setActiveTab] = useState('sessions'); // 'sessions' | 'reports'
  const [meta, setMeta] = useState({ campuses: [], batches: [] });
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Create session form
  const [showCreate, setShowCreate] = useState(false);
  const [sessionForm, setSessionForm] = useState({
    lectureTitle: '',
    date: new Date().toISOString().slice(0, 10),
    time: '02:00 PM - 04:00 PM',
    campus: '',
    batch: '',
  });

  // Active marking workspace
  const [activeSessionData, setActiveSessionData] = useState(null); // { session, students, recordsMap }
  const [rosterSearch, setRosterSearch] = useState('');
  const [savingAttendance, setSavingAttendance] = useState(false);

  // Reports tab state
  const [reportFilter, setReportFilter] = useState({
    campus: '',
    batch: '',
    fromDate: '',
    toDate: '',
    studentId: '',
  });
  const [reportData, setReportData] = useState({ totalSessions: 0, students: [] });
  const [loadingReport, setLoadingReport] = useState(false);

  useEffect(() => {
    fetchMeta();
    fetchSessions();
  }, []);

  const fetchMeta = async () => {
    try {
      const { data } = await API.get('/admin/students/meta');
      const campuses = data.campuses || [];
      const batches = data.batches || [];
      setMeta({ campuses, batches });
      setSessionForm((prev) => ({
        ...prev,
        campus: prev.campus || campuses[0] || '',
        batch: prev.batch || batches[0] || '',
      }));
    } catch {
      // ignore
    }
  };

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const { data } = await API.get('/attendance/sessions');
      setSessions(data);
    } catch {
      toast.error('Failed to load attendance sessions');
    } finally {
      setLoading(false);
    }
  };

  const openSessionForMarking = async (sessionId) => {
    try {
      const { data } = await API.get(`/attendance/sessions/${sessionId}`);
      const recordsMap = {};
      // By default, every active student is initialized to 'Present'
      (data.students || []).forEach((st) => {
        recordsMap[st.studentId] = {
          studentId: st.studentId,
          studentName: st.fullName,
          status: 'Present',
          remarks: '',
        };
      });
      // Overlay any existing saved records
      (data.records || []).forEach((rec) => {
        recordsMap[rec.studentId] = {
          studentId: rec.studentId,
          studentName: rec.studentName,
          status: rec.status || 'Present',
          remarks: rec.remarks || '',
        };
      });

      setActiveSessionData({
        session: data.session,
        students: data.students || [],
        recordsMap,
      });
      setShowCreate(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      toast.error('Failed to load session roster');
    }
  };

  const handleCreateSession = async (e) => {
    e.preventDefault();
    if (!sessionForm.campus || !sessionForm.batch) {
      return toast.error('Please select Campus and Batch');
    }
    try {
      const { data } = await API.post('/attendance/sessions', sessionForm);
      const recordsMap = {};
      // By default all students default to Present
      (data.students || []).forEach((st) => {
        recordsMap[st.studentId] = {
          studentId: st.studentId,
          studentName: st.fullName,
          status: 'Present',
          remarks: '',
        };
      });
      setActiveSessionData({
        session: data.session,
        students: data.students || [],
        recordsMap,
      });
      setShowCreate(false);
      fetchSessions();
      toast.success('Session created! All students defaulted to Present. Tap Absent for missing students.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create session');
    }
  };

  const handleSetAllStatus = (status) => {
    if (!activeSessionData) return;
    const updated = { ...activeSessionData.recordsMap };
    Object.keys(updated).forEach((sid) => {
      updated[sid] = { ...updated[sid], status };
    });
    setActiveSessionData({ ...activeSessionData, recordsMap: updated });
    toast.success(`Marked all as ${status}`);
  };

  const handleStudentStatusChange = (studentId, fullName, status) => {
    if (!activeSessionData) return;
    setActiveSessionData((prev) => ({
      ...prev,
      recordsMap: {
        ...prev.recordsMap,
        [studentId]: {
          ...(prev.recordsMap[studentId] || { studentId, studentName: fullName, remarks: '' }),
          status,
        },
      },
    }));
  };

  const handleSaveBulkAttendance = async () => {
    if (!activeSessionData) return;
    const entries = Object.values(activeSessionData.recordsMap);
    if (entries.length === 0) {
      return toast.error('No students in this campus/batch to mark');
    }

    setSavingAttendance(true);
    try {
      await API.post(`/attendance/sessions/${activeSessionData.session._id}/mark`, {
        lectureTitle: activeSessionData.session.lectureTitle,
        date: activeSessionData.session.date,
        time: activeSessionData.session.time,
        entries,
      });
      broadcastLiveUpdate('ATTENDANCE_UPDATED', {
        sessionId: activeSessionData.session._id,
        campus: activeSessionData.session.campus,
        batch: activeSessionData.session.batch,
      });
      toast.success(`Saved attendance for ${entries.length} students`);
      setActiveSessionData(null);
      fetchSessions();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save attendance');
    } finally {
      setSavingAttendance(false);
    }
  };

  const handleDeleteSession = async (id) => {
    if (!window.confirm('Delete this attendance session and all its records?')) return;
    try {
      await API.delete(`/attendance/sessions/${id}`);
      setSessions(sessions.filter((s) => s._id !== id));
      if (activeSessionData?.session?._id === id) setActiveSessionData(null);
      toast.success('Session deleted');
    } catch {
      toast.error('Delete failed');
    }
  };

  const fetchReport = async () => {
    setLoadingReport(true);
    try {
      const { data } = await API.get('/attendance/report', { params: reportFilter });
      setReportData(data);
    } catch {
      toast.error('Failed to load attendance report');
    } finally {
      setLoadingReport(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'reports') {
      fetchReport();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const handleExportReportExcel = () => {
    if (!reportData.students?.length) {
      return toast.error('No report rows to export');
    }
    const rows = reportData.students.map((s) => ({
      'Student ID': s.studentId,
      'Full Name': s.fullName,
      Campus: s.campus,
      Batch: s.batch,
      'Total Lectures Held': s.totalLectures,
      Present: s.present,
      Late: s.late,
      Absent: s.absent,
      Leave: s.leave,
      'Total Attended': s.attended,
      'Attendance (%)': s.percentage,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Attendance Report');
    XLSX.writeFile(wb, `attendance_report_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const filteredRoster = useMemo(() => {
    if (!activeSessionData) return [];
    const q = rosterSearch.trim().toLowerCase();
    if (!q) return activeSessionData.students;
    return activeSessionData.students.filter(
      (s) =>
        s.fullName.toLowerCase().includes(q) || s.studentId.toLowerCase().includes(q)
    );
  }, [activeSessionData, rosterSearch]);

  const activeSessionCounts = useMemo(() => {
    if (!activeSessionData?.recordsMap) {
      return { Present: 0, Absent: 0, Late: 0, Leave: 0, total: 0 };
    }
    const values = Object.values(activeSessionData.recordsMap);
    let Present = 0;
    let Absent = 0;
    let Late = 0;
    let Leave = 0;
    values.forEach((v) => {
      if (v.status === 'Absent') Absent++;
      else if (v.status === 'Leave') Leave++;
      else if (v.status === 'Late') Late++;
      else Present++;
    });
    return { Present, Absent, Late, Leave, total: values.length };
  }, [activeSessionData]);

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      <Navbar />
      <main className="flex-1 lg:ml-64 p-3.5 sm:p-6 lg:p-8 pb-24 sm:pb-10">
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Lecture Attendance</h1>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1">
              Tap-friendly bubble marking with default Present & mobile responsive layout
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('sessions')}
              className={`py-2 px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                activeTab === 'sessions' ? 'btn-primary' : 'btn-secondary'
              }`}
            >
              Lecture Sessions
            </button>
            <button
              onClick={() => setActiveTab('reports')}
              className={`py-2 px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                activeTab === 'reports' ? 'btn-primary' : 'btn-secondary'
              }`}
            >
              Attendance Reports
            </button>
          </div>
        </header>

        {activeTab === 'sessions' ? (
          <>
            {/* Active Session Marking Panel */}
            {activeSessionData ? (
              <div className="card p-4 sm:p-6 mb-6 space-y-4">
                {/* Session Header */}
                <div className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-[var(--border)]">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--accent)]">
                      Marking Attendance
                    </span>
                    <h2 className="text-lg sm:text-xl font-bold mt-0.5">
                      {activeSessionData.session.lectureTitle}
                    </h2>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                      {activeSessionData.session.campus} • {activeSessionData.session.batch} •{' '}
                      {new Date(activeSessionData.session.date).toLocaleDateString()}{' '}
                      {activeSessionData.session.time ? `(${activeSessionData.session.time})` : ''}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveSessionData(null)}
                      className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-muted)]"
                      title="Close"
                    >
                      <X size={18} />
                    </button>
                  </div>
                </div>

                {/* Live Bubble Counters & Quick Bulk Toggles */}
                <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-[var(--bg-muted)] border border-[var(--border)]">
                  <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold">
                    <span className="px-2.5 py-1 rounded-full bg-emerald-600/15 text-emerald-600 border border-emerald-500/20">
                      P: {activeSessionCounts.Present}
                    </span>
                    <span className="px-2.5 py-1 rounded-full bg-rose-600/15 text-rose-600 border border-rose-500/20">
                      A: {activeSessionCounts.Absent}
                    </span>
                    <span className="px-2.5 py-1 rounded-full bg-sky-600/15 text-sky-600 border border-sky-500/20">
                      L: {activeSessionCounts.Leave}
                    </span>
                    <span className="px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-600 border border-amber-500/20">
                      T: {activeSessionCounts.Late}
                    </span>
                    <span className="text-[var(--text-muted)] text-[11px] font-normal ml-1">
                      ({activeSessionCounts.total} total)
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleSetAllStatus('Present')}
                      className="btn-secondary py-1 px-2.5 text-xs flex items-center gap-1"
                      title="Set all to Present"
                    >
                      <UserCheck size={13} className="text-emerald-600" />
                      <span className="hidden sm:inline">All</span> Present
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetAllStatus('Absent')}
                      className="btn-secondary py-1 px-2.5 text-xs flex items-center gap-1"
                      title="Set all to Absent"
                    >
                      <UserX size={13} className="text-rose-600" />
                      <span className="hidden sm:inline">All</span> Absent
                    </button>
                  </div>
                </div>

                {/* Student Filter Search */}
                <div className="relative">
                  <Search
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                    size={16}
                  />
                  <input
                    type="text"
                    placeholder="Search student by name or roll number..."
                    className="input-field pl-9 py-2 text-xs sm:text-sm"
                    value={rosterSearch}
                    onChange={(e) => setRosterSearch(e.target.value)}
                  />
                </div>

                {/* Roster Listing: Responsive Layout */}
                {filteredRoster.length === 0 ? (
                  <p className="text-xs sm:text-sm text-[var(--text-muted)] py-8 text-center">
                    No active students found in this roster.
                  </p>
                ) : (
                  <div>
                    {/* Mobile-Friendly Touch Card View (Shown on screens < md) */}
                    <div className="md:hidden space-y-2.5">
                      {filteredRoster.map((st, idx) => {
                        const currentStatus =
                          activeSessionData.recordsMap[st.studentId]?.status || 'Present';
                        return (
                          <div
                            key={st._id}
                            className="p-3 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] flex flex-col gap-2.5"
                          >
                            <div className="flex items-center justify-between">
                              <div className="min-w-0">
                                <p className="font-semibold text-sm truncate">{st.fullName}</p>
                                <p className="text-xs font-mono text-[var(--text-secondary)]">
                                  #{idx + 1} • {st.studentId}
                                </p>
                              </div>
                              <span
                                className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                                  currentStatus === 'Present'
                                    ? 'bg-emerald-500/15 text-emerald-600'
                                    : currentStatus === 'Absent'
                                    ? 'bg-rose-500/15 text-rose-600'
                                    : currentStatus === 'Leave'
                                    ? 'bg-sky-500/15 text-sky-600'
                                    : 'bg-amber-500/15 text-amber-600'
                                }`}
                              >
                                {currentStatus}
                              </span>
                            </div>

                            {/* Large Touch-Friendly Bubbles for Mobile */}
                            <div className="grid grid-cols-4 gap-1.5 pt-1">
                              {BUBBLE_OPTIONS.map((opt) => {
                                const isSelected = currentStatus === opt.key;
                                return (
                                  <button
                                    key={opt.key}
                                    type="button"
                                    onClick={() =>
                                      handleStudentStatusChange(st.studentId, st.fullName, opt.key)
                                    }
                                    className={`py-2 px-1 rounded-xl text-xs font-bold border transition-all flex flex-col items-center justify-center min-h-[44px] ${
                                      isSelected ? opt.activeClass : opt.inactiveClass
                                    }`}
                                  >
                                    <span className="text-sm font-black">{opt.short}</span>
                                    <span className="text-[10px] opacity-80">{opt.label}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Desktop Table View (Shown on md+ screens) */}
                    <div className="hidden md:block border border-[var(--border)] rounded-xl overflow-hidden">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-[var(--bg-muted)] text-[var(--text-secondary)] text-xs font-semibold uppercase">
                          <tr>
                            <th className="px-4 py-3">#</th>
                            <th className="px-4 py-3">Student Name</th>
                            <th className="px-4 py-3">Roll Number</th>
                            <th className="px-4 py-3 text-right">Attendance Bubble</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border)]">
                          {filteredRoster.map((st, idx) => {
                            const currentStatus =
                              activeSessionData.recordsMap[st.studentId]?.status || 'Present';
                            return (
                              <tr key={st._id} className="hover:bg-[var(--bg-muted)]/40">
                                <td className="px-4 py-3 text-xs text-[var(--text-muted)]">
                                  {idx + 1}
                                </td>
                                <td className="px-4 py-3 font-semibold text-sm">
                                  {st.fullName}
                                </td>
                                <td className="px-4 py-3 text-xs font-mono text-[var(--text-secondary)]">
                                  {st.studentId}
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <div className="inline-flex items-center gap-1.5">
                                    {BUBBLE_OPTIONS.map((opt) => {
                                      const isSelected = currentStatus === opt.key;
                                      return (
                                        <button
                                          key={opt.key}
                                          type="button"
                                          onClick={() =>
                                            handleStudentStatusChange(
                                              st.studentId,
                                              st.fullName,
                                              opt.key
                                            )
                                          }
                                          className={`py-1.5 px-3 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1 ${
                                            isSelected ? opt.activeClass : opt.inactiveClass
                                          }`}
                                          title={`Mark as ${opt.label}`}
                                        >
                                          <span>{opt.short}</span>
                                          <span className="hidden lg:inline">• {opt.label}</span>
                                        </button>
                                      );
                                    })}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Desktop Save Action Buttons */}
                <div className="hidden sm:flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveSessionData(null)}
                    className="btn-secondary text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={savingAttendance || activeSessionData.students.length === 0}
                    onClick={handleSaveBulkAttendance}
                    className="btn-primary text-sm flex items-center gap-2"
                  >
                    <Save size={16} />
                    {savingAttendance
                      ? 'Saving...'
                      : `Save Attendance (${activeSessionCounts.Present} Present, ${activeSessionCounts.Absent} Absent)`}
                  </button>
                </div>

                {/* Sticky Mobile Floating Save Bar */}
                <div className="sm:hidden fixed bottom-3 left-3 right-3 z-40 p-2.5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] shadow-2xl flex items-center justify-between gap-2">
                  <div className="text-xs font-bold pl-1 truncate">
                    <span className="text-emerald-600">{activeSessionCounts.Present}P</span> •{' '}
                    <span className="text-rose-600">{activeSessionCounts.Absent}A</span>
                  </div>
                  <button
                    type="button"
                    disabled={savingAttendance || activeSessionData.students.length === 0}
                    onClick={handleSaveBulkAttendance}
                    className="btn-primary py-2 px-4 text-xs font-bold flex items-center gap-1.5 shrink-0"
                  >
                    <Save size={14} />
                    {savingAttendance ? 'Saving...' : 'Save Attendance'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="mb-6">
                {!showCreate ? (
                  <button
                    onClick={() => setShowCreate(true)}
                    className="btn-primary flex items-center gap-2 text-sm py-2.5 px-5"
                  >
                    <Plus size={18} /> New Lecture Session
                  </button>
                ) : (
                  <form onSubmit={handleCreateSession} className="card p-4 sm:p-6 space-y-4">
                    <div className="flex justify-between items-center">
                      <h2 className="text-base font-bold">Create Lecture Session</h2>
                      <button type="button" onClick={() => setShowCreate(false)}>
                        <X size={18} />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-semibold uppercase mb-1">
                          Lecture Title *
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Lecture 12: Express Middleware & React Deployment"
                          className="input-field text-xs sm:text-sm"
                          value={sessionForm.lectureTitle}
                          onChange={(e) =>
                            setSessionForm({ ...sessionForm, lectureTitle: e.target.value })
                          }
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold uppercase mb-1">Date *</label>
                        <input
                          type="date"
                          className="input-field text-xs sm:text-sm"
                          value={sessionForm.date}
                          onChange={(e) => setSessionForm({ ...sessionForm, date: e.target.value })}
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold uppercase mb-1">Time</label>
                        <input
                          type="text"
                          placeholder="02:00 PM - 04:00 PM"
                          className="input-field text-xs sm:text-sm"
                          value={sessionForm.time}
                          onChange={(e) => setSessionForm({ ...sessionForm, time: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold uppercase mb-1">
                          Campus *
                        </label>
                        <select
                          className="input-field text-xs sm:text-sm"
                          value={sessionForm.campus}
                          onChange={(e) =>
                            setSessionForm({ ...sessionForm, campus: e.target.value })
                          }
                          required
                        >
                          <option value="">Select Campus</option>
                          {meta.campuses.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold uppercase mb-1">
                          Batch *
                        </label>
                        <select
                          className="input-field text-xs sm:text-sm"
                          value={sessionForm.batch}
                          onChange={(e) =>
                            setSessionForm({ ...sessionForm, batch: e.target.value })
                          }
                          required
                        >
                          <option value="">Select Batch</option>
                          {meta.batches.map((b) => (
                            <option key={b} value={b}>
                              {b}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowCreate(false)}
                        className="btn-secondary text-xs sm:text-sm py-2 px-4"
                      >
                        Cancel
                      </button>
                      <button type="submit" className="btn-primary text-xs sm:text-sm py-2 px-4">
                        Load Roster (Default Present)
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* Past Sessions List */}
            <div className="card p-0 overflow-hidden">
              <div className="p-4 sm:p-5 border-b border-[var(--border)] flex justify-between items-center">
                <h2 className="text-sm sm:text-base font-bold">Attendance Sessions</h2>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[var(--accent-subtle)] text-[var(--accent)]">
                  {sessions.length} Sessions
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-[var(--bg-muted)] text-[var(--text-secondary)] text-xs font-semibold uppercase tracking-wider border-b border-[var(--border)]">
                    <tr>
                      <th className="px-4 sm:px-5 py-3.5">Date & Time</th>
                      <th className="px-4 sm:px-5 py-3.5">Lecture Title</th>
                      <th className="px-4 sm:px-5 py-3.5">Campus / Batch</th>
                      <th className="px-4 sm:px-5 py-3.5">Attendance Summary</th>
                      <th className="px-4 sm:px-5 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {sessions.map((s) => (
                      <tr key={s._id} className="hover:bg-[var(--bg-muted)]/40 transition-colors">
                        <td className="px-4 sm:px-5 py-4 text-xs">
                          <p className="font-bold text-sm text-[var(--text-primary)]">
                            {new Date(s.date).toLocaleDateString()}
                          </p>
                          <p className="text-[var(--text-secondary)]">{s.time || '—'}</p>
                        </td>
                        <td className="px-4 sm:px-5 py-4 font-semibold text-xs sm:text-sm">
                          {s.lectureTitle}
                        </td>
                        <td className="px-4 sm:px-5 py-4 text-xs">
                          <p className="font-medium">{s.campus}</p>
                          <p className="text-[var(--text-secondary)]">{s.batch}</p>
                        </td>
                        <td className="px-4 sm:px-5 py-4 text-xs">
                          <div className="flex flex-wrap gap-1.5">
                            <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 font-semibold">
                              P: {s.summary?.Present || 0}
                            </span>
                            <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-600 font-semibold">
                              A: {s.summary?.Absent || 0}
                            </span>
                            <span className="px-2 py-0.5 rounded bg-sky-500/10 text-sky-600 font-semibold">
                              L: {s.summary?.Leave || 0}
                            </span>
                            <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 font-semibold">
                              T: {s.summary?.Late || 0}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 sm:px-5 py-4 text-right">
                          <div className="inline-flex items-center gap-1">
                            <button
                              onClick={() => openSessionForMarking(s._id)}
                              className="btn-secondary py-1.5 px-3 text-xs flex items-center gap-1"
                            >
                              <Edit size={13} />
                              <span className="hidden sm:inline">Mark / Edit</span>
                            </button>
                            <button
                              onClick={() => handleDeleteSession(s._id)}
                              className="p-2 text-[var(--text-secondary)] hover:text-rose-600 rounded-lg"
                              title="Delete Session"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {sessions.length === 0 && !loading && (
                <div className="p-14 text-center">
                  <CalendarCheck className="mx-auto text-[var(--text-muted)] mb-3" size={40} />
                  <p className="font-semibold text-base">No attendance sessions recorded yet</p>
                  <p className="text-xs text-[var(--text-secondary)] mt-1">
                    Click &ldquo;New Lecture Session&rdquo; to take class attendance.
                  </p>
                </div>
              )}
            </div>
          </>
        ) : (
          /* Reports Tab */
          <div className="space-y-6">
            <div className="card p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end">
              <div>
                <label className="block text-xs font-semibold uppercase mb-1">Campus</label>
                <select
                  className="input-field py-2 text-xs sm:text-sm"
                  value={reportFilter.campus}
                  onChange={(e) => setReportFilter({ ...reportFilter, campus: e.target.value })}
                >
                  <option value="">All Campuses</option>
                  {meta.campuses.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase mb-1">Batch</label>
                <select
                  className="input-field py-2 text-xs sm:text-sm"
                  value={reportFilter.batch}
                  onChange={(e) => setReportFilter({ ...reportFilter, batch: e.target.value })}
                >
                  <option value="">All Batches</option>
                  {meta.batches.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase mb-1">From Date</label>
                <input
                  type="date"
                  className="input-field py-2 text-xs sm:text-sm"
                  value={reportFilter.fromDate}
                  onChange={(e) => setReportFilter({ ...reportFilter, fromDate: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase mb-1">To Date</label>
                <input
                  type="date"
                  className="input-field py-2 text-xs sm:text-sm"
                  value={reportFilter.toDate}
                  onChange={(e) => setReportFilter({ ...reportFilter, toDate: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase mb-1">Student</label>
                <input
                  type="text"
                  placeholder="ID or Name"
                  className="input-field py-2 text-xs sm:text-sm"
                  value={reportFilter.studentId}
                  onChange={(e) => setReportFilter({ ...reportFilter, studentId: e.target.value })}
                />
              </div>
              <div className="flex gap-2">
                <button onClick={fetchReport} className="btn-primary py-2 px-4 text-xs sm:text-sm flex-1">
                  Filter
                </button>
                <button
                  onClick={handleExportReportExcel}
                  className="btn-secondary py-2 px-3 text-xs sm:text-sm"
                  title="Export Excel"
                >
                  <Download size={16} />
                </button>
              </div>
            </div>

            <div className="card p-0 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-[var(--bg-muted)] text-[var(--text-secondary)] text-xs font-semibold uppercase border-b border-[var(--border)]">
                    <tr>
                      <th className="px-4 sm:px-5 py-3.5">Student</th>
                      <th className="px-4 sm:px-5 py-3.5">Campus / Batch</th>
                      <th className="px-4 sm:px-5 py-3.5">Lectures Held</th>
                      <th className="px-4 sm:px-5 py-3.5">Present / Late</th>
                      <th className="px-4 sm:px-5 py-3.5">Absent / Leave</th>
                      <th className="px-4 sm:px-5 py-3.5">Attendance %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {(reportData.students || []).map((st) => (
                      <tr key={st.studentId} className="hover:bg-[var(--bg-muted)]/40">
                        <td className="px-4 sm:px-5 py-3.5">
                          <p className="font-semibold text-xs sm:text-sm">{st.fullName}</p>
                          <p className="text-xs font-mono text-[var(--text-secondary)]">
                            {st.studentId}
                          </p>
                        </td>
                        <td className="px-4 sm:px-5 py-3.5 text-xs">
                          <p className="font-medium">{st.campus}</p>
                          <p className="text-[var(--text-secondary)]">{st.batch}</p>
                        </td>
                        <td className="px-4 sm:px-5 py-3.5 font-mono text-xs">{st.totalLectures}</td>
                        <td className="px-4 sm:px-5 py-3.5 text-xs">
                          <span className="text-emerald-600 font-semibold">{st.present} P</span> •{' '}
                          <span className="text-amber-600 font-semibold">{st.late} L</span>
                        </td>
                        <td className="px-4 sm:px-5 py-3.5 text-xs">
                          <span className="text-rose-600 font-semibold">{st.absent} A</span> •{' '}
                          <span className="text-sky-600 font-semibold">{st.leave} Lv</span>
                        </td>
                        <td className="px-4 sm:px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            <div className="w-16 sm:w-20 bg-[var(--bg-muted)] h-1.5 rounded-full overflow-hidden">
                              <div
                                className={`h-full ${
                                  st.percentage >= 75
                                    ? 'bg-emerald-500'
                                    : st.percentage >= 50
                                    ? 'bg-amber-500'
                                    : 'bg-rose-500'
                                }`}
                                style={{ width: `${Math.min(100, st.percentage)}%` }}
                              />
                            </div>
                            <span className="text-xs font-bold">{st.percentage}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {(!reportData.students || reportData.students.length === 0) && !loadingReport && (
                <div className="p-14 text-center">
                  <Users className="mx-auto text-[var(--text-muted)] mb-3" size={40} />
                  <p className="text-sm text-[var(--text-secondary)]">
                    No student attendance records match the selected filters.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default ManageAttendancePage;
