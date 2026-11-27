import React, { useState } from 'react';
import Editor from '@monaco-editor/react';
import {
  BookOpen,
  Code2,
  CheckCircle2,
  Lightbulb,
  Lock,
  Sparkles,
  ArrowRight,
  Info,
} from 'lucide-react';

export default function EducationalFileView({
  file,
  monacoTheme = 'vs',
  onJumpToEditable,
  editableTargetLabel = 'src/App.jsx',
}) {
  const [viewMode, setViewMode] = useState('guide'); // 'guide' | 'code'
  const guide = file?.guide || {
    badge: 'Project Scaffold File (Read-Only)',
    title: file?.name || 'Configuration File',
    summary: 'This file is part of the standard project configuration scaffold.',
    whyUsed: ['Provides configuration and metadata for build tools and package managers.'],
    keyPoints: ['Read-only in practice playground so your core setup stays valid.'],
    proTip: `Write your application logic inside ${editableTargetLabel}.`,
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[var(--bg-primary)] text-[var(--text-primary)] overflow-hidden">
      {/* Top Banner & Mode Switcher */}
      <div className="px-4 py-2.5 bg-[var(--bg-surface)] border-b border-[var(--border)] flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <Lock size={11} /> Read-Only Reference
          </span>
          <span className="text-xs font-mono text-[var(--text-secondary)] truncate">
            {file?.name}
          </span>
        </div>

        <div className="flex items-center gap-1 bg-[var(--bg-muted)] p-0.5 rounded-lg border border-[var(--border)] text-xs">
          <button
            type="button"
            onClick={() => setViewMode('guide')}
            className={`px-2.5 py-1 rounded-md font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              viewMode === 'guide'
                ? 'bg-[var(--bg-surface)] text-[var(--accent)] shadow-xs'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <BookOpen size={13} />
            <span>Why It&apos;s Used</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('code')}
            className={`px-2.5 py-1 rounded-md font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              viewMode === 'code'
                ? 'bg-[var(--bg-surface)] text-[var(--accent)] shadow-xs'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Code2 size={13} />
            <span>Inspect File Code</span>
          </button>
        </div>
      </div>

      {viewMode === 'code' ? (
        <div className="flex-1 min-h-0 flex flex-col">
          <div className="px-4 py-2 bg-[var(--accent-subtle)] border-b border-[var(--border)] flex items-center justify-between gap-2 text-xs">
            <span className="text-[var(--text-secondary)] flex items-center gap-1.5">
              <Info size={14} className="text-[var(--accent)] shrink-0" />
              Viewing actual scaffold file contents (read-only).
            </span>
            <button
              type="button"
              onClick={() => setViewMode('guide')}
              className="font-semibold text-[var(--accent)] hover:underline cursor-pointer shrink-0"
            >
              Back to Explanation
            </button>
          </div>
          <div className="flex-1 min-h-0">
            <Editor
              height="100%"
              theme={monacoTheme}
              path={file?.name}
              language={
                file?.language === 'javascriptreact' ? 'javascript' : file?.language || 'json'
              }
              value={file?.content || ''}
              options={{
                readOnly: true,
                minimap: { enabled: false },
                fontSize: 13,
                wordWrap: 'on',
                padding: { top: 14 },
                scrollBeyondLastLine: false,
                automaticLayout: true,
              }}
            />
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="max-w-2xl mx-auto space-y-4">
            {/* Hero Explanation Card */}
            <div className="card p-5 sm:p-6">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[var(--accent-subtle)] text-[var(--accent)] mb-3">
                <Sparkles size={12} />
                {guide.badge}
              </span>
              <h2 className="text-lg sm:text-xl font-bold text-[var(--text-primary)] mb-2">
                {guide.title}
              </h2>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                {guide.summary}
              </p>
            </div>

            {/* Why is this file used? */}
            {Array.isArray(guide.whyUsed) && guide.whyUsed.length > 0 && (
              <div className="card p-5">
                <h3 className="text-sm font-bold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                  Ye File / Folder Kyun Use Hota Hai?
                </h3>
                <ul className="space-y-2.5">
                  {guide.whyUsed.map((point, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-2.5 text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed"
                    >
                      <span className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Important Notes */}
            {Array.isArray(guide.keyPoints) && guide.keyPoints.length > 0 && (
              <div className="card p-5">
                <h3 className="text-sm font-bold text-[var(--text-primary)] mb-2.5">
                  Important Industry Rules
                </h3>
                <ul className="space-y-2">
                  {guide.keyPoints.map((pt, idx) => (
                    <li
                      key={idx}
                      className="text-xs sm:text-sm text-[var(--text-secondary)] flex items-start gap-2 leading-relaxed"
                    >
                      <span className="text-[var(--accent)] font-bold">•</span>
                      <span>{pt}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Pro Tip + Quick Action Buttons */}
            <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500 shrink-0">
                  <Lightbulb size={18} />
                </div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-0.5">
                    Developer Tip
                  </div>
                  <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
                    {guide.proTip}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setViewMode('code')}
                  className="btn-secondary text-xs py-2 px-3 flex items-center gap-1.5"
                >
                  <Code2 size={14} />
                  <span>See File Code</span>
                </button>
                {onJumpToEditable && (
                  <button
                    type="button"
                    onClick={onJumpToEditable}
                    className="btn-primary text-xs py-2 px-3.5 flex items-center gap-1.5"
                  >
                    <span>Code in {editableTargetLabel}</span>
                    <ArrowRight size={14} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
