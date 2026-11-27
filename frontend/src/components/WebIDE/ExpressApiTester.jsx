import React, { useState } from 'react';
import {
  Send,
  RotateCcw,
  Terminal,
  Server,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
} from 'lucide-react';

const METHOD_COLORS = {
  GET: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
  POST: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30',
  PUT: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
  PATCH: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30',
  DELETE: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30',
};

export default function ExpressApiTester({
  serverState,
  logs = [],
  onClearLogs,
  onRestartServer,
  onSendRequest,
  onBackToCodeMobile,
}) {
  const [method, setMethod] = useState('GET');
  const [endpoint, setEndpoint] = useState('/api/students');
  const [jsonBody, setJsonBody] = useState('{\n  "name": "Zainab Ali",\n  "batch": "Batch 5",\n  "course": "Node.js & Express"\n}');
  const [response, setResponse] = useState(null);
  const [sending, setSending] = useState(false);
  const [activeBottomTab, setActiveBottomTab] = useState('response'); // 'response' | 'logs'

  const handleSend = async (e) => {
    if (e) e.preventDefault();
    if (!onSendRequest) return;
    setSending(true);
    try {
      const res = await onSendRequest({
        method,
        url: endpoint,
        body: ['POST', 'PUT', 'PATCH'].includes(method) ? jsonBody : undefined,
      });
      setResponse(res);
      setActiveBottomTab('response');
    } finally {
      setSending(false);
    }
  };

  const selectQuickRoute = (rt) => {
    const cleanMethod = rt.method === 'ALL' ? 'GET' : rt.method;
    setMethod(cleanMethod);
    // Replace :id with 101 so students can immediately test parameterized routes
    setEndpoint(rt.path.replace(/:id\b/g, '101'));
  };

  const isServerHealthy = serverState && !serverState.bootError;

  return (
    <div className="flex flex-col h-full w-full bg-[var(--bg-primary)] text-[var(--text-primary)] overflow-hidden">
      {/* Top Server Status Header */}
      <div className="px-3 py-2 bg-[var(--bg-surface)] border-b border-[var(--border)] flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          {onBackToCodeMobile && (
            <button
              type="button"
              onClick={onBackToCodeMobile}
              className="md:hidden flex items-center gap-1 text-xs font-bold py-1 px-2 rounded bg-[var(--bg-muted)] border border-[var(--border)]"
            >
              <ArrowLeft size={13} />
              <span>Code</span>
            </button>
          )}
          <Server size={15} className="text-[var(--accent)] shrink-0" />
          <span className="text-xs font-bold truncate">Express API Tester</span>
          {isServerHealthy ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 size={11} /> Port {serverState.port || 5000}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400">
              <AlertTriangle size={11} /> Stopped / Error
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={onRestartServer}
          className="btn-secondary py-1 px-2.5 text-[11px] flex items-center gap-1 cursor-pointer shrink-0"
          title="Restart Express Server"
        >
          <RotateCcw size={12} />
          <span>Restart Server</span>
        </button>
      </div>

      {/* Discovered Routes Bar */}
      {serverState?.routes?.length > 0 && (
        <div className="px-3 py-2 bg-[var(--bg-surface)]/60 border-b border-[var(--border)] flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mr-1 shrink-0">
            Routes:
          </span>
          {serverState.routes.map((rt, idx) => (
            <button
              key={`${rt.method}_${rt.path}_${idx}`}
              type="button"
              onClick={() => selectQuickRoute(rt)}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono border border-[var(--border)] bg-[var(--bg-surface)] hover:border-[var(--accent)] transition-colors shrink-0 cursor-pointer"
            >
              <span
                className={`font-bold text-[10px] px-1 rounded ${
                  METHOD_COLORS[rt.method] || 'text-[var(--accent)]'
                }`}
              >
                {rt.method}
              </span>
              <span className="text-[var(--text-primary)]">{rt.path}</span>
            </button>
          ))}
        </div>
      )}

      {/* Request Composer */}
      <form onSubmit={handleSend} className="p-3 border-b border-[var(--border)] bg-[var(--bg-surface)] space-y-2.5 shrink-0">
        <div className="flex items-center gap-1.5">
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-muted)] text-xs font-bold text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
          >
            <option value="GET">GET</option>
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
            <option value="PATCH">PATCH</option>
            <option value="DELETE">DELETE</option>
          </select>

          <input
            type="text"
            value={endpoint}
            onChange={(e) => setEndpoint(e.target.value)}
            placeholder="/api/students"
            className="flex-1 min-w-0 px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] text-xs font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
          />

          <button
            type="submit"
            disabled={sending}
            className="btn-primary py-1.5 px-3.5 text-xs font-bold flex items-center gap-1.5 shrink-0 cursor-pointer"
          >
            <Send size={12} />
            <span>{sending ? '...' : 'Send'}</span>
          </button>
        </div>

        {['POST', 'PUT', 'PATCH'].includes(method) && (
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1">
              Request JSON Body (req.body)
            </div>
            <textarea
              rows={4}
              value={jsonBody}
              onChange={(e) => setJsonBody(e.target.value)}
              spellCheck={false}
              className="w-full p-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] text-xs font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
            />
          </div>
        )}
      </form>

      {/* Response & Server Logs Tabs */}
      <div className="px-3 py-1.5 bg-[var(--bg-muted)] border-b border-[var(--border)] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 text-xs">
          <button
            type="button"
            onClick={() => setActiveBottomTab('response')}
            className={`px-2.5 py-1 rounded-md font-bold transition-colors cursor-pointer ${
              activeBottomTab === 'response'
                ? 'bg-[var(--bg-surface)] text-[var(--accent)] shadow-xs'
                : 'text-[var(--text-secondary)]'
            }`}
          >
            HTTP Response
          </button>
          <button
            type="button"
            onClick={() => setActiveBottomTab('logs')}
            className={`px-2.5 py-1 rounded-md font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeBottomTab === 'logs'
                ? 'bg-[var(--bg-surface)] text-[var(--accent)] shadow-xs'
                : 'text-[var(--text-secondary)]'
            }`}
          >
            <Terminal size={12} />
            <span>Terminal ({logs.length})</span>
          </button>
        </div>

        {activeBottomTab === 'logs' && logs.length > 0 && (
          <button
            type="button"
            onClick={onClearLogs}
            className="text-[11px] text-[var(--text-muted)] hover:text-rose-500 flex items-center gap-1 cursor-pointer"
          >
            <Trash2 size={12} /> Clear
          </button>
        )}
      </div>

      {/* Output Content */}
      <div className="flex-1 overflow-auto p-3 min-h-0">
        {serverState?.bootError && activeBottomTab === 'response' && (
          <div className="mb-3 p-3 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs font-mono whitespace-pre-wrap">
            <strong>Server Startup Error:</strong>
            {'\n'}
            {serverState.bootError}
          </div>
        )}

        {activeBottomTab === 'response' ? (
          response ? (
            <div className="space-y-2.5">
              <div className="flex items-center gap-2 flex-wrap text-xs">
                <span
                  className={`px-2 py-0.5 rounded font-bold ${
                    response.status >= 200 && response.status < 300
                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                      : response.status >= 400
                      ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                      : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                  }`}
                >
                  Status: {response.status} {response.statusText}
                </span>
                <span className="text-[var(--text-muted)] font-mono text-[11px]">
                  {response.durationMs} ms
                </span>
              </div>

              <pre className="p-3 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] text-xs font-mono text-[var(--text-primary)] overflow-x-auto whitespace-pre-wrap leading-relaxed">
                {typeof response.data === 'object'
                  ? JSON.stringify(response.data, null, 2)
                  : String(response.data ?? '')}
              </pre>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-[var(--text-muted)]">
              <Send size={26} className="mb-2 opacity-50" />
              <p className="text-xs font-medium">
                Select any Express route above or enter a path and click <strong>Send</strong> to test your backend API!
              </p>
            </div>
          )
        ) : (
          <div className="space-y-1 font-mono text-xs">
            {logs.length === 0 ? (
              <p className="text-[var(--text-muted)] text-xs p-2">No console output yet.</p>
            ) : (
              logs.map((item) => (
                <div
                  key={item.id}
                  className={`px-2.5 py-1.5 rounded border text-[11px] whitespace-pre-wrap break-words ${
                    item.level === 'error'
                      ? 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400'
                      : item.level === 'warn'
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400'
                      : 'bg-[var(--bg-surface)] border-[var(--border)] text-[var(--text-primary)]'
                  }`}
                >
                  <span className="text-[var(--text-muted)] mr-2">[{item.time}]</span>
                  {item.text}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
