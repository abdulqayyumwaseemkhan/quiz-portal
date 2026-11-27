import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import Editor from '@monaco-editor/react';
import {
  Play,
  Save,
  Upload,
  FilePlus,
  FolderPlus,
  X,
  Image as ImageIcon,
  FileCode,
  FileJson,
  FileText,
  Edit2,
  Trash2,
  Monitor,
  Tablet,
  Smartphone,
  Maximize2,
  Minimize2,
  Copy,
  Code,
  Eye,
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  RotateCcw,
  ArrowLeft,
  ExternalLink,
  Plus,
  Download,
  FolderArchive,
  Lock,
  Terminal,
  Server,
  Check,
} from 'lucide-react';
import toast from 'react-hot-toast';
import JSZip from 'jszip';
import API from '../../api';
import { useTheme } from '../../context/ThemeContext';
import { registerMonacoSnippets, setupAutoCloseTags } from './monacoSnippets';
import { extractZipToProjectFiles } from '../../utils/zipAndRepoExtractor';
import {
  VANILLA_STARTER_FILES,
  REACT_VITE_PRACTICE_FILES,
  NODE_EXPRESS_PRACTICE_FILES,
  detectLanguageFromPath,
} from './ideTemplates';
import EducationalFileView from './EducationalFileView';
import { buildReactPreviewHtml } from './reactModuleRunner';
import { createExpressSandbox } from './nodeExpressRunner';
import ExpressApiTester from './ExpressApiTester';

function getStarterFilesForType(projectType) {
  if (projectType === 'node') return NODE_EXPRESS_PRACTICE_FILES;
  if (projectType === 'react') return REACT_VITE_PRACTICE_FILES;
  return VANILLA_STARTER_FILES;
}

function getEducationalScaffoldOnly(templateObj = {}) {
  const out = {};
  Object.entries(templateObj).forEach(([k, val]) => {
    if (val?.isEducational) out[k] = val;
  });
  return out;
}

// Re-hydrates Vite React or Node/Express scaffold reference files onto saved/submitted workspaces
// without resurrecting any editable src/ files the student deleted, while leaving legacy flat projects untouched.
function hydrateProjectWithScaffold(parsedFiles, projectType) {
  if (!parsedFiles || typeof parsedFiles !== 'object') return parsedFiles;
  const keys = Object.keys(parsedFiles);
  const hasSrcTree = keys.some((k) => k.startsWith('src/'));
  if (hasSrcTree) {
    return {
      ...getEducationalScaffoldOnly(REACT_VITE_PRACTICE_FILES),
      ...parsedFiles,
    };
  }
  if (projectType === 'node' || keys.includes('server.js')) {
    return {
      ...getEducationalScaffoldOnly(NODE_EXPRESS_PRACTICE_FILES),
      ...parsedFiles,
    };
  }
  return parsedFiles;
}

function getDefaultActiveFile(filesObj, projectType) {
  if (!filesObj) return 'index.html';
  const keys = Object.keys(filesObj).filter((k) => !filesObj[k]?.isFolderKeep);
  if (filesObj['src/App.jsx']) return 'src/App.jsx';
  if ((projectType === 'node' || filesObj['server.js']) && filesObj['server.js']) return 'server.js';
  if (projectType === 'react' && filesObj['App.jsx']) return 'App.jsx';
  if (filesObj['index.html'] && !filesObj['index.html'].isEducational) return 'index.html';
  return keys.find((k) => !filesObj[k]?.isEducational) || keys[0] || 'index.html';
}

function getDefaultOpenTabs(filesObj, projectType) {
  if (!filesObj) return [];
  if (filesObj['src/App.jsx']) {
    return ['src/App.jsx', 'src/main.jsx', 'src/index.css'].filter((k) => Boolean(filesObj[k]));
  }
  if (projectType === 'node' || filesObj['server.js']) {
    return ['server.js', 'routes/studentRoutes.js', 'controllers/studentController.js'].filter(
      (k) => Boolean(filesObj[k])
    );
  }
  if (projectType === 'react' || filesObj['App.jsx']) {
    return ['App.jsx', 'index.jsx', 'styles.css'].filter((k) => Boolean(filesObj[k]));
  }
  return ['index.html', 'style.css', 'script.js'].filter((k) => Boolean(filesObj[k]));
}

// Build hierarchical folder/file tree from flat path map
function buildExplorerTree(filesMap = {}) {
  const root = { name: '', path: '', folders: {}, files: [] };

  Object.entries(filesMap).forEach(([rawPath, fileObj]) => {
    if (!fileObj) return;
    const cleanPath = rawPath.replace(/^\/+/, '');
    const parts = cleanPath.split('/').filter(Boolean);
    if (parts.length === 0) return;

    let cursor = root;
    for (let i = 0; i < parts.length - 1; i++) {
      const folderName = parts[i];
      const folderPath = parts.slice(0, i + 1).join('/');
      if (!cursor.folders[folderName]) {
        cursor.folders[folderName] = {
          name: folderName,
          path: folderPath,
          folders: {},
          files: [],
          isLockedScaffold: folderPath === 'node_modules' || folderPath.startsWith('node_modules/') || folderPath === 'public',
        };
      }
      cursor = cursor.folders[folderName];
    }

    const leafName = parts[parts.length - 1];
    if (fileObj.isFolderKeep || leafName === '.keep') {
      return;
    }

    cursor.files.push({
      ...fileObj,
      key: cleanPath,
      displayName: leafName,
    });
  });

  // Sort folders & files recursively (node_modules, public, src in standard VS Code order, then alphabetical)
  const FOLDER_PRIORITY = { node_modules: 1, public: 2, src: 3 };
  function sortNode(node) {
    const sortedFolders = Object.values(node.folders).sort((a, b) => {
      const pa = FOLDER_PRIORITY[a.name] || 10;
      const pb = FOLDER_PRIORITY[b.name] || 10;
      if (pa !== pb) return pa - pb;
      return a.name.localeCompare(b.name);
    });
    sortedFolders.forEach(sortNode);
    node.sortedFolders = sortedFolders;
    node.files.sort((a, b) => a.displayName.localeCompare(b.displayName));
  }

  sortNode(root);
  return root;
}

function getFileIcon(file) {
  if (file.isImage) return <ImageIcon size={14} className="shrink-0 text-purple-500" />;
  const lower = (file.displayName || file.name || '').toLowerCase();
  if (lower.endsWith('.jsx') || lower.endsWith('.tsx')) {
    return <FileCode size={14} className="shrink-0 text-cyan-500" />;
  }
  if (lower.endsWith('.js') || lower.endsWith('.mjs') || lower.endsWith('.cjs')) {
    return <FileCode size={14} className="shrink-0 text-amber-500" />;
  }
  if (lower.endsWith('.css')) {
    return <FileCode size={14} className="shrink-0 text-sky-500" />;
  }
  if (lower.endsWith('.html')) {
    return <FileCode size={14} className="shrink-0 text-orange-500" />;
  }
  if (lower.endsWith('.json')) {
    return <FileJson size={14} className="shrink-0 text-emerald-500" />;
  }
  if (lower.endsWith('.md') || lower.startsWith('.')) {
    return <FileText size={14} className="shrink-0 text-slate-400" />;
  }
  return <FileCode size={14} className="shrink-0 text-blue-500" />;
}

export default function WebIDE({
  initialProjectData,
  onSubmit,
  readOnly = false,
  studentId,
  assignmentId,
  projectType = 'vanilla', // 'vanilla' | 'react' | 'node'
}) {
  const { theme } = useTheme();
  const monacoTheme = theme === 'dark' ? 'vs-dark' : 'vs';

  // Versioned draft key for React/Node workspaces so Vite scaffold upgrades cleanly
  const draftVersionSuffix = projectType !== 'vanilla' ? '_v2' : '';
  const draftKey = `ide_draft_${studentId}_${assignmentId}${draftVersionSuffix}`;

  const starterTemplate = useMemo(
    () => getStarterFilesForType(projectType),
    [projectType]
  );

  const computedInitialFiles = useMemo(() => {
    if (initialProjectData) {
      if (typeof initialProjectData === 'string') {
        try {
          return hydrateProjectWithScaffold(JSON.parse(initialProjectData), projectType);
        } catch (e) {
          console.error('Failed to parse initialProjectData', e);
        }
      } else if (typeof initialProjectData === 'object') {
        return hydrateProjectWithScaffold(initialProjectData, projectType);
      }
    }
    if (!readOnly && studentId && assignmentId) {
      const draft = localStorage.getItem(draftKey);
      if (draft) {
        try {
          const parsed = JSON.parse(draft);
          if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
            return hydrateProjectWithScaffold(parsed, projectType);
          }
        } catch (e) {
          console.error('Failed to parse draft', e);
        }
      }
    }
    return starterTemplate;
  }, [initialProjectData, readOnly, studentId, assignmentId, draftKey, projectType, starterTemplate]);

  const isNodeProject = projectType === 'node';
  const isReactProject =
    !isNodeProject &&
    (projectType === 'react' ||
      Object.keys(computedInitialFiles).some((k) => k.endsWith('.jsx') || k.endsWith('.tsx')));

  const [files, setFiles] = useState(computedInitialFiles);
  const [activeFile, setActiveFile] = useState(() =>
    getDefaultActiveFile(computedInitialFiles, projectType)
  );
  const [openTabs, setOpenTabs] = useState(() =>
    getDefaultOpenTabs(computedInitialFiles, projectType)
  );
  const [previewFile, setPreviewFile] = useState('index.html');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewMode, setPreviewMode] = useState('default'); // 'hidden' | 'default' | 'full'
  const [deviceWidth, setDeviceWidth] = useState('100%'); // '100%' | '768px' | '375px'
  const [mobileTab, setMobileTab] = useState('code'); // 'files' | 'code' | 'preview'
  const [lastBlobUrl, setLastBlobUrl] = useState('');

  // Tree expansion state (src, src/components, routes, controllers, middleware expanded by default)
  const [expandedFolders, setExpandedFolders] = useState(
    () => new Set(['src', 'src/components', 'routes', 'controllers', 'middleware'])
  );

  // Inline VS Code create/rename state (replaces window.prompt for desktop + mobile!)
  const [inlineCreator, setInlineCreator] = useState(null); // { mode: 'file' | 'folder', parentPath: 'src' }
  const [inlineInputVal, setInlineInputVal] = useState('');
  const [renamingTarget, setRenamingTarget] = useState(null); // { kind: 'file' | 'folder', path: string }
  const [renameVal, setRenameVal] = useState('');

  // Console logs (for HTML/JS and React modes)
  const [consoleLogs, setConsoleLogs] = useState([]);
  const [showConsole, setShowConsole] = useState(false);

  // Node.js + Express in-browser sandbox state
  const [expressServer, setExpressServer] = useState(null);
  const [expressLogs, setExpressLogs] = useState([]);

  const iframeRef = useRef(null);
  const fileInputRef = useRef(null);
  const zipInputRef = useRef(null);
  const ideContainerRef = useRef(null);
  const autoCloseCleanupRef = useRef(null);
  const inlineInputRef = useRef(null);

  const explorerTree = useMemo(() => buildExplorerTree(files), [files]);

  // Focus inline input when opened
  useEffect(() => {
    if (inlineCreator && inlineInputRef.current) {
      inlineInputRef.current.focus();
    }
  }, [inlineCreator]);

  // Sync files whenever initialProjectData prop changes (e.g. teacher grading next student)
  useEffect(() => {
    if (initialProjectData) {
      let parsed = initialProjectData;
      if (typeof initialProjectData === 'string') {
        try {
          parsed = JSON.parse(initialProjectData);
        } catch (e) {
          console.error('Failed to parse initialProjectData', e);
        }
      }
      if (parsed && typeof parsed === 'object') {
        const hydrated = hydrateProjectWithScaffold(parsed, projectType);
        setFiles(hydrated);
        const defFile = getDefaultActiveFile(hydrated, projectType);
        setActiveFile(defFile);
        setOpenTabs(getDefaultOpenTabs(hydrated, projectType));
        setPreviewFile('index.html');
      }
    }
  }, [initialProjectData, projectType]);

  // Auto-save student workspace drafts locally
  useEffect(() => {
    if (!readOnly && studentId && assignmentId && files) {
      try {
        localStorage.setItem(draftKey, JSON.stringify(files));
      } catch {
        // storage quota fallback
      }
    }
  }, [files, readOnly, studentId, assignmentId, draftKey]);

  const openFileInEditor = useCallback((filePath) => {
    setActiveFile(filePath);
    setOpenTabs((prev) => (prev.includes(filePath) ? prev : [...prev, filePath]));
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setMobileTab('code');
    }
  }, []);

  const closeTab = (e, tabPath) => {
    e.stopPropagation();
    setOpenTabs((prev) => {
      const next = prev.filter((t) => t !== tabPath);
      if (activeFile === tabPath) {
        const fallback =
          next[next.length - 1] || getDefaultActiveFile(files, projectType);
        setActiveFile(fallback);
        if (next.length === 0 && fallback) return [fallback];
      }
      return next;
    });
  };

  const toggleFolder = (folderPath) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderPath)) next.delete(folderPath);
      else next.add(folderPath);
      return next;
    });
  };

  const handleEditorChange = (value) => {
    if (readOnly) return;
    const currentObj = files[activeFile];
    if (!currentObj || currentObj.readOnly || currentObj.isEducational) return;
    setFiles((prev) => ({
      ...prev,
      [activeFile]: {
        ...prev[activeFile],
        content: value ?? '',
      },
    }));
  };

  // Boot / Restart Node.js + Express Sandbox
  const runExpressServer = useCallback(() => {
    setExpressLogs([]);
    const instance = createExpressSandbox(files, (logItem) => {
      setExpressLogs((prev) => [...prev.slice(-99), logItem]);
    });
    setExpressServer(instance);
  }, [files]);

  // Compile & Run Web / React or Node Server
  const runCode = useCallback(() => {
    if (isNodeProject) {
      runExpressServer();
      return;
    }

    setConsoleLogs([]);
    let combinedHtml = '';

    if (isReactProject) {
      combinedHtml = buildReactPreviewHtml(files);
    } else {
      let currentPreview = previewFile;
      if (!files[currentPreview]) {
        currentPreview = 'index.html';
      }
      let html = files[currentPreview]?.content || '';
      const cssContents = Object.entries(files)
        .filter(([p, f]) => f && !f.isImage && !f.isEducational && p.endsWith('.css'))
        .map(([, f]) => f.content || '')
        .join('\n');
      let css = cssContents;

      const jsContents = Object.entries(files)
        .filter(([p, f]) => f && !f.isImage && !f.isEducational && p.endsWith('.js'))
        .map(([, f]) => f.content || '')
        .join('\n;\n');
      let js = jsContents;

      const imageUrls = {};
      Object.values(files).forEach((file) => {
        if (file?.isImage && file.url) {
          imageUrls[file.name] = file.url;
          imageUrls[file.name.split('/').pop()] = file.url;
        }
      });

      const escapeRegExp = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      Object.keys(imageUrls).forEach((imgName) => {
        if (!imgName) return;
        const regex = new RegExp(escapeRegExp(imgName), 'g');
        html = html.replace(regex, imageUrls[imgName]);
        css = css.replace(regex, imageUrls[imgName]);
        js = js.replace(regex, imageUrls[imgName]);
      });

      const bridgeScript = `
        <script>
          (function() {
            const forward = (level, args) => {
              try {
                const messages = Array.from(args).map((x) =>
                  typeof x === 'object' ? JSON.stringify(x) : String(x)
                );
                window.parent.postMessage({ type: 'IDE_CONSOLE', level, messages }, '*');
              } catch (_) {}
            };
            ['log', 'info', 'warn', 'error'].forEach((lvl) => {
              const orig = console[lvl];
              console[lvl] = function(...a) { forward(lvl, a); orig.apply(console, a); };
            });
            window.addEventListener('error', (e) => forward('error', [e.message]));
            document.addEventListener('click', function(e) {
              const a = e.target.closest('a');
              if (a && a.getAttribute('href')) {
                const href = a.getAttribute('href');
                if (!href.startsWith('http') && !href.startsWith('#') && !href.startsWith('mailto:')) {
                  e.preventDefault();
                  window.parent.postMessage({ type: 'NAVIGATE', path: href }, '*');
                }
              }
            });
          })();
        </script>
      `;

      const safeJs = js.replace(/<\/script>/gi, '<\\/script>');
      combinedHtml = `
        ${html}
        <style>${css}</style>
        ${bridgeScript}
        <script>
          try {
            ${safeJs}
          } catch (err) {
            console.error(err.message || err);
          }
        </script>
      `;
    }

    const blob = new Blob([combinedHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    setLastBlobUrl((prevUrl) => {
      if (prevUrl) URL.revokeObjectURL(prevUrl);
      return url;
    });

    if (iframeRef.current) {
      iframeRef.current.src = url;
    }
  }, [files, previewFile, isReactProject, isNodeProject, runExpressServer]);

  // Initial boot on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      runCode();
    }, 250);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialProjectData]);

  // Listen for iframe navigation & console logs
  useEffect(() => {
    const handleMessage = (e) => {
      if (e.data?.type === 'NAVIGATE') {
        const clean = String(e.data.path || '').replace(/^\.?\//, '');
        if (files[clean]) {
          setPreviewFile(clean);
          openFileInEditor(clean);
        } else {
          toast.error(`Page not found: ${clean}`);
        }
      } else if (e.data?.type === 'IDE_CONSOLE') {
        setConsoleLogs((prev) => [
          ...prev.slice(-79),
          {
            id: Date.now() + Math.random(),
            level: e.data.level || 'log',
            text: (e.data.messages || []).join(' '),
            time: new Date().toLocaleTimeString(),
          },
        ]);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [files, openFileInEditor]);

  const handleOpenInNewTab = () => {
    if (lastBlobUrl) {
      window.open(lastBlobUrl, '_blank');
    } else {
      runCode();
    }
  };

  // Start inline creation inside target folder (defaults to 'src' in React Vite workspace!)
  const startInlineCreate = (mode = 'file', targetFolder = null) => {
    if (readOnly) return;
    let defaultParent = targetFolder;
    if (defaultParent === null) {
      if (isReactProject && (files['src/main.jsx'] || files['src/App.jsx'])) {
        defaultParent = 'src';
      } else {
        defaultParent = '';
      }
    }
    if (defaultParent) {
      setExpandedFolders((prev) => new Set([...prev, defaultParent]));
    }
    setInlineCreator({ mode, parentPath: defaultParent });
    setInlineInputVal('');
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setMobileTab('files');
    }
  };

  const confirmInlineCreate = (e) => {
    if (e) e.preventDefault();
    if (!inlineCreator) return;
    const rawInput = inlineInputVal.trim().replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
    if (!rawInput) {
      setInlineCreator(null);
      return;
    }

    if (rawInput.includes('..')) {
      toast.error('Invalid name');
      return;
    }

    const basePrefix = inlineCreator.parentPath ? `${inlineCreator.parentPath}/` : '';

    if (inlineCreator.mode === 'folder') {
      const folderPath = `${basePrefix}${rawInput}`.replace(/\/+/g, '/');
      if (folderPath === 'node_modules' || folderPath.startsWith('node_modules/')) {
        toast.error('Cannot modify node_modules');
        return;
      }
      const keepKey = `${folderPath}/.keep`;
      const alreadyExists = Object.keys(files).some(
        (k) => k === keepKey || k.startsWith(`${folderPath}/`)
      );
      if (alreadyExists) {
        toast.error('Folder already exists');
        return;
      }
      setFiles((prev) => ({
        ...prev,
        [keepKey]: { name: keepKey, isFolderKeep: true, content: '' },
      }));
      // Expand newly created folder and all parent segments
      const segs = folderPath.split('/');
      setExpandedFolders((prev) => {
        const next = new Set(prev);
        segs.forEach((_, idx) => next.add(segs.slice(0, idx + 1).join('/')));
        return next;
      });
      setInlineCreator(null);
      setInlineInputVal('');
      toast.success(`Folder "${folderPath}" created`);
      return;
    }

    // Mode === 'file'
    let fileName = rawInput;
    if (!fileName.includes('.')) {
      fileName += isReactProject ? '.jsx' : '.js';
    }
    const fullPath = `${basePrefix}${fileName}`.replace(/\/+/g, '/');

    if (fullPath.startsWith('node_modules/')) {
      toast.error('Cannot create files inside node_modules');
      return;
    }
    if (files[fullPath] && !files[fullPath].isFolderKeep) {
      toast.error('A file with this name already exists');
      return;
    }

    const language = detectLanguageFromPath(fullPath);
    let starterContent = '';
    const baseBaseName = fullPath
      .split('/')
      .pop()
      .replace(/\.[^.]+$/, '')
      .replace(/[^a-zA-Z0-9_]/g, '');

    if (language === 'javascriptreact' && baseBaseName) {
      const compName = baseBaseName.charAt(0).toUpperCase() + baseBaseName.slice(1);
      starterContent = `export default function ${compName}() {\n  return (\n    <div>\n      <h2>${compName} Component</h2>\n    </div>\n  );\n}\n`;
    } else if (isNodeProject && fullPath.startsWith('routes/')) {
      starterContent = `const express = require('express');\nconst router = express.Router();\n\nrouter.get('/', (req, res) => {\n  res.json({ message: 'Route working!' });\n});\n\nmodule.exports = router;\n`;
    }

    setFiles((prev) => ({
      ...prev,
      [fullPath]: {
        name: fullPath,
        language,
        content: starterContent,
      },
    }));

    // Ensure all parent folders are expanded
    const parts = fullPath.split('/');
    if (parts.length > 1) {
      setExpandedFolders((prev) => {
        const next = new Set(prev);
        for (let i = 1; i < parts.length; i++) {
          next.add(parts.slice(0, i).join('/'));
        }
        return next;
      });
    }

    setInlineCreator(null);
    setInlineInputVal('');
    openFileInEditor(fullPath);
  };

  const startRename = (e, kind, targetPath) => {
    e.stopPropagation();
    if (readOnly) return;
    const leaf = targetPath.split('/').pop();
    setRenamingTarget({ kind, path: targetPath });
    setRenameVal(leaf);
  };

  const confirmRename = (e) => {
    if (e) e.preventDefault();
    if (!renamingTarget) return;
    const cleanLeaf = renameVal.trim().replace(/[/\\]/g, '');
    if (!cleanLeaf) {
      setRenamingTarget(null);
      return;
    }

    const oldPath = renamingTarget.path;
    const parentParts = oldPath.split('/').slice(0, -1);
    const newPath = [...parentParts, cleanLeaf].join('/');

    if (newPath === oldPath) {
      setRenamingTarget(null);
      return;
    }

    if (renamingTarget.kind === 'file') {
      if (files[newPath]) {
        toast.error('A file with this name already exists');
        return;
      }
      setFiles((prev) => {
        const next = { ...prev };
        const updatedObj = {
          ...next[oldPath],
          name: newPath,
          language: next[oldPath]?.isImage
            ? next[oldPath].language
            : detectLanguageFromPath(newPath),
        };
        next[newPath] = updatedObj;
        delete next[oldPath];
        return next;
      });
      setOpenTabs((prev) => prev.map((t) => (t === oldPath ? newPath : t)));
      if (activeFile === oldPath) setActiveFile(newPath);
    } else {
      // Rename folder prefix across all nested files
      const prefix = `${oldPath}/`;
      const conflict = Object.keys(files).some(
        (k) => k === newPath || k.startsWith(`${newPath}/`)
      );
      if (conflict) {
        toast.error('A folder with this name already exists');
        return;
      }
      setFiles((prev) => {
        const next = {};
        Object.entries(prev).forEach(([k, val]) => {
          if (k.startsWith(prefix)) {
            const replaced = `${newPath}/${k.slice(prefix.length)}`;
            next[replaced] = { ...val, name: replaced };
          } else {
            next[k] = val;
          }
        });
        return next;
      });
      setOpenTabs((prev) =>
        prev.map((t) => (t.startsWith(prefix) ? `${newPath}/${t.slice(prefix.length)}` : t))
      );
      if (activeFile.startsWith(prefix)) {
        setActiveFile(`${newPath}/${activeFile.slice(prefix.length)}`);
      }
      setExpandedFolders((prev) => {
        const next = new Set();
        prev.forEach((p) => {
          if (p === oldPath) next.add(newPath);
          else if (p.startsWith(prefix)) next.add(`${newPath}/${p.slice(prefix.length)}`);
          else next.add(p);
        });
        return next;
      });
    }

    setRenamingTarget(null);
  };

  const handleDeleteFile = (e, targetPath) => {
    e.stopPropagation();
    if (readOnly) return;
    const f = files[targetPath];
    if (f?.isEducational || f?.readOnly || f?.isProtectedEntry || targetPath === 'index.html') {
      toast.error('Protected starter/entry file cannot be deleted');
      return;
    }
    if (!window.confirm(`Delete "${targetPath}"?`)) return;

    setFiles((prev) => {
      const next = { ...prev };
      delete next[targetPath];
      return next;
    });
    setOpenTabs((prev) => {
      const remaining = prev.filter((t) => t !== targetPath);
      if (activeFile === targetPath) {
        const fallback = remaining[remaining.length - 1] || getDefaultActiveFile(files, projectType);
        setActiveFile(fallback);
        return remaining.length ? remaining : [fallback];
      }
      return remaining;
    });
  };

  const handleDeleteFolder = (e, folderPath) => {
    e.stopPropagation();
    if (readOnly) return;
    if (['src', 'node_modules', 'public'].includes(folderPath)) {
      toast.error(`Cannot delete root "${folderPath}" folder`);
      return;
    }
    if (!window.confirm(`Delete folder "${folderPath}" and all files inside it?`)) return;

    const prefix = `${folderPath}/`;
    setFiles((prev) => {
      const next = {};
      Object.entries(prev).forEach(([k, v]) => {
        if (!k.startsWith(prefix)) next[k] = v;
      });
      return next;
    });
    setOpenTabs((prev) => {
      const remaining = prev.filter((t) => !t.startsWith(prefix));
      if (activeFile.startsWith(prefix)) {
        const fallback = remaining[0] || getDefaultActiveFile(files, projectType);
        setActiveFile(fallback);
        return remaining.length ? remaining : [fallback];
      }
      return remaining;
    });
  };

  const handleImageUploadClick = () => {
    if (readOnly) return;
    fileInputRef.current?.click();
  };

  const compressImage = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          const MAX_DIMENSION = 2048;
          if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
            if (width > height) {
              height = Math.round((height * MAX_DIMENSION) / width);
              width = MAX_DIMENSION;
            } else {
              width = Math.round((width * MAX_DIMENSION) / height);
              height = MAX_DIMENSION;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (blob) {
                const compressedFile = new File(
                  [blob],
                  file.name.replace(/\.[^/.]+$/, '') + '.webp',
                  {
                    type: 'image/webp',
                    lastModified: Date.now(),
                  }
                );
                resolve(compressedFile);
              } else {
                reject(new Error('Canvas to Blob failed'));
              }
            },
            'image/webp',
            0.7
          );
        };
        img.onerror = (error) => reject(error);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleImageFileChange = async (e) => {
    if (readOnly) return;
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    const imageCount = Object.values(files).filter((f) => f?.isImage).length;
    if (imageCount >= 30) {
      toast.error('Maximum of 30 images allowed per workspace');
      return;
    }

    const toastId = toast.loading('Compressing image...');
    try {
      const compressedFile = await compressImage(file);
      if (compressedFile.size > 2 * 1024 * 1024) {
        toast.error('Image exceeds 2MB after compression. Please choose a smaller image.', {
          id: toastId,
        });
        return;
      }

      toast.loading('Uploading image...', { id: toastId });
      const formData = new FormData();
      formData.append('image', compressedFile);

      const res = await API.post('/student/ide/upload-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const url = res.data.url;
      const targetKey = isReactProject && files['src/App.jsx']
        ? `src/assets/${compressedFile.name}`
        : compressedFile.name;

      setFiles((prev) => ({
        ...prev,
        [targetKey]: { name: targetKey, isImage: true, url },
      }));
      if (targetKey.startsWith('src/assets/')) {
        setExpandedFolders((prev) => new Set([...prev, 'src', 'src/assets']));
      }
      openFileInEditor(targetKey);
      toast.success('Image uploaded!', { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error('Failed to upload image', { id: toastId });
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleZipFileChange = async (e) => {
    if (readOnly) return;
    const file = e.target.files?.[0];
    if (!file) return;

    const toastId = toast.loading('Extracting files from ZIP...');
    try {
      const extracted = await extractZipToProjectFiles(file);
      const count = Object.keys(extracted).length;
      if (count === 0) {
        toast.error('No supported web files found in ZIP', { id: toastId });
        return;
      }
      const nextFiles = hydrateProjectWithScaffold(extracted, projectType);
      setFiles(nextFiles);
      const first = getDefaultActiveFile(nextFiles, projectType);
      setActiveFile(first);
      setOpenTabs(getDefaultOpenTabs(nextFiles, projectType));
      toast.success(`Imported ${count} file(s) from ZIP!`, { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error('Failed to extract ZIP archive', { id: toastId });
    } finally {
      if (zipInputRef.current) zipInputRef.current.value = '';
    }
  };

  const handleExportZip = async () => {
    const toastId = toast.loading('Packaging project as ZIP...');
    try {
      const zip = new JSZip();
      for (const [pathKey, file] of Object.entries(files)) {
        if (!file || file.isFolderKeep || pathKey.startsWith('node_modules/')) continue;
        if (file.isImage && file.url) {
          if (file.url.startsWith('data:')) {
            const base64Data = file.url.split(',')[1];
            zip.file(pathKey, base64Data, { base64: true });
          } else {
            try {
              const res = await fetch(file.url);
              const blob = await res.blob();
              zip.file(pathKey, blob);
            } catch {
              // ignore remote fetch failure
            }
          }
        } else {
          zip.file(pathKey, file.content || '');
        }
      }
      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${projectType}_workspace_${Date.now()}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Project downloaded as ZIP!', { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error('Failed to export project ZIP', { id: toastId });
    }
  };

  const handleSubmit = async () => {
    if (readOnly || typeof onSubmit !== 'function') return;
    setIsSubmitting(true);
    try {
      // Strip static read-only educational scaffold files to keep MongoDB payload compact
      const leanFiles = {};
      Object.entries(files).forEach(([k, val]) => {
        if (val && !val.isEducational) {
          leanFiles[k] = val;
        }
      });
      await onSubmit(Object.keys(leanFiles).length > 0 ? leanFiles : files);
      if (studentId && assignmentId) {
        localStorage.removeItem(draftKey);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditorBeforeMount = (monaco) => {
    registerMonacoSnippets(monaco);
  };

  const handleEditorMount = (editor, monaco) => {
    registerMonacoSnippets(monaco);
    if (autoCloseCleanupRef.current) {
      autoCloseCleanupRef.current();
    }
    if (!readOnly) {
      autoCloseCleanupRef.current = setupAutoCloseTags(editor, monaco);
    }
  };

  useEffect(() => {
    return () => {
      if (autoCloseCleanupRef.current) {
        autoCloseCleanupRef.current();
      }
    };
  }, []);

  // Recursive VS Code Explorer Tree Renderer
  const renderInlineCreatorRow = (depth = 0) => (
    <form
      onSubmit={confirmInlineCreate}
      style={{ paddingLeft: `${depth * 14 + 12}px` }}
      className="pr-2 py-1.5 bg-[var(--accent-subtle)] border-y border-[var(--accent)]/30 flex items-center gap-1.5"
    >
      {inlineCreator?.mode === 'folder' ? (
        <FolderPlus size={14} className="text-[var(--accent)] shrink-0" />
      ) : (
        <FilePlus size={14} className="text-[var(--accent)] shrink-0" />
      )}
      <input
        ref={inlineInputRef}
        type="text"
        value={inlineInputVal}
        onChange={(e) => setInlineInputVal(e.target.value)}
        placeholder={
          inlineCreator?.mode === 'folder'
            ? 'Folder name (e.g. hooks)'
            : isReactProject
            ? 'Component.jsx or style.css'
            : 'filename.js'
        }
        className="flex-1 min-w-0 px-2 py-1 rounded text-xs bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--accent)] focus:outline-none"
        onKeyDown={(e) => {
          if (e.key === 'Escape') setInlineCreator(null);
        }}
      />
      <button
        type="submit"
        className="p-1 rounded bg-[var(--accent)] text-white shrink-0"
        title="Create"
      >
        <Check size={12} />
      </button>
      <button
        type="button"
        onClick={() => setInlineCreator(null)}
        className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] shrink-0"
        title="Cancel"
      >
        <X size={12} />
      </button>
    </form>
  );

  const renderTreeNodes = (node, depth = 0) => {
    const items = [];

    if (inlineCreator && inlineCreator.parentPath === node.path && node.path !== '') {
      items.push(
        <React.Fragment key={`creator_${node.path}`}>
          {renderInlineCreatorRow(depth)}
        </React.Fragment>
      );
    }

    (node.sortedFolders || []).forEach((folder) => {
      const isExpanded = expandedFolders.has(folder.path);
      const isNodeModules = folder.path === 'node_modules';
      const isPublic = folder.path === 'public';
      const isSrc = folder.path === 'src';
      const canAddInside = !readOnly && !folder.isLockedScaffold;
      const canModifyFolder =
        !readOnly &&
        !folder.isLockedScaffold &&
        !['src', 'routes', 'controllers', 'middleware'].includes(folder.path);

      const isRenamingThis =
        renamingTarget?.kind === 'folder' && renamingTarget.path === folder.path;

      items.push(
        <div key={`folder_${folder.path}`}>
          {isRenamingThis ? (
            <form
              onSubmit={confirmRename}
              style={{ paddingLeft: `${depth * 14 + 10}px` }}
              className="pr-2 py-1 flex items-center gap-1 bg-[var(--bg-muted)]"
            >
              <input
                type="text"
                autoFocus
                value={renameVal}
                onChange={(e) => setRenameVal(e.target.value)}
                onBlur={confirmRename}
                onKeyDown={(e) => e.key === 'Escape' && setRenamingTarget(null)}
                className="flex-1 min-w-0 px-2 py-0.5 rounded text-xs bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--accent)] focus:outline-none"
              />
            </form>
          ) : (
            <div
              style={{ paddingLeft: `${depth * 14 + 10}px` }}
              onClick={() => {
                toggleFolder(folder.path);
                // If student clicks node_modules directly, also open its educational guide so they immediately learn why it exists!
                if (isNodeModules && !isExpanded) {
                  const guideKey = Object.keys(files).find((k) => k.startsWith('node_modules/'));
                  if (guideKey) openFileInEditor(guideKey);
                }
              }}
              className="group flex items-center justify-between pr-2 py-1.5 cursor-pointer text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
            >
              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                {isExpanded ? (
                  <ChevronDown size={13} className="shrink-0 text-[var(--text-muted)]" />
                ) : (
                  <ChevronRight size={13} className="shrink-0 text-[var(--text-muted)]" />
                )}
                {isExpanded ? (
                  <FolderOpen
                    size={14}
                    className={`shrink-0 ${
                      isSrc
                        ? 'text-blue-500'
                        : isNodeModules || isPublic
                        ? 'text-amber-500/80'
                        : 'text-sky-500'
                    }`}
                  />
                ) : (
                  <Folder
                    size={14}
                    className={`shrink-0 ${
                      isSrc
                        ? 'text-blue-500'
                        : isNodeModules || isPublic
                        ? 'text-amber-500/80'
                        : 'text-sky-500'
                    }`}
                  />
                )}
                <span
                  className={`truncate ${
                    isNodeModules ? 'text-[var(--text-muted)] font-normal' : ''
                  }`}
                >
                  {folder.name}
                </span>
                {isSrc && (
                  <span className="text-[9px] font-bold uppercase px-1.5 py-0.2 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400">
                    code
                  </span>
                )}
                {folder.isLockedScaffold && (
                  <Lock size={10} className="text-[var(--text-muted)] shrink-0 ml-0.5" />
                )}
              </div>

              {/* Folder Quick Actions (Always visible on mobile, hover on desktop) */}
              <div
                className="flex items-center gap-0.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                onClick={(e) => e.stopPropagation()}
              >
                {canAddInside && (
                  <>
                    <button
                      type="button"
                      onClick={() => startInlineCreate('file', folder.path)}
                      title={`New File in ${folder.name}/`}
                      className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--bg-surface)]"
                    >
                      <FilePlus size={12} />
                    </button>
                    <button
                      type="button"
                      onClick={() => startInlineCreate('folder', folder.path)}
                      title={`New Folder in ${folder.name}/`}
                      className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--bg-surface)]"
                    >
                      <FolderPlus size={12} />
                    </button>
                  </>
                )}
                {canModifyFolder && (
                  <>
                    <button
                      type="button"
                      onClick={(e) => startRename(e, 'folder', folder.path)}
                      title="Rename Folder"
                      className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--bg-surface)]"
                    >
                      <Edit2 size={11} />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleDeleteFolder(e, folder.path)}
                      title="Delete Folder"
                      className="p-1 rounded text-[var(--text-muted)] hover:text-rose-500 hover:bg-[var(--bg-surface)]"
                    >
                      <Trash2 size={11} />
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {isExpanded && <div>{renderTreeNodes(folder, depth + 1)}</div>}
        </div>
      );
    });

    (node.files || []).forEach((file) => {
      const isActive = activeFile === file.key;
      const isLocked = Boolean(
        readOnly || file.isEducational || file.readOnly || file.isProtectedEntry || file.key === 'index.html'
      );
      const isRenamingThis =
        renamingTarget?.kind === 'file' && renamingTarget.path === file.key;

      if (isRenamingThis) {
        items.push(
          <form
            key={`rename_${file.key}`}
            onSubmit={confirmRename}
            style={{ paddingLeft: `${depth * 14 + 22}px` }}
            className="pr-2 py-1 flex items-center gap-1 bg-[var(--bg-muted)]"
          >
            <input
              type="text"
              autoFocus
              value={renameVal}
              onChange={(e) => setRenameVal(e.target.value)}
              onBlur={confirmRename}
              onKeyDown={(e) => e.key === 'Escape' && setRenamingTarget(null)}
              className="flex-1 min-w-0 px-2 py-0.5 rounded text-xs bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--accent)] focus:outline-none"
            />
          </form>
        );
        return;
      }

      items.push(
        <div
          key={file.key}
          style={{ paddingLeft: `${depth * 14 + 22}px` }}
          onClick={() => openFileInEditor(file.key)}
          className={`group flex items-center justify-between pr-2 py-1.5 cursor-pointer text-xs transition-colors ${
            isActive
              ? 'bg-[var(--accent-subtle)] text-[var(--accent)] font-bold border-r-2 border-[var(--accent)]'
              : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {getFileIcon(file)}
            <span className="truncate">{file.displayName}</span>
            {file.isEducational && (
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-[var(--bg-muted)] text-[var(--text-muted)] font-medium shrink-0">
                info
              </span>
            )}
          </div>

          {!isLocked && (
            <div
              className="flex items-center gap-0.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={(e) => startRename(e, 'file', file.key)}
                title="Rename File"
                className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--bg-surface)]"
              >
                <Edit2 size={11} />
              </button>
              <button
                type="button"
                onClick={(e) => handleDeleteFile(e, file.key)}
                title="Delete File"
                className="p-1 rounded text-[var(--text-muted)] hover:text-rose-500 hover:bg-[var(--bg-surface)]"
              >
                <Trash2 size={11} />
              </button>
            </div>
          )}
        </div>
      );
    });

    if (inlineCreator && inlineCreator.parentPath === '' && node.path === '') {
      items.unshift(
        <React.Fragment key="creator_root">{renderInlineCreatorRow(0)}</React.Fragment>
      );
    }

    return items;
  };

  const currentFileObj = files[activeFile];
  const isFullPreview = previewMode === 'full';
  const editableTarget = isNodeProject
    ? 'server.js'
    : files['src/App.jsx']
    ? 'src/App.jsx'
    : 'index.html';

  return (
    <div
      ref={ideContainerRef}
      className="flex flex-col h-full w-full bg-[var(--bg-primary)] text-[var(--text-primary)] relative overflow-hidden select-none"
    >
      {/* Top IDE Action Toolbar */}
      <div className="flex items-center justify-between px-2.5 sm:px-4 py-2 bg-[var(--bg-surface)] border-b border-[var(--border)] z-20 gap-2 shrink-0">
        <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0">
          {/* Run / Compile Button */}
          <button
            type="button"
            onClick={() => {
              if (!isReactProject && !isNodeProject && activeFile.endsWith('.html') && !files[activeFile]?.isEducational) {
                setPreviewFile(activeFile);
              }
              runCode();
              if (typeof window !== 'undefined' && window.innerWidth < 768) {
                setMobileTab('preview');
              }
            }}
            className="btn-primary py-1.5 px-3 text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0"
            title={isNodeProject ? 'Start / Restart Express Server' : 'Compile & Run Code'}
          >
            <Play size={13} className="fill-current" />
            <span>{isNodeProject ? 'Run Server' : 'Run'}</span>
          </button>

          {/* Desktop Output Visibility Toggle */}
          <button
            type="button"
            onClick={() => setPreviewMode(previewMode === 'hidden' ? 'default' : 'hidden')}
            className="hidden md:flex btn-secondary py-1.5 px-3 text-xs font-semibold items-center gap-1.5 cursor-pointer"
          >
            <Eye size={13} />
            <span>{previewMode === 'hidden' ? 'Show Output' : 'Hide Output'}</span>
          </button>

          {/* Mobile 3-Way Segmented Switcher (< md screens) */}
          <div className="flex md:hidden items-center bg-[var(--bg-muted)] p-0.5 rounded-lg border border-[var(--border)] text-[11px]">
            <button
              type="button"
              onClick={() => setMobileTab('files')}
              className={`px-2 py-1 rounded-md font-semibold flex items-center gap-1 transition-colors ${
                mobileTab === 'files'
                  ? 'bg-[var(--bg-surface)] text-[var(--accent)] shadow-xs font-bold'
                  : 'text-[var(--text-secondary)]'
              }`}
            >
              <Folder size={12} />
              <span>Files</span>
            </button>
            <button
              type="button"
              onClick={() => setMobileTab('code')}
              className={`px-2 py-1 rounded-md font-semibold flex items-center gap-1 transition-colors ${
                mobileTab === 'code'
                  ? 'bg-[var(--bg-surface)] text-[var(--accent)] shadow-xs font-bold'
                  : 'text-[var(--text-secondary)]'
              }`}
            >
              <Code size={12} />
              <span>Code</span>
            </button>
            <button
              type="button"
              onClick={() => {
                runCode();
                setMobileTab('preview');
              }}
              className={`px-2 py-1 rounded-md font-semibold flex items-center gap-1 transition-colors ${
                mobileTab === 'preview'
                  ? 'bg-[var(--bg-surface)] text-[var(--accent)] shadow-xs font-bold'
                  : 'text-[var(--text-secondary)]'
              }`}
            >
              {isNodeProject ? <Server size={12} /> : <Eye size={12} />}
              <span>{isNodeProject ? 'API' : 'Output'}</span>
            </button>
          </div>
        </div>

        {/* Right Side Status / Submit */}
        <div className="flex items-center gap-2 shrink-0">
          {!readOnly && typeof onSubmit === 'function' && (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex items-center gap-1.5 px-3 sm:px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs disabled:opacity-50 cursor-pointer"
              title="Save & Submit Assignment Workspace"
            >
              <Save size={13} />
              <span>{isSubmitting ? 'Submitting...' : 'Submit'}</span>
            </button>
          )}

          {!readOnly && !onSubmit && (
            <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-medium text-[var(--text-secondary)] bg-[var(--bg-muted)] border border-[var(--border)] px-2.5 py-1 rounded-lg">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Auto-Saved
            </span>
          )}

          {readOnly && (
            <span className="text-[11px] font-semibold text-[var(--text-secondary)] bg-[var(--bg-muted)] border border-[var(--border)] px-2.5 py-1 rounded-lg">
              Read-Only
            </span>
          )}
        </div>
      </div>

      {/* Main Split Workspace */}
      <div className="flex flex-1 overflow-hidden relative min-h-0">
        {/* VS Code Explorer Sidebar */}
        <div
          className={`${
            mobileTab === 'files'
              ? 'flex w-full absolute inset-0 z-30 md:static md:w-56 lg:w-64'
              : 'hidden md:flex md:w-56 lg:w-64'
          } ${
            isFullPreview ? 'md:hidden' : ''
          } bg-[var(--bg-surface)] border-r border-[var(--border)] flex-col shrink-0`}
        >
          <div className="px-3 py-2 text-[11px] font-bold text-[var(--text-secondary)] tracking-wider uppercase flex justify-between items-center border-b border-[var(--border)] bg-[var(--bg-muted)]/50 shrink-0">
            <span className="flex items-center gap-1.5 truncate">
              <Folder size={13} className="text-[var(--accent)] shrink-0" />
              <span>Explorer</span>
            </span>
            <div className="flex items-center gap-0.5">
              {!readOnly && (
                <>
                  <button
                    type="button"
                    onClick={() => startInlineCreate('file')}
                    title={isReactProject ? 'New File in src/' : 'New File'}
                    className="p-1.5 rounded text-[var(--text-secondary)] hover:text-[var(--accent)] hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
                  >
                    <FilePlus size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => startInlineCreate('folder')}
                    title={isReactProject ? 'New Folder in src/' : 'New Folder'}
                    className="p-1.5 rounded text-[var(--text-secondary)] hover:text-[var(--accent)] hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
                  >
                    <FolderPlus size={14} />
                  </button>
                  {!isNodeProject && (
                    <button
                      type="button"
                      onClick={handleImageUploadClick}
                      title="Upload Image Asset"
                      className="p-1.5 rounded text-[var(--text-secondary)] hover:text-[var(--accent)] hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
                    >
                      <Upload size={14} />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => zipInputRef.current?.click()}
                    title="Import Project .ZIP"
                    className="p-1.5 rounded text-[var(--text-secondary)] hover:text-[var(--accent)] hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
                  >
                    <FolderArchive size={14} />
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={handleExportZip}
                title="Download Workspace as .ZIP"
                className="p-1.5 rounded text-[var(--text-secondary)] hover:text-[var(--accent)] hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
              >
                <Download size={14} />
              </button>
              <button
                type="button"
                onClick={() => setMobileTab('code')}
                className="md:hidden p-1.5 rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                title="Close Explorer"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto py-1.5">
            {renderTreeNodes(explorerTree, 0)}
          </div>
        </div>

        {/* Center Editor / Educational Guide Area */}
        <div
          className={`${
            mobileTab === 'code' ? 'flex flex-1' : 'hidden md:flex md:flex-1'
          } ${
            isFullPreview ? 'md:hidden' : ''
          } flex-col min-w-0 bg-[var(--bg-surface)] min-h-0`}
        >
          {/* Open File Tabs Strip */}
          <div className="flex items-center border-b border-[var(--border)] bg-[var(--bg-muted)]/60 overflow-x-auto no-scrollbar shrink-0 px-1.5 pt-1 gap-1">
            {openTabs
              .filter((tabPath) => Boolean(files[tabPath]))
              .map((tabPath) => {
                const tabFile = files[tabPath];
                const isTabActive = activeFile === tabPath;
                const shortLabel = tabPath.split('/').pop();
                return (
                  <div
                    key={tabPath}
                    onClick={() => setActiveFile(tabPath)}
                    title={tabPath}
                    className={`group px-2.5 py-1.5 rounded-t-lg text-xs font-medium flex items-center gap-1.5 border-t border-x transition-colors whitespace-nowrap cursor-pointer ${
                      isTabActive
                        ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] border-[var(--border)] -mb-px font-bold shadow-xs'
                        : 'bg-transparent text-[var(--text-secondary)] border-transparent hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
                    }`}
                  >
                    {getFileIcon({ ...tabFile, displayName: shortLabel })}
                    <span>{shortLabel}</span>
                    {tabFile?.isEducational && (
                      <Lock size={10} className="text-amber-500 shrink-0" />
                    )}
                    {openTabs.length > 1 && (
                      <button
                        type="button"
                        onClick={(e) => closeTab(e, tabPath)}
                        className="ml-0.5 p-0.5 rounded hover:bg-[var(--bg-muted)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                        title="Close Tab"
                      >
                        <X size={11} />
                      </button>
                    )}
                  </div>
                );
              })}

            {!readOnly && (
              <button
                type="button"
                onClick={() => startInlineCreate('file')}
                className="p-1.5 text-[var(--text-muted)] hover:text-[var(--accent)] rounded-md transition-colors shrink-0 cursor-pointer"
                title={isReactProject ? 'New File inside src/' : 'New File'}
              >
                <Plus size={14} />
              </button>
            )}
          </div>

          {/* Breadcrumb Path Bar */}
          {activeFile && (
            <div className="px-3 py-1 bg-[var(--bg-surface)] border-b border-[var(--border)] text-[11px] font-mono text-[var(--text-muted)] flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-1 truncate">
                {activeFile.split('/').map((seg, idx, arr) => (
                  <React.Fragment key={`${seg}_${idx}`}>
                    <span
                      className={
                        idx === arr.length - 1
                          ? 'text-[var(--text-primary)] font-semibold'
                          : ''
                      }
                    >
                      {seg}
                    </span>
                    {idx < arr.length - 1 && <span>›</span>}
                  </React.Fragment>
                ))}
              </div>
              {isReactProject && activeFile.startsWith('src/') && (
                <span className="hidden sm:inline text-[10px] text-[var(--text-muted)]">
                  ES Modules (import / export) active
                </span>
              )}
            </div>
          )}

          {/* Active File Content View */}
          {currentFileObj?.isEducational ? (
            <EducationalFileView
              key={activeFile}
              file={currentFileObj}
              monacoTheme={monacoTheme}
              editableTargetLabel={editableTarget}
              onJumpToEditable={
                files[editableTarget] ? () => openFileInEditor(editableTarget) : undefined
              }
            />
          ) : currentFileObj?.isImage ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 bg-[var(--bg-primary)] relative overflow-y-auto">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(currentFileObj.url);
                  toast.success('Image URL copied!');
                }}
                className="btn-secondary absolute top-4 right-4 text-xs py-1.5 px-3 flex items-center gap-1.5"
              >
                <Copy size={13} />
                <span>Copy URL</span>
              </button>
              <img
                src={currentFileObj.url}
                alt={currentFileObj.name}
                className="max-w-full max-h-[55vh] object-contain mb-4 border border-[var(--border)] rounded-xl bg-[var(--bg-surface)] p-2"
              />
              <div className="bg-[var(--bg-surface)] border border-[var(--border)] px-3 py-2 rounded-lg text-xs font-mono text-[var(--text-primary)] select-all w-full max-w-xl overflow-x-auto whitespace-nowrap">
                {currentFileObj.url}
              </div>
              <p className="text-xs text-[var(--text-secondary)] mt-2 text-center">
                Import this image path or paste its URL in your HTML / JSX.
              </p>
            </div>
          ) : (
            <div className="flex-1 min-h-0 relative">
              <Editor
                height="100%"
                theme={monacoTheme}
                path={activeFile}
                language={currentFileObj?.language || detectLanguageFromPath(activeFile)}
                value={currentFileObj?.content || ''}
                onChange={handleEditorChange}
                beforeMount={handleEditorBeforeMount}
                onMount={handleEditorMount}
                options={{
                  readOnly: Boolean(readOnly || currentFileObj?.readOnly),
                  minimap: { enabled: false },
                  fontSize: 13,
                  wordWrap: 'on',
                  padding: { top: 12, bottom: 16 },
                  autoClosingBrackets: 'always',
                  autoClosingQuotes: 'always',
                  autoIndent: 'full',
                  formatOnPaste: true,
                  tabCompletion: 'on',
                  quickSuggestions: { other: true, comments: false, strings: true },
                  suggest: {
                    snippetsPreventQuickSuggestions: false,
                    showSnippets: true,
                  },
                  snippetSuggestions: 'top',
                  wordBasedSuggestions: 'matchingDocuments',
                  parameterHints: { enabled: true },
                  automaticLayout: true,
                  lineNumbersMinChars: 3,
                  scrollBeyondLastLine: false,
                }}
              />
            </div>
          )}
        </div>

        {/* Right Output / Express API Tester Area */}
        <div
          className={`${
            mobileTab === 'preview'
              ? 'flex w-full absolute inset-0 z-30 md:static'
              : previewMode === 'hidden'
              ? 'hidden'
              : 'hidden md:flex'
          } ${
            isFullPreview ? 'w-full md:w-full lg:w-full flex-1' : 'md:w-[46%] lg:w-[42%]'
          } bg-[var(--bg-surface)] border-l border-[var(--border)] flex-col shrink-0 min-h-0`}
        >
          {isNodeProject ? (
            <ExpressApiTester
              serverState={expressServer}
              logs={expressLogs}
              onClearLogs={() => setExpressLogs([])}
              onRestartServer={runExpressServer}
              onSendRequest={(reqPayload) =>
                expressServer
                  ? expressServer.dispatchRequest(reqPayload)
                  : Promise.resolve({
                      status: 500,
                      statusText: 'Stopped',
                      durationMs: 0,
                      data: { error: 'Click Run Server first' },
                    })
              }
              onBackToCodeMobile={() => setMobileTab('code')}
            />
          ) : (
            <>
              {/* Live Output Header */}
              <div className="px-3 py-2 bg-[var(--bg-muted)]/70 border-b border-[var(--border)] text-xs font-semibold text-[var(--text-secondary)] flex justify-between items-center gap-2 shrink-0">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setMobileTab('code')}
                    className="md:hidden flex items-center gap-1 text-[var(--text-primary)] font-bold py-1 px-2.5 bg-[var(--bg-surface)] rounded border border-[var(--border)]"
                  >
                    <ArrowLeft size={13} />
                    <span>Code</span>
                  </button>
                  <span className="font-bold text-[var(--text-primary)]">Live Output</span>
                </div>

                <div className="flex items-center gap-1 flex-wrap">
                  <button
                    type="button"
                    onClick={runCode}
                    title="Refresh Output"
                    className="p-1.5 rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
                  >
                    <RotateCcw size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={handleOpenInNewTab}
                    title="Open Preview in New Tab"
                    className="p-1.5 rounded text-[var(--text-secondary)] hover:text-[var(--accent)] hover:bg-[var(--bg-hover)]"
                  >
                    <ExternalLink size={14} />
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeviceWidth('375px')}
                    title="Mobile Viewport (375px)"
                    className={`hidden sm:inline-flex p-1.5 rounded ${
                      deviceWidth === '375px'
                        ? 'text-[var(--accent)] bg-[var(--accent-subtle)]'
                        : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <Smartphone size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeviceWidth('768px')}
                    title="Tablet Viewport (768px)"
                    className={`hidden sm:inline-flex p-1.5 rounded ${
                      deviceWidth === '768px'
                        ? 'text-[var(--accent)] bg-[var(--accent-subtle)]'
                        : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <Tablet size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeviceWidth('100%')}
                    title="Desktop Viewport (100%)"
                    className={`hidden sm:inline-flex p-1.5 rounded ${
                      deviceWidth === '100%'
                        ? 'text-[var(--accent)] bg-[var(--accent-subtle)]'
                        : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <Monitor size={14} />
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowConsole((s) => !s)}
                    title="Toggle Console Output"
                    className={`px-2 py-1 rounded text-[11px] font-semibold flex items-center gap-1 ${
                      showConsole
                        ? 'bg-[var(--accent-subtle)] text-[var(--accent)]'
                        : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
                    }`}
                  >
                    <Terminal size={13} />
                    <span>Console{consoleLogs.length > 0 ? ` (${consoleLogs.length})` : ''}</span>
                  </button>

                  {isFullPreview ? (
                    <button
                      type="button"
                      onClick={() => setPreviewMode('default')}
                      title="Restore Split View"
                      className="hidden md:inline-flex p-1.5 rounded text-[var(--accent)] bg-[var(--accent-subtle)]"
                    >
                      <Minimize2 size={14} />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setPreviewMode('full')}
                      title="Expand Full Preview"
                      className="hidden md:inline-flex p-1.5 rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
                    >
                      <Maximize2 size={14} />
                    </button>
                  )}
                </div>
              </div>

              {/* Iframe Preview Viewport */}
              <div className="flex-1 overflow-auto bg-slate-100 dark:bg-slate-900 flex justify-center items-start min-h-0">
                <div
                  style={{
                    width: deviceWidth,
                    height: '100%',
                    transition: 'width 0.2s ease',
                    backgroundColor: '#ffffff',
                  }}
                >
                  <iframe
                    ref={iframeRef}
                    title="Live Preview"
                    className="w-full h-full border-none bg-white"
                    sandbox="allow-scripts allow-modals allow-forms allow-same-origin"
                  />
                </div>
              </div>

              {/* Collapsible Console Logs Panel */}
              {showConsole && (
                <div className="h-40 border-t border-[var(--border)] bg-[var(--bg-primary)] flex flex-col shrink-0">
                  <div className="px-3 py-1.5 bg-[var(--bg-surface)] border-b border-[var(--border)] flex items-center justify-between text-[11px] font-bold">
                    <span className="flex items-center gap-1.5 text-[var(--text-secondary)]">
                      <Terminal size={12} /> Browser Console
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setConsoleLogs([])}
                        className="text-[var(--text-muted)] hover:text-rose-500 cursor-pointer"
                      >
                        Clear
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowConsole(false)}
                        className="text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-2 space-y-1 font-mono text-[11px]">
                    {consoleLogs.length === 0 ? (
                      <div className="text-[var(--text-muted)] px-1">
                        Console output from console.log() will appear here.
                      </div>
                    ) : (
                      consoleLogs.map((log) => (
                        <div
                          key={log.id}
                          className={`px-2 py-1 rounded border whitespace-pre-wrap break-words ${
                            log.level === 'error'
                              ? 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400'
                              : log.level === 'warn'
                              ? 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400'
                              : 'bg-[var(--bg-surface)] border-[var(--border)] text-[var(--text-primary)]'
                          }`}
                        >
                          <span className="text-[var(--text-muted)] mr-2">[{log.time}]</span>
                          {log.text}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Hidden inputs for image & ZIP uploads */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImageFileChange}
        className="hidden"
        accept="image/*"
      />
      <input
        type="file"
        ref={zipInputRef}
        onChange={handleZipFileChange}
        className="hidden"
        accept=".zip"
      />
    </div>
  );
}
