// Virtual ES Module & JSX Bundler for React Vite / Legacy React projects in WebIDE
// Supports nested folders inside src/, default & named imports/exports, relative paths (./, ../),
// @/ alias -> /src/, CSS imports, JSON imports, image asset imports, and pinpoint error reporting.

function escapeScriptTag(str = '') {
  return String(str).replace(/<\/script>/gi, '<\\/script>');
}

export function buildReactPreviewHtml(files = {}) {
  const virtualFiles = {};
  const imageMap = {};

  Object.entries(files).forEach(([rawPath, fileObj]) => {
    if (!fileObj) return;
    const normPath = '/' + rawPath.replace(/^\/+/, '');
    if (normPath.startsWith('/node_modules/')) return;

    if (fileObj.isImage && fileObj.url) {
      imageMap[rawPath] = fileObj.url;
      imageMap[rawPath.split('/').pop()] = fileObj.url;
      virtualFiles[normPath] = {
        type: 'image',
        url: fileObj.url,
      };
      return;
    }

    // Skip purely educational config files from runtime module bundle (except index.html shell)
    if (
      fileObj.isEducational &&
      normPath !== '/index.html' &&
      !normPath.startsWith('/public/')
    ) {
      return;
    }

    virtualFiles[normPath] = {
      type: 'code',
      content: fileObj.content || '',
    };
  });

  // Prepare HTML shell (strip Vite module script tag since our virtual bundler boots entry)
  let rawHtml =
    files['index.html']?.content ||
    '<!DOCTYPE html><html><head><meta charset="UTF-8" /></head><body><div id="root"></div></body></html>';

  rawHtml = rawHtml.replace(
    /<script\b[^>]*src=['"][^'"]*(?:main|index)\.(?:jsx|tsx|js|ts)['"][^>]*>\s*<\/script>/gi,
    ''
  );

  // Replace direct image filename references in index.html
  Object.entries(imageMap).forEach(([name, url]) => {
    if (!name) return;
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    rawHtml = rawHtml.replace(new RegExp(escaped, 'g'), url);
  });

  // Determine entry module (/src/main.jsx for Vite template, or /index.jsx for legacy assignments)
  let entryPath = '/src/main.jsx';
  if (!virtualFiles[entryPath]) {
    const candidates = [
      '/src/main.jsx',
      '/src/index.jsx',
      '/src/main.js',
      '/index.jsx',
      '/main.jsx',
      '/src/App.jsx',
      '/App.jsx',
    ];
    entryPath = candidates.find((c) => Boolean(virtualFiles[c])) || Object.keys(virtualFiles)[0] || '/src/main.jsx';
  }

  // Also collect global fallback styles if project doesn't explicitly import CSS (legacy support)
  const legacyGlobalCss =
    (!virtualFiles['/src/main.jsx'] && (files['style.css']?.content || files['styles.css']?.content)) || '';

  const serializedFs = escapeScriptTag(JSON.stringify(virtualFiles));
  const serializedImages = escapeScriptTag(JSON.stringify(imageMap));

  return `${rawHtml}
<style id="__legacy_global_css__">${legacyGlobalCss}</style>
<style>
  #__ide_error_overlay__ {
    display: none;
    position: fixed;
    inset: 12px;
    z-index: 99999;
    background: rgba(15, 23, 42, 0.97);
    color: #f8fafc;
    border: 1px solid #ef4444;
    border-radius: 12px;
    padding: 18px 20px;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    overflow: auto;
    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.45);
  }
  #__ide_error_overlay__ h3 {
    color: #f87171;
    margin: 0 0 8px 0;
    font-size: 14px;
    font-family: system-ui, sans-serif;
  }
  #__ide_error_overlay__ pre {
    margin: 0;
    font-size: 12px;
    line-height: 1.6;
    white-space: pre-wrap;
    word-break: break-word;
    color: #fecaca;
  }
</style>
<div id="__ide_error_overlay__">
  <h3 id="__ide_error_title__">Compile / Runtime Error</h3>
  <pre id="__ide_error_body__"></pre>
</div>

<script type="importmap">
{
  "imports": {
    "react": "https://esm.sh/react@18.3.1",
    "react-dom": "https://esm.sh/react-dom@18.3.1",
    "react-dom/client": "https://esm.sh/react-dom@18.3.1/client",
    "react/jsx-runtime": "https://esm.sh/react@18.3.1/jsx-runtime",
    "react-router-dom": "https://esm.sh/react-router-dom@6.28.0?deps=react@18.3.1,react-dom@18.3.1",
    "lucide-react": "https://esm.sh/lucide-react@0.460.0?deps=react@18.3.1"
  }
}
</script>

<script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>

<script>
  (function() {
    const sendConsole = (level, args) => {
      try {
        const formatted = Array.from(args).map((item) => {
          if (item instanceof Error) return item.stack || item.message;
          if (typeof item === 'object' && item !== null) {
            try { return JSON.stringify(item, null, 2); } catch { return String(item); }
          }
          return String(item);
        });
        window.parent.postMessage({ type: 'IDE_CONSOLE', level, messages: formatted }, '*');
      } catch (_) {}
    };

    ['log', 'info', 'warn', 'error'].forEach((lvl) => {
      const orig = console[lvl];
      console[lvl] = function(...args) {
        sendConsole(lvl, args);
        orig.apply(console, args);
      };
    });

    window.__showIdeError = function(title, err) {
      const box = document.getElementById('__ide_error_overlay__');
      const t = document.getElementById('__ide_error_title__');
      const b = document.getElementById('__ide_error_body__');
      const msg = err instanceof Error ? (err.message + (err.stack ? '\\n\\n' + err.stack : '')) : String(err);
      if (box && t && b) {
        t.textContent = title || 'Runtime Error';
        b.textContent = msg;
        box.style.display = 'block';
      }
      sendConsole('error', [title + ': ' + (err?.message || err)]);
    };

    window.addEventListener('error', (e) => {
      window.__showIdeError('Runtime Error', e.error || e.message);
    });
    window.addEventListener('unhandledrejection', (e) => {
      window.__showIdeError('Unhandled Promise Rejection', e.reason);
    });
  })();
</script>

<script type="module">
  import * as ReactPkg from 'react';
  import * as ReactDOMPkg from 'react-dom';
  import * as ReactDOMClientPkg from 'react-dom/client';

  const React = ReactPkg.default || ReactPkg;
  window.React = React;

  const VFS = ${serializedFs};
  const IMAGES = ${serializedImages};
  const ENTRY = ${JSON.stringify(entryPath)};

  // Preload optional external packages only if student code actually imports them
  const allCode = Object.values(VFS)
    .filter((f) => f.type === 'code')
    .map((f) => f.content)
    .join('\\n');

  const externalRegistry = {
    'react': ReactPkg.default ? { ...ReactPkg, __esModule: true, default: ReactPkg.default } : { ...ReactPkg, __esModule: true, default: ReactPkg },
    'react-dom': ReactDOMPkg,
    'react-dom/client': ReactDOMClientPkg,
  };

  try {
    if (/['"]lucide-react['"]/.test(allCode)) {
      externalRegistry['lucide-react'] = await import('lucide-react');
    }
    if (/['"]react-router-dom['"]/.test(allCode)) {
      externalRegistry['react-router-dom'] = await import('react-router-dom');
    }
  } catch (pkgErr) {
    console.warn('Optional package load warning:', pkgErr.message);
  }

  function normalizePath(parts) {
    const stack = [];
    for (const part of parts) {
      if (!part || part === '.') continue;
      if (part === '..') stack.pop();
      else stack.push(part);
    }
    return '/' + stack.join('/');
  }

  function resolveModulePath(fromFile, request) {
    let basePath = request.trim();
    if (basePath.startsWith('@/')) {
      basePath = '/src/' + basePath.slice(2);
    } else if (basePath.startsWith('/')) {
      basePath = normalizePath(basePath.split('/'));
    } else if (basePath.startsWith('./') || basePath.startsWith('../')) {
      const dirParts = fromFile.split('/').slice(0, -1);
      basePath = normalizePath([...dirParts, ...basePath.split('/')]);
    } else {
      return { external: true, id: basePath };
    }

    const candidates = [
      basePath,
      basePath + '.jsx',
      basePath + '.js',
      basePath + '.tsx',
      basePath + '.ts',
      basePath + '.json',
      basePath + '.css',
      basePath + '/index.jsx',
      basePath + '/index.js',
    ];

    for (const c of candidates) {
      if (VFS[c]) return { external: false, id: c };
    }
    throw new Error(\`Cannot find module "\${request}" imported from "\${fromFile.slice(1)}"\`);
  }

  const moduleCache = {};
  const injectedStyles = new Set();

  function replaceImageRefs(source) {
    let out = source;
    Object.entries(IMAGES).forEach(([imgName, url]) => {
      if (!imgName) return;
      const escaped = imgName.replace(/[.*+?^$\{}()|[\\]\\\\]/g, '\\\\$&');
      out = out.replace(new RegExp(escaped, 'g'), url);
    });
    return out;
  }

  function requireVirtual(fromFile, request) {
    if (externalRegistry[request]) {
      return externalRegistry[request];
    }

    const resolved = resolveModulePath(fromFile, request);
    if (resolved.external) {
      throw new Error(
        \`External package "\${resolved.id}" is not pre-bundled in offline sandbox. Supported packages: react, react-dom/client, lucide-react, react-router-dom.\`
      );
    }

    const targetPath = resolved.id;
    if (moduleCache[targetPath]) {
      return moduleCache[targetPath].exports;
    }

    const entry = VFS[targetPath];
    if (entry.type === 'image') {
      const mod = { exports: { __esModule: true, default: entry.url } };
      moduleCache[targetPath] = mod;
      return mod.exports;
    }

    if (targetPath.endsWith('.css')) {
      if (!injectedStyles.has(targetPath)) {
        const styleEl = document.createElement('style');
        styleEl.setAttribute('data-file', targetPath);
        styleEl.textContent = replaceImageRefs(entry.content);
        document.head.appendChild(styleEl);
        injectedStyles.add(targetPath);
      }
      const mod = { exports: {} };
      moduleCache[targetPath] = mod;
      return mod.exports;
    }

    if (targetPath.endsWith('.json')) {
      const parsed = JSON.parse(entry.content || '{}');
      const mod = { exports: parsed };
      moduleCache[targetPath] = mod;
      return mod.exports;
    }

    let compiledCode = '';
    try {
      const preprocessed = replaceImageRefs(entry.content).replace(
        /import\\.meta\\.env/g,
        '({ MODE: "development", DEV: true, PROD: false, VITE_APP_NAME: "React Practice App" })'
      );
      compiledCode = window.Babel.transform(preprocessed, {
        filename: targetPath.slice(1),
        presets: [
          ['react', { runtime: 'classic' }],
          ['env', { modules: 'commonjs' }],
        ],
      }).code;
    } catch (compileErr) {
      compileErr.message = \`[\${targetPath.slice(1)}] \\n\` + compileErr.message;
      throw compileErr;
    }

    const mod = { exports: {} };
    moduleCache[targetPath] = mod;

    const localRequire = (req) => requireVirtual(targetPath, req);
    const fn = new Function('module', 'exports', 'require', 'React', compiledCode);
    fn(mod, mod.exports, localRequire, React);
    return mod.exports;
  }

  try {
    // Legacy flat React assignment compatibility: if /index.jsx doesn't import App, expose global App
    if (ENTRY === '/index.jsx' && VFS['/App.jsx'] && !/import\\s+.*App/.test(VFS['/index.jsx'].content)) {
      const appMod = requireVirtual('/', './App.jsx');
      window.App = appMod.default || appMod.App || appMod;
    }

    const entryExports = requireVirtual('/', '.' + ENTRY);

    // If user selected App.jsx directly without main.jsx/index.jsx, mount it automatically
    if ((ENTRY.endsWith('App.jsx') || ENTRY.endsWith('App.js')) && document.getElementById('root')?.innerHTML === '') {
      const RootComp = entryExports.default || entryExports.App;
      if (typeof RootComp === 'function') {
        ReactDOMClientPkg.createRoot(document.getElementById('root')).render(React.createElement(RootComp));
      }
    }
  } catch (err) {
    window.__showIdeError('React Build / Runtime Error', err);
  }
</script>`;
}
