import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Code2, RotateCcw, Layers, Server, ArrowLeft } from 'lucide-react';
import StudentNavbar from '../components/StudentNavbar';
import WebIDE from '../components/WebIDE/WebIDE';
import API from '../api';
import { clientCache } from '../utils/clientCache';
import { useLiveRefresh } from '../utils/liveSync';
import toast from 'react-hot-toast';

const StudentPracticeIdePage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedStack = searchParams.get('stack');
  const isAdminPreviewParam = searchParams.get('adminPreview') === '1';

  const student = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('studentInfo'));
    } catch {
      return null;
    }
  }, []);

  const admin = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('adminData'));
    } catch {
      return null;
    }
  }, []);

  const isAdminUser = Boolean(admin && (isAdminPreviewParam || !student));

  const cachedIdeSettings = clientCache.get('practice_ide_settings');
  const [nodeEnabled, setNodeEnabled] = useState(
    cachedIdeSettings ? Boolean(cachedIdeSettings.enableNodePracticeIde) : false
  );

  const [projectType, setProjectType] = useState(() => {
    if (requestedStack === 'node' && isAdminUser) return 'node';
    if (requestedStack === 'react') return 'react';
    return 'vanilla';
  });
  const [resetKey, setResetKey] = useState(0);

  useEffect(() => {
    if (!student && !admin) {
      navigate('/', { replace: true });
    }
  }, [student, admin, navigate]);

  const fetchIdeSettings = useCallback(async () => {
    try {
      const endpoint = isAdminUser ? '/admin/ide-settings' : '/student/ide-settings';
      const { data } = await API.get(endpoint);
      const enabled = Boolean(data?.enableNodePracticeIde);
      setNodeEnabled(enabled);
      clientCache.set('practice_ide_settings', { enableNodePracticeIde: enabled });
      if (requestedStack === 'node' && (enabled || isAdminUser)) {
        setProjectType('node');
      } else if (!enabled && !isAdminUser) {
        setProjectType((prev) => (prev === 'node' ? 'vanilla' : prev));
      }
    } catch {
      // keep cached/default false
    }
  }, [isAdminUser, requestedStack]);

  useEffect(() => {
    let active = true;
    const endpoint = isAdminUser ? '/admin/ide-settings' : '/student/ide-settings';
    API.get(endpoint)
      .then(({ data }) => {
        if (!active) return;
        const enabled = Boolean(data?.enableNodePracticeIde);
        setNodeEnabled(enabled);
        clientCache.set('practice_ide_settings', { enableNodePracticeIde: enabled });
        if (requestedStack === 'node' && (enabled || isAdminUser)) {
          setProjectType('node');
        } else if (!enabled && !isAdminUser) {
          setProjectType((prev) => (prev === 'node' ? 'vanilla' : prev));
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [isAdminUser, requestedStack]);

  useLiveRefresh(fetchIdeSettings, 20000, ['IDE_SETTINGS_UPDATED']);

  const canAccessNode = nodeEnabled || isAdminUser;
  const workspaceOwnerId = student?.studentId || `admin_${admin?._id || 'preview'}`;

  const handleReset = () => {
    const confirmed = window.confirm(
      'Reset this playground workspace back to its starter files? Your custom edits in this stack will be cleared.'
    );
    if (!confirmed) return;
    const suffix = projectType !== 'vanilla' ? '_v2' : '';
    localStorage.removeItem(`ide_draft_${workspaceOwnerId}_practice_${projectType}${suffix}`);
    localStorage.removeItem(`ide_draft_${workspaceOwnerId}_practice_${projectType}`);
    setResetKey((k) => k + 1);
    toast.success('Workspace reset to default starter structure!');
  };

  if (!student && !admin) return null;

  return (
    <div className="flex flex-col h-[100dvh] overflow-hidden bg-[var(--bg-primary)]">
      {student && !isAdminPreviewParam ? (
        <StudentNavbar student={student} />
      ) : (
        <div className="px-4 py-2 bg-[var(--bg-header)] border-b border-[var(--border)] flex items-center justify-between text-xs shrink-0">
          <Link
            to="/admin/dashboard"
            className="inline-flex items-center gap-1.5 font-bold text-[var(--accent)] hover:underline"
          >
            <ArrowLeft size={14} />
            <span>Back to Admin Dashboard</span>
          </Link>
          <span className="px-2.5 py-0.5 rounded-full font-semibold bg-amber-500/15 text-amber-600 dark:text-amber-400">
            Admin IDE Preview Mode
          </span>
        </div>
      )}

      {/* Compact Responsive Stack Header Bar */}
      <div className="px-3 sm:px-6 py-2 bg-[var(--bg-surface)] border-b border-[var(--border)] flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-1.5 sm:p-2 rounded-xl bg-[var(--accent-subtle)] text-[var(--accent)] shrink-0">
            <Code2 size={17} />
          </div>
          <div className="min-w-0">
            <h1 className="text-xs sm:text-sm font-bold text-[var(--text-primary)] truncate">
              Practice Web IDE
            </h1>
            <p className="text-[11px] text-[var(--text-secondary)] hidden md:block truncate">
              VS Code–style playground with multi-folder imports, project config guides &amp; auto-save
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 max-w-full overflow-x-auto no-scrollbar">
          {/* Stack Switcher */}
          <div className="flex items-center bg-[var(--bg-muted)] p-0.5 rounded-lg border border-[var(--border)] text-xs shrink-0">
            <button
              type="button"
              onClick={() => setProjectType('vanilla')}
              className={`px-2.5 sm:px-3 py-1 rounded-md font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                projectType === 'vanilla'
                  ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-xs font-bold'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Code2 size={13} className="text-orange-500" />
              <span>HTML / CSS</span>
            </button>

            <button
              type="button"
              onClick={() => setProjectType('react')}
              className={`px-2.5 sm:px-3 py-1 rounded-md font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                projectType === 'react'
                  ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-xs font-bold'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Layers size={13} className="text-cyan-500" />
              <span>React (Vite)</span>
            </button>

            {canAccessNode && (
              <button
                type="button"
                onClick={() => setProjectType('node')}
                className={`px-2.5 sm:px-3 py-1 rounded-md font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  projectType === 'node'
                    ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-xs font-bold'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Server size={13} className="text-emerald-500" />
                <span>Node + Express</span>
                {!nodeEnabled && isAdminUser && (
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold">
                    Hidden
                  </span>
                )}
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={handleReset}
            className="btn-secondary py-1.5 px-2.5 sm:px-3 text-xs flex items-center gap-1.5 shrink-0 cursor-pointer"
            title="Reset workspace to default starter files"
          >
            <RotateCcw size={13} />
            <span className="hidden sm:inline">Reset</span>
          </button>
        </div>
      </div>

      {/* Main IDE Workspace */}
      <div className="flex-1 min-h-0">
        <WebIDE
          key={`${projectType}_${resetKey}`}
          studentId={workspaceOwnerId}
          assignmentId={`practice_${projectType}`}
          projectType={projectType}
          isPracticeMode={true}
        />
      </div>
    </div>
  );
};

export default StudentPracticeIdePage;
