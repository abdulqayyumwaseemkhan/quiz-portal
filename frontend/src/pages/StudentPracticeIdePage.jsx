import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Code2, RotateCcw, Layers } from 'lucide-react';
import StudentNavbar from '../components/StudentNavbar';
import WebIDE from '../components/WebIDE/WebIDE';
import toast from 'react-hot-toast';

const StudentPracticeIdePage = () => {
  const navigate = useNavigate();
  const [projectType, setProjectType] = useState('vanilla'); // 'vanilla' | 'react'
  const [resetKey, setResetKey] = useState(0);

  const student = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('studentInfo'));
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    if (!student) {
      navigate('/', { replace: true });
    }
  }, [student, navigate]);

  const handleReset = () => {
    const confirm = window.confirm('Reset this playground workspace to starter template? Any unsaved edits will be cleared.');
    if (!confirm) return;
    const draftKey = `ide_draft_${student?.studentId}_practice_${projectType}`;
    localStorage.removeItem(draftKey);
    setResetKey((k) => k + 1);
    toast.success('Workspace reset to template!');
  };

  if (!student) return null;

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[var(--bg-primary)]">
      <StudentNavbar student={student} />

      {/* Header bar */}
      <div className="px-4 sm:px-6 py-2.5 bg-[var(--bg-surface)] border-b border-[var(--border)] flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-[var(--accent-subtle)] text-[var(--accent)]">
            <Code2 size={18} />
          </div>
          <div>
            <h1 className="text-sm sm:text-base font-bold text-[var(--text-primary)] leading-tight">
              Code Playground & Web IDE
            </h1>
            <p className="text-[11px] text-[var(--text-secondary)] hidden sm:block">
              Practice HTML, CSS, JavaScript, and React freely. Your code auto-saves locally.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Project Type Switcher */}
          <div className="flex items-center bg-[var(--bg-muted)] p-0.5 rounded-lg border border-[var(--border)] text-xs">
            <button
              type="button"
              onClick={() => setProjectType('vanilla')}
              className={`px-3 py-1 rounded-md font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                projectType === 'vanilla'
                  ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-xs font-bold'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Code2 size={13} />
              <span>HTML / CSS / JS</span>
            </button>
            <button
              type="button"
              onClick={() => setProjectType('react')}
              className={`px-3 py-1 rounded-md font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                projectType === 'react'
                  ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-xs font-bold'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Layers size={13} className="text-cyan-500" />
              <span>React JSX</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleReset}
            className="btn-secondary py-1.5 px-3 text-xs flex items-center gap-1.5"
            title="Reset workspace to default starter code"
          >
            <RotateCcw size={13} />
            <span className="hidden sm:inline">Reset Template</span>
          </button>
        </div>
      </div>

      {/* Main IDE area */}
      <div className="flex-1 min-h-0">
        <WebIDE
          key={`${projectType}_${resetKey}`}
          studentId={student.studentId}
          assignmentId={`practice_${projectType}`}
          projectType={projectType}
        />
      </div>
    </div>
  );
};

export default StudentPracticeIdePage;
