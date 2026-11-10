import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import API from '../api';
import Navbar from '../components/AdminNavbar';
import {
  Plus,
  Trash2,
  ArrowLeft,
  HelpCircle,
  CheckCircle2,
  Upload,
  FileSpreadsheet,
  Edit,
  X,
  AlertCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';

const MCQ_ALIASES = {
  questionText: ['question', 'question text', 'questiontext', 'prompt', 'q'],
  optionA: ['option a', 'a', 'option 1', 'opt a', 'choice a'],
  optionB: ['option b', 'b', 'option 2', 'opt b', 'choice b'],
  optionC: ['option c', 'c', 'option 3', 'opt c', 'choice c'],
  optionD: ['option d', 'd', 'option 4', 'opt d', 'choice d'],
  optionE: ['option e', 'e', 'option 5', 'opt e', 'choice e'],
  correctOption: ['correct option', 'correct answer', 'correct', 'answer', 'key'],
  marks: ['marks', 'mark', 'points', 'score', 'weight'],
  explanation: ['explanation', 'rationale', 'note', 'feedback'],
};

function autoMapMcqColumns(headers) {
  const map = {
    questionText: '',
    optionA: '',
    optionB: '',
    optionC: '',
    optionD: '',
    optionE: '',
    correctOption: '',
    marks: '',
    explanation: '',
  };

  headers.forEach((h) => {
    const clean = String(h || '').trim().toLowerCase();
    for (const [key, aliases] of Object.entries(MCQ_ALIASES)) {
      if (!map[key] && aliases.includes(clean)) {
        map[key] = h;
      }
    }
  });

  return map;
}

function resolveCorrectAnswerText(rawCorrect, options) {
  const clean = String(rawCorrect ?? '').trim();
  if (!clean) return '';

  const letterMatch = clean.match(/^(?:option\s*)?([a-eA-E])$/i);
  if (letterMatch) {
    const idx = letterMatch[1].toUpperCase().charCodeAt(0) - 65;
    return options[idx] || '';
  }

  const exactOrCaseMatch = options.find((o) => o.toLowerCase() === clean.toLowerCase());
  return exactOrCaseMatch || '';
}

const ManageQuestionsPage = () => {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);

  const [newQuestion, setNewQuestion] = useState({
    questionText: '',
    type: 'mcq',
    options: ['', '', '', '', ''],
    correctAnswer: '',
    marks: 1,
    explanation: '',
  });

  // Bulk MCQ upload modal state
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [rawRows, setRawRows] = useState([]);
  const [colMap, setColMap] = useState(autoMapMcqColumns([]));
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [qRes, qsRes] = await Promise.all([
          API.get(`/quizzes/${quizId}`),
          API.get(`/quizzes/${quizId}/questions`),
        ]);
        setQuiz(qRes.data);
        setQuestions(qsRes.data);
      } catch {
        toast.error('Failed to load quiz questions');
      }
    };
    fetchData();
  }, [quizId]);

  const handleAddQuestion = async (e) => {
    e.preventDefault();
    const trimmedOptions = newQuestion.options.map((o) => o.trim()).filter(Boolean);
    if (newQuestion.type === 'mcq') {
      if (trimmedOptions.length < 2) {
        return toast.error('Please enter at least 2 options');
      }
      if (!newQuestion.correctAnswer || !trimmedOptions.includes(newQuestion.correctAnswer.trim())) {
        return toast.error('Please select one of the non-empty options as the correct answer');
      }
    }

    try {
      const payload = {
        ...newQuestion,
        options: newQuestion.type === 'mcq' ? trimmedOptions : [],
        correctAnswer: newQuestion.correctAnswer.trim(),
      };
      const { data } = await API.post(`/quizzes/${quizId}/questions`, payload);
      setQuestions([...questions, data]);
      setShowAdd(false);
      setNewQuestion({
        questionText: '',
        type: 'mcq',
        options: ['', '', '', '', ''],
        correctAnswer: '',
        marks: 1,
        explanation: '',
      });
      toast.success('Question added');
    } catch {
      toast.error('Failed to add question');
    }
  };

  const handleSaveEditQuestion = async (e) => {
    e.preventDefault();
    if (!editingQuestion) return;
    const trimmedOptions = (editingQuestion.options || []).map((o) => o.trim()).filter(Boolean);
    if (editingQuestion.type === 'mcq' && !trimmedOptions.includes(editingQuestion.correctAnswer.trim())) {
      return toast.error('Please select a valid correct option');
    }
    try {
      const { data } = await API.put(`/quizzes/questions/${editingQuestion._id}`, {
        ...editingQuestion,
        options: editingQuestion.type === 'mcq' ? trimmedOptions : [],
      });
      setQuestions(questions.map((q) => (q._id === data._id ? data : q)));
      setEditingQuestion(null);
      toast.success('Question updated');
    } catch {
      toast.error('Failed to update question');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this question?')) return;
    try {
      await API.delete(`/quizzes/questions/${id}`);
      setQuestions(questions.filter((q) => q._id !== id));
      toast.success('Question removed');
    } catch {
      toast.error('Delete failed');
    }
  };

  const handleDownloadMcqTemplate = () => {
    const sample = [
      {
        Question: 'Which hook is used to manage state in a functional React component?',
        'Option A': 'useEffect',
        'Option B': 'useState',
        'Option C': 'useContext',
        'Option D': 'useMemo',
        'Option E': '',
        'Correct Option': 'B',
        Marks: 2,
        Explanation: 'useState returns a stateful value and a function to update it.',
      },
      {
        Question: 'Which CSS property enables Flexbox layout?',
        'Option A': 'display: block',
        'Option B': 'display: grid',
        'Option C': 'display: flex',
        'Option D': 'position: absolute',
        'Option E': '',
        'Correct Option': 'C',
        Marks: 1,
        Explanation: 'display: flex turns an element into a flex container.',
      },
    ];
    const ws = XLSX.utils.json_to_sheet(sample);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'MCQs');
    XLSX.writeFile(wb, 'mcq_import_template.xlsx');
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bytes = new Uint8Array(evt.target.result);
        const wb = XLSX.read(bytes, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(ws, { defval: '' });
        if (!json.length) {
          toast.error('Uploaded file is empty');
          return;
        }
        const cols = Object.keys(json[0]);
        setRawRows(json);
        setColMap(autoMapMcqColumns(cols));
      } catch {
        toast.error('Invalid Excel/CSV file');
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  const previewQuestions = useMemo(() => {
    if (!rawRows.length) return [];
    const existingSet = new Set(questions.map((q) => q.questionText.trim().toLowerCase()));
    const seenInFile = new Set();

    return rawRows.map((row, idx) => {
      const questionText = String(row[colMap.questionText] ?? '').trim();
      const optA = String(row[colMap.optionA] ?? '').trim();
      const optB = String(row[colMap.optionB] ?? '').trim();
      const optC = String(row[colMap.optionC] ?? '').trim();
      const optD = String(row[colMap.optionD] ?? '').trim();
      const optE = colMap.optionE ? String(row[colMap.optionE] ?? '').trim() : '';
      const options = [optA, optB, optC, optD, optE].filter(Boolean);

      const rawCorrect = String(row[colMap.correctOption] ?? '').trim();
      const resolvedCorrect = resolveCorrectAnswerText(rawCorrect, options);
      const marks = Math.max(0.5, Number(row[colMap.marks]) || 1);
      const explanation = colMap.explanation ? String(row[colMap.explanation] ?? '').trim() : '';

      const issues = [];
      if (!questionText) issues.push('Missing question text');
      if (options.length < 2) issues.push('Fewer than 2 options');
      if (!rawCorrect) {
        issues.push('Missing correct option');
      } else if (!resolvedCorrect) {
        issues.push(`Correct option "${rawCorrect}" not in A–E`);
      }

      const qLower = questionText.toLowerCase();
      if (questionText) {
        if (existingSet.has(qLower)) issues.push('Duplicate (already in quiz)');
        else if (seenInFile.has(qLower)) issues.push('Duplicate (repeated in file)');
        seenInFile.add(qLower);
      }

      return {
        rowNumber: idx + 1,
        questionText,
        options,
        rawCorrect,
        correctAnswer: resolvedCorrect,
        marks,
        explanation,
        issues,
        isValid: issues.length === 0,
      };
    });
  }, [rawRows, colMap, questions]);

  const validPreviewQuestions = useMemo(
    () => previewQuestions.filter((q) => q.isValid),
    [previewQuestions]
  );

  const handleConfirmBulkUpload = async () => {
    if (validPreviewQuestions.length === 0) return toast.error('No valid questions to import');
    setImporting(true);
    try {
      const { data } = await API.post(`/quizzes/${quizId}/questions/bulk`, {
        questions: validPreviewQuestions,
      });
      setQuestions((prev) => [...prev, ...(data.questions || [])]);
      setShowBulkModal(false);
      setRawRows([]);
      toast.success(`Imported ${data.insertedCount} questions`);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Bulk upload failed');
    } finally {
      setImporting(false);
    }
  };

  const totalMarksSum = useMemo(
    () => questions.reduce((sum, q) => sum + (Number(q.marks) || 1), 0),
    [questions]
  );

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      <Navbar />
      <main className="flex-1 lg:ml-64 p-4 sm:p-6 lg:p-8">
        <button
          onClick={() => navigate('/admin/dashboard')}
          className="flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] mb-4"
        >
          <ArrowLeft size={16} /> Back to Dashboard
        </button>

        <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
              Question Bank
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold mt-0.5">{quiz?.title || 'Quiz Questions'}</h1>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              {questions.length} Questions • {totalMarksSum} Total Marks
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button onClick={handleDownloadMcqTemplate} className="btn-secondary text-xs sm:text-sm flex items-center gap-2">
              <FileSpreadsheet size={16} /> MCQ Template
            </button>
            <button
              onClick={() => setShowBulkModal(true)}
              className="btn-secondary text-xs sm:text-sm flex items-center gap-2"
            >
              <Upload size={16} /> Bulk Upload MCQs
            </button>
            <button
              onClick={() => setShowAdd(!showAdd)}
              className="btn-primary text-xs sm:text-sm flex items-center gap-2"
            >
              <Plus size={16} /> {showAdd ? 'Close Form' : 'Add Question'}
            </button>
          </div>
        </header>

        {/* Manual Question Form */}
        {showAdd && (
          <form onSubmit={handleAddQuestion} className="card p-6 mb-6 space-y-5">
            <h2 className="text-base font-bold">Add Single Question</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-3">
                <label className="block text-xs font-semibold uppercase mb-1">Question Text *</label>
                <textarea
                  className="input-field min-h-[80px]"
                  value={newQuestion.questionText}
                  onChange={(e) => setNewQuestion({ ...newQuestion, questionText: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase mb-1">Type</label>
                <select
                  className="input-field"
                  value={newQuestion.type}
                  onChange={(e) =>
                    setNewQuestion({ ...newQuestion, type: e.target.value, correctAnswer: '' })
                  }
                >
                  <option value="mcq">Multiple Choice (MCQ)</option>
                  <option value="short">Short Answer</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase mb-1">Marks</label>
                <input
                  type="number"
                  min={0.5}
                  step="0.5"
                  className="input-field"
                  value={newQuestion.marks}
                  onChange={(e) => setNewQuestion({ ...newQuestion, marks: Number(e.target.value) })}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase mb-1">Explanation (Optional)</label>
                <input
                  type="text"
                  placeholder="Shown when results are released"
                  className="input-field"
                  value={newQuestion.explanation}
                  onChange={(e) => setNewQuestion({ ...newQuestion, explanation: e.target.value })}
                />
              </div>
            </div>

            {newQuestion.type === 'mcq' ? (
              <div className="space-y-3">
                <label className="block text-xs font-semibold uppercase text-[var(--text-secondary)]">
                  Options (Select radio button next to the correct option; Option E is optional)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {newQuestion.options.map((opt, i) => (
                    <div key={i} className="flex items-center gap-2.5">
                      <input
                        type="radio"
                        name="correctAnswer"
                        checked={newQuestion.correctAnswer === opt && opt.trim() !== ''}
                        onChange={() => setNewQuestion({ ...newQuestion, correctAnswer: opt })}
                      />
                      <input
                        type="text"
                        placeholder={`Option ${String.fromCharCode(65 + i)}${i === 4 ? ' (Optional)' : ''}`}
                        className="input-field"
                        value={opt}
                        onChange={(e) => {
                          const updated = [...newQuestion.options];
                          const wasCorrect = newQuestion.correctAnswer === updated[i];
                          updated[i] = e.target.value;
                          setNewQuestion({
                            ...newQuestion,
                            options: updated,
                            correctAnswer: wasCorrect ? e.target.value : newQuestion.correctAnswer,
                          });
                        }}
                        required={i < 2}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold uppercase mb-1">Correct Answer *</label>
                <input
                  type="text"
                  className="input-field"
                  value={newQuestion.correctAnswer}
                  onChange={(e) => setNewQuestion({ ...newQuestion, correctAnswer: e.target.value })}
                  required
                />
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary text-sm">
                Cancel
              </button>
              <button type="submit" className="btn-primary text-sm">
                Save Question
              </button>
            </div>
          </form>
        )}

        {/* Questions List */}
        <div className="space-y-4">
          {questions.map((q, idx) => (
            <div key={q._id} className="card p-5 relative">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3.5 flex-1">
                  <div className="w-8 h-8 rounded-lg bg-[var(--accent-subtle)] text-[var(--accent)] font-bold text-sm flex items-center justify-center shrink-0">
                    {idx + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[11px] font-semibold uppercase px-2 py-0.5 rounded bg-[var(--bg-muted)]">
                        {q.type}
                      </span>
                      <span className="text-xs text-[var(--text-secondary)]">{q.marks} Marks</span>
                    </div>
                    <h3 className="text-base font-semibold text-[var(--text-primary)]">{q.questionText}</h3>

                    {q.type === 'mcq' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-3">
                        {(q.options || []).map((opt, i) => {
                          const isCorrect = q.correctAnswer === opt;
                          return (
                            <div
                              key={i}
                              className={`flex items-center gap-2 text-xs p-2.5 rounded-lg border ${
                                isCorrect
                                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400 font-semibold'
                                  : 'border-[var(--border)] text-[var(--text-secondary)]'
                              }`}
                            >
                              <span className="font-mono font-bold">
                                {String.fromCharCode(65 + i)}.
                              </span>
                              <span className="flex-1">{opt}</span>
                              {isCorrect && <CheckCircle2 size={14} className="shrink-0" />}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {q.type === 'short' && (
                      <div className="mt-3 p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                        Correct Answer: {q.correctAnswer}
                      </div>
                    )}

                    {q.explanation && (
                      <p className="mt-2 text-xs text-[var(--text-muted)]">
                        Explanation: {q.explanation}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      const padded = [...(q.options || [])];
                      while (padded.length < 5) padded.push('');
                      setEditingQuestion({ ...q, options: padded });
                    }}
                    className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--accent)] rounded-lg"
                    title="Edit Question"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(q._id)}
                    className="p-1.5 text-[var(--text-secondary)] hover:text-rose-600 rounded-lg"
                    title="Delete Question"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}

          {questions.length === 0 && !showAdd && (
            <div className="card p-14 text-center">
              <HelpCircle size={40} className="mx-auto text-[var(--text-muted)] mb-3" />
              <p className="font-semibold text-base">No questions in this quiz yet</p>
              <p className="text-xs text-[var(--text-secondary)] mt-1">
                Add questions manually or use Bulk Upload MCQs (.xlsx / .csv).
              </p>
            </div>
          )}
        </div>

        {/* Edit Question Modal */}
        {editingQuestion && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <form onSubmit={handleSaveEditQuestion} className="card max-w-2xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold">Edit Question</h3>
                <button type="button" onClick={() => setEditingQuestion(null)}>
                  <X size={18} />
                </button>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase mb-1">Question Text</label>
                <textarea
                  className="input-field min-h-[80px]"
                  value={editingQuestion.questionText}
                  onChange={(e) =>
                    setEditingQuestion({ ...editingQuestion, questionText: e.target.value })
                  }
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase mb-1">Marks</label>
                  <input
                    type="number"
                    min={0.5}
                    step="0.5"
                    className="input-field"
                    value={editingQuestion.marks}
                    onChange={(e) =>
                      setEditingQuestion({ ...editingQuestion, marks: Number(e.target.value) })
                    }
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase mb-1">Explanation</label>
                  <input
                    type="text"
                    className="input-field"
                    value={editingQuestion.explanation || ''}
                    onChange={(e) =>
                      setEditingQuestion({ ...editingQuestion, explanation: e.target.value })
                    }
                  />
                </div>
              </div>
              {editingQuestion.type === 'mcq' && (
                <div className="space-y-2.5">
                  <label className="block text-xs font-semibold uppercase">Options (Select Correct)</label>
                  {editingQuestion.options.map((opt, i) => (
                    <div key={i} className="flex items-center gap-2.5">
                      <input
                        type="radio"
                        name="editCorrectAnswer"
                        checked={editingQuestion.correctAnswer === opt && opt.trim() !== ''}
                        onChange={() => setEditingQuestion({ ...editingQuestion, correctAnswer: opt })}
                      />
                      <input
                        type="text"
                        className="input-field"
                        placeholder={`Option ${String.fromCharCode(65 + i)}`}
                        value={opt}
                        onChange={(e) => {
                          const opts = [...editingQuestion.options];
                          const wasCorrect = editingQuestion.correctAnswer === opts[i];
                          opts[i] = e.target.value;
                          setEditingQuestion({
                            ...editingQuestion,
                            options: opts,
                            correctAnswer: wasCorrect ? e.target.value : editingQuestion.correctAnswer,
                          });
                        }}
                      />
                    </div>
                  ))}
                </div>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setEditingQuestion(null)} className="btn-secondary text-xs">
                  Cancel
                </button>
                <button type="submit" className="btn-primary text-xs">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Bulk MCQ Upload Modal */}
        {showBulkModal && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="card max-w-5xl w-full p-6 space-y-4 max-h-[90vh] flex flex-col">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-bold">Bulk Upload MCQs (.xlsx / .csv)</h3>
                  <p className="text-xs text-[var(--text-secondary)]">
                    Columns: Question, Option A, B, C, D, (optional E), Correct Option (A/B/C/D or exact text), Marks, Explanation
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowBulkModal(false);
                    setRawRows([]);
                  }}
                >
                  <X size={18} />
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-3 p-4 rounded-xl bg-[var(--bg-muted)] border border-[var(--border)]">
                <label className="btn-primary text-xs cursor-pointer flex items-center gap-2">
                  <Upload size={14} /> Choose Excel / CSV
                  <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFileUpload} className="hidden" />
                </label>
                <button onClick={handleDownloadMcqTemplate} className="btn-secondary text-xs flex items-center gap-1.5">
                  <FileSpreadsheet size={14} /> Download Template
                </button>
              </div>

              {rawRows.length > 0 && (
                <>
                  <div className="flex items-center gap-4 text-xs font-semibold">
                    <span className="px-2.5 py-1 rounded bg-[var(--bg-muted)]">
                      Total Rows: {previewQuestions.length}
                    </span>
                    <span className="px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 size={14} /> Valid: {validPreviewQuestions.length}
                    </span>
                    <span className="px-2.5 py-1 rounded bg-rose-500/10 text-rose-600 flex items-center gap-1">
                      <AlertCircle size={14} /> Invalid: {previewQuestions.length - validPreviewQuestions.length}
                    </span>
                  </div>

                  <div className="flex-1 overflow-y-auto border border-[var(--border)] rounded-xl">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[var(--bg-muted)] text-[var(--text-secondary)] uppercase sticky top-0">
                        <tr>
                          <th className="px-3 py-2">#</th>
                          <th className="px-3 py-2">Question</th>
                          <th className="px-3 py-2">Options</th>
                          <th className="px-3 py-2">Correct Answer</th>
                          <th className="px-3 py-2">Marks</th>
                          <th className="px-3 py-2">Validation</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border)]">
                        {previewQuestions.map((row) => (
                          <tr key={row.rowNumber} className={row.isValid ? '' : 'bg-rose-500/5'}>
                            <td className="px-3 py-2">{row.rowNumber}</td>
                            <td className="px-3 py-2 max-w-xs truncate" title={row.questionText}>
                              {row.questionText || '—'}
                            </td>
                            <td className="px-3 py-2 text-[var(--text-secondary)]">
                              {row.options.join(' | ')}
                            </td>
                            <td className="px-3 py-2 font-semibold text-emerald-600">
                              {row.correctAnswer || row.rawCorrect || '—'}
                            </td>
                            <td className="px-3 py-2">{row.marks}</td>
                            <td className="px-3 py-2">
                              {row.isValid ? (
                                <span className="text-emerald-600 font-medium">Ready</span>
                              ) : (
                                <span className="text-rose-600 font-semibold">{row.issues.join(', ')}</span>
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
                  onClick={() => {
                    setShowBulkModal(false);
                    setRawRows([]);
                  }}
                  className="btn-secondary text-xs"
                >
                  Cancel
                </button>
                <button
                  disabled={validPreviewQuestions.length === 0 || importing}
                  onClick={handleConfirmBulkUpload}
                  className="btn-primary text-xs disabled:opacity-40"
                >
                  {importing ? 'Uploading...' : `Confirm & Add ${validPreviewQuestions.length} Question(s)`}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default ManageQuestionsPage;
