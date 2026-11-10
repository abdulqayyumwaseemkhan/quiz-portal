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
} from 'lucide-react';
import toast from 'react-hot-toast';

const STATUS_OPTIONS = ['Present', 'Absent', 'Late', 'Leave'];

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
      (data.students || []).forEach((st) => {
        recordsMap[st.studentId] = {
          studentId: st.studentId,
          studentName: st.fullName,
          status: 'Present',
          remarks: '',
        };
      });
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
      toast.success('Session created. Mark attendance below and click Save.');
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

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      <Navbar />
      <main className="flex-1 lg:ml-64 p-4 sm:p-6 lg:p-8">
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Lecture Attendance</h1>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              Mark class attendance in bulk and generate campus/batch attendance reports
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
              <div className="card p-6 mb-6 space-y-5">
                <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-[var(--border)]">
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">
                      Marking Attendance
                    </span>
                    <h2 className="text-xl font-bold mt-0.5">
                      {activeSessionData.session.lectureTitle}
                    </h2>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                      {activeSessionData.session.campus} • {activeSessionData.session.batch} •{' '}
                      {new Date(activeSessionData.session.date).toLocaleDateString()}{' '}
                      {activeSessionData.session.time ? `(${activeSessionData.session.time})` : ''}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleSetAllStatus('Present')}
                      className="btn-secondary py-1.5 px-3 text-xs flex items-center gap-1.5"
                    >
                      <CheckCircle2 size={14} className="text-emerald-600" /> Mark All Present
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetAllStatus('Absent')}
                      className="btn-secondary py-1.5 px-3 text-xs"
                    >
                      Mark All Absent
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveSessionData(null)}
                      className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    >
                      <X size={18} />
                    </button>
                  </div>
                </div>

                <div className="relative max-w-md">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={16} />
                  <input
                    type="text"
                    placeholder="Filter student in this session..."
                    className="input-field pl-9 py-2 text-sm"
                    value={rosterSearch}
                    onChange={(e) => setRosterSearch(e.target.value)}
                  />
                </div>

                {filteredRoster.length === 0 ? (
                  <p className="text-sm text-[var(--text-muted)] py-8 text-center">
                    No active students found in {activeSessionData.session.campus} /{' '}
                    {activeSessionData.session.batch}.
                  </p>
                ) : (
                  <div className="border border-[var(--border)] rounded-xl overflow-hidden">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-[var(--bg-muted)] text-[var(--text-secondary)] text-xs font-semibold uppercase">
                        <tr>
                          <th className="px-4 py-3">#</th>
                          <th className="px-4 py-3">Student</th>
                          <th className="px-4 py-3 text-right">Status</th>
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
                              <td className="px-4 py-3">
                                <p className="font-semibold text-sm">{st.fullName}</p>
                                <p className="text-xs font-mono text-[var(--text-secondary)]">
                                  {st.studentId}
                                </p>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <div className="inline-flex flex-wrap justify-end gap-1.5">
                                  {STATUS_OPTIONS.map((status) => {
                                    const isSelected = currentStatus === status;
                                    const activeStyles =
                                      status === 'Present'
                                        ? 'bg-emerald-600 text-white border-emerald-600'
                                        : status === 'Absent'
                                        ? 'bg-rose-600 text-white border-rose-600'
                                        : status === 'Late'
                                        ? 'bg-amber-500 text-white border-amber-500'
                                        : 'bg-sky-600 text-white border-sky-600';

                                    return (
                                      <button
                                        key={status}
                                        type="button"
                                        onClick={() =>
                                          handleStudentStatusChange(
                                            st.studentId,
                                            st.fullName,
                                            status
                                          )
                                        }
                                        className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all ${
                                          isSelected
                                            ? activeStyles
                                            : 'border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-muted)]'
                                        }`}
                                      >
                                        {status}
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
                )}

                <div className="flex justify-end gap-3 pt-2">
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
                  <form onSubmit={handleCreateSession} className="card p-6 space-y-4">
                    <div className="flex justify-between items-center">
                      <h2 className="text-base font-bold">Create Lecture Session</h2>
                      <button type="button" onClick={() => setShowCreate(false)}>
                        <X size={18} />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                      <div className="lg:col-span-2">
                        <label className="block text-xs font-semibold uppercase mb-1">
                          Lecture Title *
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Lecture 12: Express Middleware & JWT"
                          className="input-field"
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
                          className="input-field"
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
                          className="input-field"
                          value={sessionForm.time}
                          onChange={(e) => setSessionForm({ ...sessionForm, time: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold uppercase mb-1">
                          Campus *
                        </label>
                        <select
                          className="input-field"
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
                          className="input-field"
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
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setShowCreate(false)}
                        className="btn-secondary text-sm"
                      >
                        Cancel
                      </button>
                      <button type="submit" className="btn-primary text-sm">
                        Load Student Roster & Mark Attendance
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* Past Sessions Table */}
            <div className="card p-0 overflow-hidden">
              <div className="p-5 border-b border-[var(--border)] flex justify-between items-center">
                <h2 className="text-base font-bold">Attendance Sessions</h2>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[var(--accent-subtle)] text-[var(--accent)]">
                  {sessions.length} Sessions
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-[var(--bg-muted)] text-[var(--text-secondary)] text-xs font-semibold uppercase tracking-wider border-b border-[var(--border)]">
                    <tr>
                      <th className="px-5 py-3.5">Date & Time</th>
                      <th className="px-5 py-3.5">Lecture Title</th>
                      <th className="px-5 py-3.5">Campus / Batch</th>
                      <th className="px-5 py-3.5">Attendance Summary</th>
                      <th className="px-5 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {sessions.map((s) => (
                      <tr key={s._id} className="hover:bg-[var(--bg-muted)]/40 transition-colors">
                        <td className="px-5 py-4 text-xs">
                          <p className="font-bold text-sm text-[var(--text-primary)]">
                            {new Date(s.date).toLocaleDateString()}
                          </p>
                          <p className="text-[var(--text-secondary)]">{s.time || '—'}</p>
                        </td>
                        <td className="px-5 py-4 font-semibold">{s.lectureTitle}</td>
                        <td className="px-5 py-4 text-xs">
                          <p className="font-medium">{s.campus}</p>
                          <p className="text-[var(--text-secondary)]">{s.batch}</p>
                        </td>
                        <td className="px-5 py-4 text-xs">
                          <div className="flex flex-wrap gap-2">
                            <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 font-semibold">
                              P: {s.summary?.Present || 0}
                            </span>
                            <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-600 font-semibold">
                              A: {s.summary?.Absent || 0}
                            </span>
                            <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 font-semibold">
                              L: {s.summary?.Late || 0}
                            </span>
                            <span className="px-2 py-0.5 rounded bg-sky-500/10 text-sky-600 font-semibold">
                              Lv: {s.summary?.Leave || 0}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="inline-flex items-center gap-1">
                            <button
                              onClick={() => openSessionForMarking(s._id)}
                              className="btn-secondary py-1.5 px-3 text-xs flex items-center gap-1"
                            >
                              <Edit size={13} /> Mark / Edit
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
            <div className="card p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end">
              <div>
                <label className="block text-xs font-semibold uppercase mb-1">Campus</label>
                <select
                  className="input-field py-2 text-sm"
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
                  className="input-field py-2 text-sm"
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
                  className="input-field py-2 text-sm"
                  value={reportFilter.fromDate}
                  onChange={(e) => setReportFilter({ ...reportFilter, fromDate: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase mb-1">To Date</label>
                <input
                  type="date"
                  className="input-field py-2 text-sm"
                  value={reportFilter.toDate}
                  onChange={(e) => setReportFilter({ ...reportFilter, toDate: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase mb-1">Student</label>
                <input
                  type="text"
                  placeholder="ID or Name"
                  className="input-field py-2 text-sm"
                  value={reportFilter.studentId}
                  onChange={(e) => setReportFilter({ ...reportFilter, studentId: e.target.value })}
                />
              </div>
              <div className="flex gap-2">
                <button onClick={fetchReport} className="btn-primary py-2 px-4 text-sm flex-1">
                  Filter
                </button>
                <button
                  onClick={handleExportReportExcel}
                  className="btn-secondary py-2 px-3 text-sm"
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
                      <th className="px-5 py-3.5">Student</th>
                      <th className="px-5 py-3.5">Campus / Batch</th>
                      <th className="px-5 py-3.5">Lectures Held</th>
                      <th className="px-5 py-3.5">Present / Late</th>
                      <th className="px-5 py-3.5">Absent / Leave</th>
                      <th className="px-5 py-3.5">Attendance %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {(reportData.students || []).map((st) => (
                      <tr key={st.studentId} className="hover:bg-[var(--bg-muted)]/40">
                        <td className="px-5 py-3.5">
                          <p className="font-semibold">{st.fullName}</p>
                          <p className="text-xs font-mono text-[var(--text-secondary)]">
                            {st.studentId}
                          </p>
                        </td>
                        <td className="px-5 py-3.5 text-xs">
                          <p className="font-medium">{st.campus}</p>
                          <p className="text-[var(--text-secondary)]">{st.batch}</p>
                        </td>
                        <td className="px-5 py-3.5 font-mono text-xs">{st.totalLectures}</td>
                        <td className="px-5 py-3.5 text-xs">
                          <span className="text-emerald-600 font-semibold">{st.present} P</span> •{' '}
                          <span className="text-amber-600 font-semibold">{st.late} L</span>
                        </td>
                        <td className="px-5 py-3.5 text-xs">
                          <span className="text-rose-600 font-semibold">{st.absent} A</span> •{' '}
                          <span className="text-sky-600 font-semibold">{st.leave} Lv</span>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            <div className="w-20 bg-[var(--bg-muted)] h-1.5 rounded-full overflow-hidden">
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
