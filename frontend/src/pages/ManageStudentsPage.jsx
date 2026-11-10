import React, { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import API from '../api';
import Navbar from '../components/AdminNavbar';
import {
  UserPlus,
  Trash2,
  Users,
  Search,
  Download,
  Upload,
  Mail,
  KeyRound,
  Edit,
  CheckCircle2,
  AlertCircle,
  Copy,
  RefreshCw,
  X,
  FileSpreadsheet,
  Power,
  Eye,
  EyeOff,
} from 'lucide-react';
import toast from 'react-hot-toast';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const COLUMN_ALIASES = {
  fullName: ['name', 'full name', 'fullname', 'student name', 'student_name'],
  studentId: ['student id', 'studentid', 'student_id', 'id', 'roll no', 'roll number', 'registration id'],
  email: ['email', 'email address', 'e-mail', 'mail', 'student email'],
  campus: ['campus', 'campus name', 'branch', 'center'],
  batch: ['batch', 'batch name', 'cohort', 'section', 'group'],
  contact: ['contact', 'phone', 'mobile', 'phone number', 'contact number', 'whatsapp'],
  password: ['password', 'pass', 'student password', 'initial password'],
};

function autoMapColumns(headers) {
  const mapping = {
    fullName: '',
    studentId: '',
    email: '',
    campus: '',
    batch: '',
    contact: '',
    password: '',
  };

  headers.forEach((h) => {
    const clean = String(h || '').trim().toLowerCase();
    for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
      if (!mapping[field] && aliases.includes(clean)) {
        mapping[field] = h;
      }
    }
  });

  headers.forEach((h) => {
    const clean = String(h || '').trim().toLowerCase();
    if (!mapping.studentId && clean.includes('id')) mapping.studentId = h;
    if (!mapping.fullName && clean.includes('name')) mapping.fullName = h;
    if (!mapping.email && clean.includes('mail')) mapping.email = h;
    if (!mapping.campus && clean.includes('campus')) mapping.campus = h;
    if (!mapping.batch && clean.includes('batch')) mapping.batch = h;
    if (!mapping.contact && (clean.includes('contact') || clean.includes('phone') || clean.includes('mobile'))) {
      mapping.contact = h;
    }
    if (!mapping.password && clean.includes('pass')) mapping.password = h;
  });

  return mapping;
}

const ManageStudentsPage = () => {
  const [students, setStudents] = useState([]);
  const [meta, setMeta] = useState({ campuses: [], batches: [], existingStudentIds: [] });
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCampus, setFilterCampus] = useState('');
  const [filterBatch, setFilterBatch] = useState('');
  const [filterEmailStatus, setFilterEmailStatus] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Password visibility controls
  const [showAllPasswords, setShowAllPasswords] = useState(false);
  const [visiblePasswords, setVisiblePasswords] = useState({});

  // Selection & credentials map
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [credentialsMap, setCredentialsMap] = useState({});
  const [credentialsModal, setCredentialsModal] = useState(null);

  // Single student form
  const [showAdd, setShowAdd] = useState(false);
  const [formData, setFormData] = useState({
    studentId: '',
    fullName: '',
    email: '',
    campus: '',
    batch: '',
    contact: '',
    password: '',
  });

  // Edit modal
  const [editingStudent, setEditingStudent] = useState(null);

  // Dedicated Set / Change Password modal for a single student
  const [passwordModalStudent, setPasswordModalStudent] = useState(null);
  const [customPasswordInput, setCustomPasswordInput] = useState('');
  const [requireChangeOnLogin, setRequireChangeOnLogin] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  // Bulk import state
  const [showImportModal, setShowImportModal] = useState(false);
  const [rawSheetRows, setRawSheetRows] = useState([]);
  const [sheetHeaders, setSheetHeaders] = useState([]);
  const [columnMap, setColumnMap] = useState({
    fullName: '',
    studentId: '',
    email: '',
    campus: '',
    batch: '',
    contact: '',
    password: '',
  });
  const [strictCampusCheck, setStrictCampusCheck] = useState(false);
  const [importing, setImporting] = useState(false);

  // Bulk email progress state
  const [emailProgress, setEmailProgress] = useState(null);

  useEffect(() => {
    fetchStudents();
    fetchMeta();
  }, []);

  const fetchMeta = async () => {
    try {
      const { data } = await API.get('/admin/students/meta');
      setMeta({
        campuses: data.campuses || [],
        batches: data.batches || [],
        existingStudentIds: data.existingStudentIds || [],
      });
    } catch (error) {
      console.error(error);
    }
  };

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const { data } = await API.get('/admin/students');
      setStudents(data);
    } catch {
      toast.error('Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  // Filtered students
  const filteredStudents = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return students.filter((s) => {
      const matchSearch =
        !q ||
        s.fullName?.toLowerCase().includes(q) ||
        s.studentId?.toLowerCase().includes(q) ||
        s.email?.toLowerCase().includes(q) ||
        s.contact?.toLowerCase().includes(q);
      const matchCampus = filterCampus ? s.campus === filterCampus : true;
      const matchBatch = filterBatch ? s.batch === filterBatch : true;
      const matchEmail = filterEmailStatus ? (s.emailStatus || 'pending') === filterEmailStatus : true;
      const matchActive =
        filterStatus === ''
          ? true
          : filterStatus === 'active'
          ? s.isActive !== false
          : s.isActive === false;
      return matchSearch && matchCampus && matchBatch && matchEmail && matchActive;
    });
  }, [students, searchTerm, filterCampus, filterBatch, filterEmailStatus, filterStatus]);

  // Add single student
  const handleAddStudent = async (e) => {
    e.preventDefault();
    try {
      const { data } = await API.post('/admin/students', formData);
      setStudents([data, ...students]);
      if (data.generatedPassword) {
        setCredentialsMap((prev) => ({ ...prev, [data.studentId]: data.generatedPassword }));
        setCredentialsModal({
          title: 'Student Created — Credentials',
          items: [
            {
              _id: data._id,
              studentId: data.studentId,
              fullName: data.fullName,
              email: data.email,
              campus: data.campus,
              batch: data.batch,
              generatedPassword: data.generatedPassword,
            },
          ],
        });
      }
      setFormData({
        studentId: '',
        fullName: '',
        email: '',
        campus: '',
        batch: '',
        contact: '',
        password: '',
      });
      fetchMeta();
      setShowAdd(false);
      toast.success('Student registered');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to add student');
    }
  };

  // Edit student (also supports updating password directly)
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingStudent) return;
    try {
      const { data } = await API.put(`/admin/students/${editingStudent._id}`, editingStudent);
      setStudents(students.map((s) => (s._id === data._id ? data : s)));
      if (data.plainPassword) {
        setCredentialsMap((prev) => ({ ...prev, [data.studentId]: data.plainPassword }));
      }
      setEditingStudent(null);
      fetchMeta();
      toast.success('Student updated');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update student');
    }
  };

  // Toggle active status
  const handleToggleActive = async (student) => {
    const nextActive = student.isActive === false ? true : false;
    try {
      const { data } = await API.put(`/admin/students/${student._id}`, { isActive: nextActive });
      setStudents(students.map((s) => (s._id === data._id ? data : s)));
      toast.success(nextActive ? 'Student activated' : 'Student deactivated');
    } catch {
      toast.error('Failed to update status');
    }
  };

  // Delete student
  const handleDelete = async (id) => {
    if (!window.confirm('Remove this student permanently?')) return;
    try {
      await API.delete(`/admin/students/${id}`);
      setStudents(students.filter((s) => s._id !== id));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      toast.success('Student removed');
    } catch {
      toast.error('Delete failed');
    }
  };

  // Open Set / Reset Password Modal for a student
  const openPasswordModal = (student) => {
    const existingPass = student.plainPassword || credentialsMap[student.studentId] || '';
    setPasswordModalStudent(student);
    setCustomPasswordInput(existingPass);
    setRequireChangeOnLogin(false);
  };

  // Save custom or auto-generated password for a student
  const handleSaveStudentPassword = async (mode = 'custom') => {
    if (!passwordModalStudent) return;
    const payload =
      mode === 'auto'
        ? { password: '', mustChangePassword: true }
        : { password: customPasswordInput.trim(), mustChangePassword: requireChangeOnLogin };

    if (mode === 'custom' && payload.password.length < 4) {
      return toast.error('Password must be at least 4 characters (or click Auto-Generate)');
    }

    setSavingPassword(true);
    try {
      const { data } = await API.post(
        `/admin/students/${passwordModalStudent._id}/reset-password`,
        payload
      );
      setCredentialsMap((prev) => ({ ...prev, [data.studentId]: data.generatedPassword }));
      setStudents((prev) =>
        prev.map((s) =>
          s._id === passwordModalStudent._id
            ? {
                ...s,
                plainPassword: data.generatedPassword,
                emailStatus: 'pending',
                mustChangePassword: payload.mustChangePassword,
              }
            : s
        )
      );
      setVisiblePasswords((prev) => ({ ...prev, [passwordModalStudent._id]: true }));
      setPasswordModalStudent(null);
      toast.success(`Password updated: ${data.generatedPassword}`);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update password');
    } finally {
      setSavingPassword(false);
    }
  };

  // Bulk regenerate passwords
  const handleBulkRegeneratePasswords = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return toast.error('Select students first');
    if (!window.confirm(`Regenerate passwords for ${ids.length} selected student(s)?`)) return;

    try {
      const { data } = await API.post('/admin/students/bulk-regenerate-passwords', {
        studentIds: ids,
      });
      const newMap = { ...credentialsMap };
      const byId = new Map();
      data.credentials.forEach((c) => {
        newMap[c.studentId] = c.generatedPassword;
        byId.set(c._id, c.generatedPassword);
      });
      setCredentialsMap(newMap);
      setStudents((prev) =>
        prev.map((s) =>
          selectedIds.has(s._id)
            ? {
                ...s,
                plainPassword: byId.get(s._id) || s.plainPassword,
                emailStatus: 'pending',
                mustChangePassword: true,
              }
            : s
        )
      );
      setCredentialsModal({
        title: `Generated Passwords (${data.updatedCount} Students)`,
        items: data.credentials,
      });
      toast.success(`Regenerated ${data.updatedCount} passwords`);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Bulk password regeneration failed');
    }
  };

  // Chunked bulk email sender
  const handleSendCredentialsEmails = async (targetStudentIds) => {
    const ids = targetStudentIds || Array.from(selectedIds);
    if (ids.length === 0) return toast.error('Select students to email');

    const CHUNK_SIZE = 20;
    const total = ids.length;
    let processed = 0;
    let sent = 0;
    let failed = 0;

    setEmailProgress({ total, processed: 0, sent: 0, failed: 0, running: true });

    const statusUpdates = new Map();

    for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
      const chunk = ids.slice(i, i + CHUNK_SIZE);
      try {
        const { data } = await API.post('/admin/students/send-credentials', {
          studentIds: chunk,
          credentialsMap,
          loginUrl: window.location.origin,
        });
        processed += chunk.length;
        sent += data.sentCount || 0;
        failed += data.failedCount || 0;
        (data.results || []).forEach((r) => {
          statusUpdates.set(r._id, r);
        });
      } catch (error) {
        processed += chunk.length;
        failed += chunk.length;
        const msg = error.response?.data?.message || 'Request failed';
        chunk.forEach((id) => {
          statusUpdates.set(id, { _id: id, emailStatus: 'failed', emailError: msg });
        });
      }

      setEmailProgress({
        total,
        processed: Math.min(processed, total),
        sent,
        failed,
        running: processed < total,
      });
    }

    setStudents((prev) =>
      prev.map((s) => {
        const u = statusUpdates.get(s._id);
        return u
          ? {
              ...s,
              plainPassword: u.plainPassword || s.plainPassword,
              emailStatus: u.emailStatus,
              emailSentAt: u.emailSentAt || s.emailSentAt,
              emailError: u.emailError || '',
            }
          : s;
      })
    );

    if (failed === 0) {
      toast.success(`Sent credentials to ${sent} student(s)`);
    } else {
      toast.error(`Sent: ${sent}, Failed: ${failed}. You can retry failed emails.`);
    }
  };

  // Download template Excel file
  const handleDownloadTemplate = () => {
    const sampleRows = [
      {
        Name: 'Ali Raza',
        'Student ID': 'BQ-WD-001',
        Email: 'ali.raza@example.com',
        Campus: meta.campuses[0] || 'Main Campus',
        Batch: meta.batches[0] || 'Batch 2025',
        Contact: '0300-1234567',
        Password: '',
      },
      {
        Name: 'Fatima Khan',
        'Student ID': 'BQ-WD-002',
        Email: 'fatima.khan@example.com',
        Campus: meta.campuses[0] || 'Main Campus',
        Batch: meta.batches[0] || 'Batch 2025',
        Contact: '0321-7654321',
        Password: '',
      },
    ];
    const ws = XLSX.utils.json_to_sheet(sampleRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Students');
    XLSX.writeFile(wb, 'student_import_template.xlsx');
  };

  // Parse uploaded Excel/CSV file on client
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(sheet, { defval: '' });

        if (!json.length) {
          toast.error('The uploaded file is empty');
          return;
        }

        const headers = Object.keys(json[0]);
        setSheetHeaders(headers);
        setRawSheetRows(json);
        setColumnMap(autoMapColumns(headers));
      } catch {
        toast.error('Could not parse file. Please upload a valid .xlsx or .csv file');
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  // Build validated preview rows
  const previewRows = useMemo(() => {
    if (!rawSheetRows.length) return [];

    const existingIdSet = new Set(
      students.map((s) => String(s.studentId || '').trim().toLowerCase())
    );
    const knownCampuses = new Set(meta.campuses.map((c) => c.toLowerCase()));
    const knownBatches = new Set(meta.batches.map((b) => b.toLowerCase()));
    const seenInFile = new Set();

    return rawSheetRows.map((row, idx) => {
      const fullName = String(row[columnMap.fullName] ?? '').trim();
      const studentId = String(row[columnMap.studentId] ?? '').trim();
      const email = String(row[columnMap.email] ?? '').trim().toLowerCase();
      const campus = String(row[columnMap.campus] ?? '').trim();
      const batch = String(row[columnMap.batch] ?? '').trim();
      const contact = String(row[columnMap.contact] ?? '').trim();
      const password = columnMap.password ? String(row[columnMap.password] ?? '').trim() : '';

      const issues = [];
      const warnings = [];

      if (!fullName) issues.push('Missing Name');
      if (!studentId) issues.push('Missing Student ID');
      if (!campus) issues.push('Missing Campus');
      if (!batch) issues.push('Missing Batch');
      if (!email) {
        warnings.push('No email (cannot send email credentials)');
      } else if (!EMAIL_REGEX.test(email)) {
        issues.push('Invalid email');
      }

      const idLower = studentId.toLowerCase();
      if (studentId) {
        if (existingIdSet.has(idLower)) {
          issues.push('Duplicate ID (already in database)');
        } else if (seenInFile.has(idLower)) {
          issues.push('Duplicate ID (repeated in file)');
        }
        seenInFile.add(idLower);
      }

      if (campus && knownCampuses.size > 0 && !knownCampuses.has(campus.toLowerCase())) {
        if (strictCampusCheck) {
          issues.push(`Unknown campus "${campus}"`);
        } else {
          warnings.push(`New campus "${campus}"`);
        }
      }

      if (batch && knownBatches.size > 0 && !knownBatches.has(batch.toLowerCase())) {
        if (strictCampusCheck) {
          issues.push(`Unknown batch "${batch}"`);
        } else {
          warnings.push(`New batch "${batch}"`);
        }
      }

      return {
        rowNumber: idx + 1,
        fullName,
        studentId,
        email,
        campus,
        batch,
        contact,
        password,
        issues,
        warnings,
        isValid: issues.length === 0,
      };
    });
  }, [rawSheetRows, columnMap, students, meta.campuses, meta.batches, strictCampusCheck]);

  const validPreviewRows = useMemo(() => previewRows.filter((r) => r.isValid), [previewRows]);

  const handleConfirmBulkImport = async () => {
    if (validPreviewRows.length === 0) {
      return toast.error('No valid rows to import');
    }

    setImporting(true);
    try {
      const payload = validPreviewRows.map((r) => ({
        fullName: r.fullName,
        studentId: r.studentId,
        email: r.email,
        campus: r.campus,
        batch: r.batch,
        contact: r.contact,
        password: r.password,
      }));

      const { data } = await API.post('/admin/students/bulk', { students: payload });
      const newStudents = data.students || [];

      const newMap = { ...credentialsMap };
      newStudents.forEach((s) => {
        if (s.generatedPassword) {
          newMap[s.studentId] = s.generatedPassword;
        }
      });
      setCredentialsMap(newMap);
      setStudents((prev) => [...newStudents, ...prev]);
      fetchMeta();
      setShowImportModal(false);
      setRawSheetRows([]);

      setCredentialsModal({
        title: `Imported ${data.insertedCount} Students — Credentials`,
        items: newStudents,
      });

      toast.success(`Imported ${data.insertedCount} students`);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Bulk import failed');
    } finally {
      setImporting(false);
    }
  };

  // Export students list to Excel (includes Password)
  const handleExportStudentsExcel = () => {
    if (filteredStudents.length === 0) return toast.error('No students to export');
    const rows = filteredStudents.map((s) => ({
      'Student ID': s.studentId,
      'Full Name': s.fullName,
      Password: s.plainPassword || credentialsMap[s.studentId] || '',
      Email: s.email || '',
      Contact: s.contact || '',
      Campus: s.campus || '',
      Batch: s.batch || '',
      Status: s.isActive === false ? 'Deactivated' : 'Active',
      'Email Status': s.emailStatus || 'pending',
      'Registered Date': s.createdAt ? new Date(s.createdAt).toLocaleDateString() : '',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Students');
    XLSX.writeFile(wb, 'students_directory.xlsx');
  };

  // Export credentials modal to Excel
  const handleExportCredentialsExcel = (items) => {
    const rows = items.map((item) => ({
      'Student ID': item.studentId,
      'Full Name': item.fullName,
      Email: item.email || '',
      Campus: item.campus || '',
      Batch: item.batch || '',
      Password: item.generatedPassword || item.plainPassword || '',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Credentials');
    XLSX.writeFile(wb, `student_credentials_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // Selection helpers
  const toggleSelectAllFiltered = () => {
    const filteredIds = filteredStudents.map((s) => s._id);
    const allSelected = filteredIds.length > 0 && filteredIds.every((id) => selectedIds.has(id));
    if (allSelected) {
      const next = new Set(selectedIds);
      filteredIds.forEach((id) => next.delete(id));
      setSelectedIds(next);
    } else {
      const next = new Set(selectedIds);
      filteredIds.forEach((id) => next.add(id));
      setSelectedIds(next);
    }
  };

  const toggleSelectOne = (id) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const failedStudentIds = useMemo(
    () => filteredStudents.filter((s) => s.emailStatus === 'failed').map((s) => s._id),
    [filteredStudents]
  );

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <Navbar />
      <main className="flex-1 lg:ml-64 p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Students Directory</h1>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              Manage enrollments, bulk import via Excel/CSV, view or set custom passwords, and send credentials
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <button onClick={handleDownloadTemplate} className="btn-secondary flex items-center gap-2 text-xs sm:text-sm">
              <FileSpreadsheet size={16} /> Template
            </button>
            <button
              onClick={() => setShowImportModal(true)}
              className="btn-secondary flex items-center gap-2 text-xs sm:text-sm"
            >
              <Upload size={16} /> Bulk Import
            </button>
            <button onClick={handleExportStudentsExcel} className="btn-secondary flex items-center gap-2 text-xs sm:text-sm">
              <Download size={16} /> Export
            </button>
            <button
              onClick={() => setShowAdd(!showAdd)}
              className="btn-primary flex items-center gap-2 text-xs sm:text-sm"
            >
              <UserPlus size={16} /> {showAdd ? 'Close Form' : 'Add Student'}
            </button>
          </div>
        </header>

        {/* Single Student Registration Form */}
        {showAdd && (
          <form onSubmit={handleAddStudent} className="card p-6 mb-6">
            <h2 className="text-base font-bold mb-4">Register Individual Student</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1">
                  Student ID *
                </label>
                <input
                  type="text"
                  placeholder="e.g. BQ-WD-101"
                  className="input-field font-mono"
                  value={formData.studentId}
                  onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Ahmed Khan"
                  className="input-field"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="student@example.com"
                  className="input-field"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1">
                  Campus *
                </label>
                <input
                  type="text"
                  list="campus-list"
                  placeholder="Select or type campus"
                  className="input-field"
                  value={formData.campus}
                  onChange={(e) => setFormData({ ...formData, campus: e.target.value })}
                  required
                />
                <datalist id="campus-list">
                  {meta.campuses.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1">
                  Batch *
                </label>
                <input
                  type="text"
                  list="batch-list"
                  placeholder="Select or type batch"
                  className="input-field"
                  value={formData.batch}
                  onChange={(e) => setFormData({ ...formData, batch: e.target.value })}
                  required
                />
                <datalist id="batch-list">
                  {meta.batches.map((b) => (
                    <option key={b} value={b} />
                  ))}
                </datalist>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1">
                  Contact Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. 0300-1234567"
                  className="input-field"
                  value={formData.contact}
                  onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                />
              </div>
              <div className="sm:col-span-2 lg:col-span-3">
                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1">
                  Student Password (Optional — Leave blank to auto-generate)
                </label>
                <input
                  type="text"
                  placeholder="Leave empty for random auto-generated password, or type a custom password..."
                  className="input-field font-mono"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-3">
              <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary text-sm">
                Cancel
              </button>
              <button type="submit" className="btn-primary text-sm">
                {formData.password.trim() ? 'Create with Custom Password' : 'Create & Auto-Generate Password'}
              </button>
            </div>
          </form>
        )}

        {/* Email Progress Bar Banner */}
        {emailProgress && (
          <div className="card p-4 mb-6 border-l-4 border-l-[var(--accent)]">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <div className="text-sm font-semibold">
                {emailProgress.running
                  ? `Sending credentials in chunks (${emailProgress.processed} / ${emailProgress.total})...`
                  : `Email Dispatch Complete (${emailProgress.sent} sent, ${emailProgress.failed} failed)`}
              </div>
              <div className="flex items-center gap-2">
                {!emailProgress.running && failedStudentIds.length > 0 && (
                  <button
                    onClick={() => handleSendCredentialsEmails(failedStudentIds)}
                    className="btn-secondary py-1 px-3 text-xs flex items-center gap-1"
                  >
                    <RefreshCw size={13} /> Retry Failed ({failedStudentIds.length})
                  </button>
                )}
                {!emailProgress.running && (
                  <button
                    onClick={() => setEmailProgress(null)}
                    className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  >
                    Dismiss
                  </button>
                )}
              </div>
            </div>
            <div className="w-full h-2 bg-[var(--bg-muted)] rounded-full overflow-hidden">
              <div
                className="h-full bg-[var(--accent)] transition-all duration-300"
                style={{
                  width: `${emailProgress.total ? Math.round((emailProgress.processed / emailProgress.total) * 100) : 0}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* Filters & Bulk Actions Bar */}
        <div className="card p-4 mb-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="relative lg:col-span-2">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={16} />
              <input
                type="text"
                placeholder="Search name, ID, email, or phone..."
                className="input-field pl-9 py-2 text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <select
              className="input-field py-2 text-sm"
              value={filterCampus}
              onChange={(e) => setFilterCampus(e.target.value)}
            >
              <option value="">All Campuses</option>
              {meta.campuses.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <select
              className="input-field py-2 text-sm"
              value={filterBatch}
              onChange={(e) => setFilterBatch(e.target.value)}
            >
              <option value="">All Batches</option>
              {meta.batches.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <select
                className="input-field py-2 text-xs"
                value={filterEmailStatus}
                onChange={(e) => setFilterEmailStatus(e.target.value)}
              >
                <option value="">Email: All</option>
                <option value="pending">Pending</option>
                <option value="sent">Sent</option>
                <option value="failed">Failed</option>
              </select>
              <select
                className="input-field py-2 text-xs"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="">Status: All</option>
                <option value="active">Active</option>
                <option value="inactive">Deactivated</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[var(--border)]">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <button type="button" onClick={toggleSelectAllFiltered} className="btn-secondary py-1.5 px-3 text-xs">
                {filteredStudents.length > 0 && filteredStudents.every((s) => selectedIds.has(s._id))
                  ? 'Deselect Filtered'
                  : `Select Filtered (${filteredStudents.length})`}
              </button>
              <button
                type="button"
                onClick={() => setShowAllPasswords(!showAllPasswords)}
                className="btn-secondary py-1.5 px-3 text-xs flex items-center gap-1.5"
              >
                {showAllPasswords ? <EyeOff size={14} /> : <Eye size={14} />}
                {showAllPasswords ? 'Hide Passwords' : 'Show All Passwords'}
              </button>
              {selectedIds.size > 0 && (
                <span className="font-semibold text-[var(--text-primary)] px-2">
                  {selectedIds.size} selected
                </span>
              )}
              {failedStudentIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedIds(new Set(failedStudentIds))}
                  className="text-xs text-rose-500 hover:underline font-medium px-2"
                >
                  Select Failed Emails ({failedStudentIds.length})
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={selectedIds.size === 0}
                onClick={handleBulkRegeneratePasswords}
                className="btn-secondary py-1.5 px-3 text-xs flex items-center gap-1.5 disabled:opacity-40"
              >
                <KeyRound size={14} /> Regenerate Passwords
              </button>
              <button
                type="button"
                disabled={selectedIds.size === 0 || emailProgress?.running}
                onClick={() => handleSendCredentialsEmails()}
                className="btn-primary py-1.5 px-3.5 text-xs flex items-center gap-1.5 disabled:opacity-40"
              >
                <Mail size={14} /> Send Credentials ({selectedIds.size})
              </button>
            </div>
          </div>
        </div>

        {/* Desktop Table & Mobile Cards */}
        <div className="card overflow-hidden p-0">
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[var(--bg-muted)] text-[var(--text-secondary)] text-xs font-semibold uppercase tracking-wider border-b border-[var(--border)]">
                <tr>
                  <th className="px-4 py-3.5 w-10">
                    <input
                      type="checkbox"
                      checked={
                        filteredStudents.length > 0 &&
                        filteredStudents.every((s) => selectedIds.has(s._id))
                      }
                      onChange={toggleSelectAllFiltered}
                      className="rounded"
                    />
                  </th>
                  <th className="px-4 py-3.5">Student</th>
                  <th className="px-4 py-3.5">Password</th>
                  <th className="px-4 py-3.5">Campus / Batch</th>
                  <th className="px-4 py-3.5">Contact</th>
                  <th className="px-4 py-3.5">Email Status</th>
                  <th className="px-4 py-3.5">Account</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {filteredStudents.map((student) => {
                  const pw = student.plainPassword || credentialsMap[student.studentId] || '';
                  const isPwVisible = showAllPasswords || visiblePasswords[student._id];

                  return (
                    <tr
                      key={student._id}
                      className={`hover:bg-[var(--bg-muted)]/50 transition-colors ${
                        student.isActive === false ? 'opacity-60' : ''
                      }`}
                    >
                      <td className="px-4 py-3.5">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(student._id)}
                          onChange={() => toggleSelectOne(student._id)}
                          className="rounded"
                        />
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="font-semibold text-[var(--text-primary)]">{student.fullName}</p>
                        <p className="text-xs font-mono text-[var(--text-secondary)]">ID: {student.studentId}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="inline-flex items-center gap-1.5 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg px-2.5 py-1">
                          <span className="font-mono text-xs font-semibold text-[var(--text-primary)]">
                            {pw ? (isPwVisible ? pw : '••••••••') : 'Not set'}
                          </span>
                          {pw && (
                            <>
                              <button
                                type="button"
                                onClick={() =>
                                  setVisiblePasswords((prev) => ({
                                    ...prev,
                                    [student._id]: !prev[student._id],
                                  }))
                                }
                                className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                                title={isPwVisible ? 'Hide password' : 'Show password'}
                              >
                                {isPwVisible ? <EyeOff size={13} /> : <Eye size={13} />}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(pw);
                                  toast.success('Password copied');
                                }}
                                className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                                title="Copy password"
                              >
                                <Copy size={13} />
                              </button>
                            </>
                          )}
                          <button
                            type="button"
                            onClick={() => openPasswordModal(student)}
                            className="text-[11px] font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] underline ml-1"
                            title="Set custom or regenerate password"
                          >
                            Set
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="font-medium text-[var(--text-primary)]">{student.campus}</p>
                        <p className="text-xs text-[var(--text-secondary)]">{student.batch}</p>
                      </td>
                      <td className="px-4 py-3.5 text-xs">
                        <p className="text-[var(--text-primary)]">{student.email || '—'}</p>
                        <p className="text-[var(--text-muted)]">{student.contact || '—'}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          title={student.emailError || ''}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                            student.emailStatus === 'sent'
                              ? 'bg-emerald-500/10 text-emerald-500'
                              : student.emailStatus === 'failed'
                              ? 'bg-rose-500/10 text-rose-500'
                              : 'bg-amber-500/10 text-amber-500'
                          }`}
                        >
                          {student.emailStatus || 'pending'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            student.isActive === false
                              ? 'bg-rose-500/10 text-rose-500'
                              : 'bg-emerald-500/10 text-emerald-500'
                          }`}
                        >
                          {student.isActive === false ? 'Deactivated' : 'Active'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => openPasswordModal(student)}
                            className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-muted)]"
                            title="View / Set / Reset Password"
                          >
                            <KeyRound size={15} />
                          </button>
                          <button
                            onClick={() =>
                              setEditingStudent({
                                ...student,
                                password: student.plainPassword || '',
                              })
                            }
                            className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-muted)]"
                            title="Edit Student"
                          >
                            <Edit size={15} />
                          </button>
                          <button
                            onClick={() => handleToggleActive(student)}
                            className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-amber-500 hover:bg-[var(--bg-muted)]"
                            title={student.isActive === false ? 'Activate Student' : 'Deactivate Student'}
                          >
                            <Power size={15} />
                          </button>
                          <button
                            onClick={() => handleDelete(student._id)}
                            className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-rose-500 hover:bg-[var(--bg-muted)]"
                            title="Delete Student"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card Layout */}
          <div className="md:hidden divide-y divide-[var(--border)]">
            {filteredStudents.map((student) => {
              const pw = student.plainPassword || credentialsMap[student.studentId] || '';
              return (
                <div key={student._id} className="p-4 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <label className="flex items-start gap-2.5">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(student._id)}
                        onChange={() => toggleSelectOne(student._id)}
                        className="mt-1 rounded"
                      />
                      <div>
                        <p className="font-bold text-sm">{student.fullName}</p>
                        <p className="text-xs font-mono text-[var(--text-secondary)]">ID: {student.studentId}</p>
                      </div>
                    </label>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${
                        student.emailStatus === 'sent'
                          ? 'bg-emerald-500/10 text-emerald-500'
                          : student.emailStatus === 'failed'
                          ? 'bg-rose-500/10 text-rose-500'
                          : 'bg-amber-500/10 text-amber-500'
                      }`}
                    >
                      Email: {student.emailStatus || 'pending'}
                    </span>
                  </div>
                  <div className="text-xs text-[var(--text-secondary)] grid grid-cols-2 gap-1 pl-6">
                    <span>Campus: {student.campus}</span>
                    <span>Batch: {student.batch}</span>
                    <span className="col-span-2 font-mono">
                      Password: <strong>{pw || 'Not set'}</strong>
                    </span>
                    <span className="truncate col-span-2">Email: {student.email || '—'}</span>
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      onClick={() => openPasswordModal(student)}
                      className="btn-secondary py-1 px-2.5 text-xs flex items-center gap-1"
                    >
                      <KeyRound size={13} /> Set Pass
                    </button>
                    <button
                      onClick={() =>
                        setEditingStudent({
                          ...student,
                          password: student.plainPassword || '',
                        })
                      }
                      className="btn-secondary py-1 px-2.5 text-xs flex items-center gap-1"
                    >
                      <Edit size={13} /> Edit
                    </button>
                    <button
                      onClick={() => handleDelete(student._id)}
                      className="p-1.5 text-rose-500 rounded-lg border border-[var(--border)]"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredStudents.length === 0 && !loading && (
            <div className="p-14 text-center">
              <Users className="mx-auto text-[var(--text-muted)] mb-3" size={40} />
              <p className="font-semibold text-base">No students found</p>
              <p className="text-xs text-[var(--text-secondary)] mt-1">
                Add a student manually or use Bulk Import (.xlsx / .csv).
              </p>
            </div>
          )}
        </div>

        {/* Dedicated Set / Change Student Password Modal */}
        {passwordModalStudent && (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
            <div className="card max-w-md w-full p-6 space-y-4">
              <div className="flex justify-between items-center border-b border-[var(--border)] pb-3">
                <div>
                  <h3 className="text-base font-bold">Student Password</h3>
                  <p className="text-xs text-[var(--text-muted)]">
                    {passwordModalStudent.fullName} ({passwordModalStudent.studentId})
                  </p>
                </div>
                <button type="button" onClick={() => setPasswordModalStudent(null)}>
                  <X size={18} />
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5">
                  View / Set Custom Password
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="input-field font-mono"
                    placeholder="Enter custom password..."
                    value={customPasswordInput}
                    onChange={(e) => setCustomPasswordInput(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(customPasswordInput);
                      toast.success('Password copied');
                    }}
                    className="btn-secondary px-3 shrink-0"
                    title="Copy password"
                  >
                    <Copy size={15} />
                  </button>
                </div>
              </div>

              <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                <input
                  type="checkbox"
                  checked={requireChangeOnLogin}
                  onChange={(e) => setRequireChangeOnLogin(e.target.checked)}
                />
                <span>Ask student to change password on next login</span>
              </label>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-[var(--border)]">
                <button
                  type="button"
                  disabled={savingPassword}
                  onClick={() => handleSaveStudentPassword('auto')}
                  className="btn-secondary text-xs flex items-center gap-1.5"
                >
                  <RefreshCw size={13} /> Auto-Generate Random
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPasswordModalStudent(null)}
                    className="btn-secondary text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={savingPassword}
                    onClick={() => handleSaveStudentPassword('custom')}
                    className="btn-primary text-xs"
                  >
                    {savingPassword ? 'Saving...' : 'Save Password'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit Student Modal */}
        {editingStudent && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <form onSubmit={handleSaveEdit} className="card max-w-lg w-full p-6 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold">Edit Student</h3>
                <button type="button" onClick={() => setEditingStudent(null)}>
                  <X size={18} />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase mb-1">Student ID</label>
                  <input
                    type="text"
                    className="input-field font-mono"
                    value={editingStudent.studentId}
                    onChange={(e) => setEditingStudent({ ...editingStudent, studentId: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase mb-1">Full Name</label>
                  <input
                    type="text"
                    className="input-field"
                    value={editingStudent.fullName}
                    onChange={(e) => setEditingStudent({ ...editingStudent, fullName: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase mb-1">Email</label>
                  <input
                    type="email"
                    className="input-field"
                    value={editingStudent.email || ''}
                    onChange={(e) => setEditingStudent({ ...editingStudent, email: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase mb-1">Contact</label>
                  <input
                    type="text"
                    className="input-field"
                    value={editingStudent.contact || ''}
                    onChange={(e) => setEditingStudent({ ...editingStudent, contact: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase mb-1">Campus</label>
                  <input
                    type="text"
                    className="input-field"
                    value={editingStudent.campus || ''}
                    onChange={(e) => setEditingStudent({ ...editingStudent, campus: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase mb-1">Batch</label>
                  <input
                    type="text"
                    className="input-field"
                    value={editingStudent.batch || ''}
                    onChange={(e) => setEditingStudent({ ...editingStudent, batch: e.target.value })}
                    required
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold uppercase mb-1">
                    Student Password (View or Change)
                  </label>
                  <input
                    type="text"
                    className="input-field font-mono"
                    placeholder="Enter new password to change..."
                    value={editingStudent.password || ''}
                    onChange={(e) => setEditingStudent({ ...editingStudent, password: e.target.value })}
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm pt-1">
                <input
                  type="checkbox"
                  checked={editingStudent.isActive !== false}
                  onChange={(e) => setEditingStudent({ ...editingStudent, isActive: e.target.checked })}
                />
                <span>Account is active (student can sign in)</span>
              </label>
              <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border)]">
                <button type="button" onClick={() => setEditingStudent(null)} className="btn-secondary text-sm">
                  Cancel
                </button>
                <button type="submit" className="btn-primary text-sm">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Credentials Modal */}
        {credentialsModal && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="card max-w-2xl w-full p-6 space-y-4 max-h-[85vh] flex flex-col">
              <div className="flex justify-between items-start gap-4">
                <div>
                  <h3 className="text-lg font-bold">{credentialsModal.title}</h3>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                    You can also view or change these passwords anytime from the Students table.
                  </p>
                </div>
                <button onClick={() => setCredentialsModal(null)}>
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto border border-[var(--border)] rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[var(--bg-muted)] text-[var(--text-secondary)] uppercase">
                    <tr>
                      <th className="px-3 py-2.5">Student ID</th>
                      <th className="px-3 py-2.5">Name</th>
                      <th className="px-3 py-2.5">Email</th>
                      <th className="px-3 py-2.5">Password</th>
                      <th className="px-3 py-2.5 text-right">Copy</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {credentialsModal.items.map((item) => (
                      <tr key={item.studentId}>
                        <td className="px-3 py-2 font-mono font-semibold">{item.studentId}</td>
                        <td className="px-3 py-2">{item.fullName}</td>
                        <td className="px-3 py-2">{item.email || '—'}</td>
                        <td className="px-3 py-2 font-mono font-bold text-[var(--text-primary)]">
                          {item.generatedPassword || item.plainPassword}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(
                                `Student ID: ${item.studentId}\nPassword: ${item.generatedPassword || item.plainPassword}`
                              );
                              toast.success('Copied credentials');
                            }}
                            className="p-1 hover:text-[var(--text-primary)]"
                            title="Copy ID & Password"
                          >
                            <Copy size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-wrap justify-between items-center gap-2 pt-2">
                <button
                  onClick={() => handleExportCredentialsExcel(credentialsModal.items)}
                  className="btn-secondary text-xs flex items-center gap-1.5"
                >
                  <Download size={14} /> Download Credentials (.xlsx)
                </button>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const ids = credentialsModal.items.map((i) => i._id || i.studentId);
                      setCredentialsModal(null);
                      handleSendCredentialsEmails(ids);
                    }}
                    className="btn-primary text-xs flex items-center gap-1.5"
                  >
                    <Mail size={14} /> Email Credentials Now
                  </button>
                  <button onClick={() => setCredentialsModal(null)} className="btn-secondary text-xs">
                    Done
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bulk Import Modal */}
        {showImportModal && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="card max-w-5xl w-full p-6 space-y-5 max-h-[90vh] flex flex-col">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-bold">Bulk Student Import (.xlsx / .csv)</h3>
                  <p className="text-xs text-[var(--text-secondary)]">
                    Upload a spreadsheet, verify column mappings and validation checks, then confirm import.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowImportModal(false);
                    setRawSheetRows([]);
                  }}
                >
                  <X size={18} />
                </button>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-[var(--bg-muted)] border border-[var(--border)]">
                <div className="flex items-center gap-3">
                  <label className="btn-primary text-xs cursor-pointer flex items-center gap-2">
                    <Upload size={14} /> Select Excel / CSV File
                    <input
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={handleDownloadTemplate}
                    className="btn-secondary text-xs flex items-center gap-1.5"
                  >
                    <Download size={14} /> Download Template
                  </button>
                </div>

                <label className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={strictCampusCheck}
                    onChange={(e) => setStrictCampusCheck(e.target.checked)}
                  />
                  <span>Strictly require pre-existing Campus & Batch names</span>
                </label>
              </div>

              {rawSheetRows.length > 0 && (
                <>
                  {/* Column Mapping */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                    {[
                      { key: 'fullName', label: 'Name Column *' },
                      { key: 'studentId', label: 'Student ID *' },
                      { key: 'email', label: 'Email Column' },
                      { key: 'campus', label: 'Campus *' },
                      { key: 'batch', label: 'Batch *' },
                      { key: 'contact', label: 'Contact' },
                      { key: 'password', label: 'Password (Opt)' },
                    ].map((col) => (
                      <div key={col.key}>
                        <label className="block text-[11px] font-semibold uppercase text-[var(--text-secondary)] mb-1">
                          {col.label}
                        </label>
                        <select
                          className="input-field py-1.5 px-2 text-xs"
                          value={columnMap[col.key] || ''}
                          onChange={(e) => setColumnMap({ ...columnMap, [col.key]: e.target.value })}
                        >
                          <option value="">-- Auto / None --</option>
                          {sheetHeaders.map((h) => (
                            <option key={h} value={h}>
                              {h}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>

                  {/* Validation Summary */}
                  <div className="flex flex-wrap items-center gap-4 text-xs font-semibold">
                    <span className="px-2.5 py-1 rounded-md bg-[var(--bg-muted)]">
                      Total Rows: {previewRows.length}
                    </span>
                    <span className="px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-500 flex items-center gap-1">
                      <CheckCircle2 size={14} /> Valid: {validPreviewRows.length}
                    </span>
                    <span className="px-2.5 py-1 rounded-md bg-rose-500/10 text-rose-500 flex items-center gap-1">
                      <AlertCircle size={14} /> Invalid (Skipped): {previewRows.length - validPreviewRows.length}
                    </span>
                  </div>

                  {/* Preview Table */}
                  <div className="flex-1 overflow-y-auto border border-[var(--border)] rounded-xl">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[var(--bg-muted)] text-[var(--text-secondary)] uppercase sticky top-0">
                        <tr>
                          <th className="px-3 py-2">#</th>
                          <th className="px-3 py-2">Student ID</th>
                          <th className="px-3 py-2">Name</th>
                          <th className="px-3 py-2">Email</th>
                          <th className="px-3 py-2">Campus</th>
                          <th className="px-3 py-2">Batch</th>
                          <th className="px-3 py-2">Password</th>
                          <th className="px-3 py-2">Validation</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border)]">
                        {previewRows.map((row) => (
                          <tr
                            key={row.rowNumber}
                            className={row.isValid ? '' : 'bg-rose-500/5'}
                          >
                            <td className="px-3 py-2 text-[var(--text-muted)]">{row.rowNumber}</td>
                            <td className="px-3 py-2 font-mono font-semibold">{row.studentId || '—'}</td>
                            <td className="px-3 py-2">{row.fullName || '—'}</td>
                            <td className="px-3 py-2">{row.email || '—'}</td>
                            <td className="px-3 py-2">{row.campus || '—'}</td>
                            <td className="px-3 py-2">{row.batch || '—'}</td>
                            <td className="px-3 py-2 font-mono">{row.password || 'Auto'}</td>
                            <td className="px-3 py-2">
                              {row.isValid ? (
                                <span className="text-emerald-500 font-medium">
                                  Ready {row.warnings.length ? `(${row.warnings.join(', ')})` : ''}
                                </span>
                              ) : (
                                <span className="text-rose-500 font-semibold">
                                  {row.issues.join(', ')}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => {
                    setShowImportModal(false);
                    setRawSheetRows([]);
                  }}
                  className="btn-secondary text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={validPreviewRows.length === 0 || importing}
                  onClick={handleConfirmBulkImport}
                  className="btn-primary text-xs disabled:opacity-40"
                >
                  {importing
                    ? 'Importing...'
                    : `Confirm & Import ${validPreviewRows.length} Valid Student(s)`}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default ManageStudentsPage;
