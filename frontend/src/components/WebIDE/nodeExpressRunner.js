// Safe 100% Client-Side Node.js + Express Simulator for Practice Web IDE
// Never executes code on the production backend — runs entirely in browser memory!
// Supports express(), express.Router(), app.use(), GET/POST/PUT/PATCH/DELETE, req.params, req.query, req.body,
// middleware chains (next), cors(), dotenv, CommonJS require/module.exports AND ES import/export!

function normalizeNodePath(parts) {
  const stack = [];
  for (const part of parts) {
    if (!part || part === '.') continue;
    if (part === '..') stack.pop();
    else stack.push(part);
  }
  return '/' + stack.join('/');
}

function parseDotEnv(raw = '') {
  const env = { PORT: '5000', NODE_ENV: 'development' };
  String(raw)
    .split('\n')
    .forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const idx = trimmed.indexOf('=');
      if (idx === -1) return;
      const key = trimmed.slice(0, idx).trim();
      let val = trimmed.slice(idx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      env[key] = val;
    });
  return env;
}

function matchRoutePattern(pattern, pathname) {
  const cleanPattern = ('/' + pattern).replace(/\/+/g, '/').replace(/\/$/, '') || '/';
  const cleanPath = ('/' + pathname).replace(/\/+/g, '/').replace(/\/$/, '') || '/';

  const pSegs = cleanPattern === '/' ? [] : cleanPattern.slice(1).split('/');
  const uSegs = cleanPath === '/' ? [] : cleanPath.slice(1).split('/');

  if (pSegs.length !== uSegs.length) return null;

  const params = {};
  for (let i = 0; i < pSegs.length; i++) {
    const p = pSegs[i];
    const u = uSegs[i];
    if (p.startsWith(':')) {
      params[p.slice(1)] = decodeURIComponent(u);
    } else if (p !== u) {
      return null;
    }
  }
  return params;
}

function joinMountPath(prefix = '', sub = '/') {
  const full = `${prefix}/${sub}`.replace(/\/+/g, '/');
  return full.length > 1 && full.endsWith('/') ? full.slice(0, -1) : full || '/';
}

function transpileEsmIfNeeded(code = '') {
  // Lightweight ESM -> CommonJS transform for student files if they write import/export in Node
  if (!/\b(import|export)\b/.test(code)) return code;
  let out = code;
  out = out.replace(
    /import\s+(\w+)\s+from\s+['"]([^'"]+)['"];?/g,
    'const $1 = require("$2");'
  );
  out = out.replace(
    /import\s+\{([^}]+)\}\s+from\s+['"]([^'"]+)['"];?/g,
    (_, names, mod) => `const { ${names.replace(/\s+as\s+/g, ': ')} } = require("${mod}");`
  );
  out = out.replace(/export\s+default\s+/g, 'module.exports = ');
  out = out.replace(
    /export\s+const\s+(\w+)\s*=/g,
    'const $1 = exports.$1 ='
  );
  out = out.replace(
    /export\s+function\s+(\w+)/g,
    'exports.$1 = function $1'
  );
  return out;
}

export function createExpressSandbox(files = {}, onLog = () => {}) {
  const logs = [];
  const pushLog = (level, ...args) => {
    const text = args
      .map((a) => {
        if (a instanceof Error) return a.message;
        if (typeof a === 'object' && a !== null) {
          try {
            return JSON.stringify(a);
          } catch {
            return String(a);
          }
        }
        return String(a);
      })
      .join(' ');
    const entry = { id: Date.now() + Math.random(), level, text, time: new Date().toLocaleTimeString() };
    logs.push(entry);
    onLog(entry);
  };

  const sandboxConsole = {
    log: (...a) => pushLog('log', ...a),
    info: (...a) => pushLog('info', ...a),
    warn: (...a) => pushLog('warn', ...a),
    error: (...a) => pushLog('error', ...a),
  };

  const envVars = parseDotEnv(files['.env']?.content || '');
  const processShim = {
    env: envVars,
    cwd: () => '/workspace',
    version: 'v22.0.0',
  };

  const vfs = {};
  Object.entries(files).forEach(([rawPath, fileObj]) => {
    if (!fileObj || fileObj.isImage) return;
    const norm = '/' + rawPath.replace(/^\/+/, '');
    if (norm.startsWith('/node_modules/')) return;
    vfs[norm] = fileObj.content || '';
  });

  // Track active Express app(s)
  let activeApp = null;
  let listeningPort = 5000;

  function createLayerContainer(isApp = false) {
    const stack = []; // { kind: 'middleware' | 'route' | 'router', method, path, handlers, router }

    const container = function (req, res, next) {
      if (next) next();
    };
    container.__isExpressRouter = true;
    container.__stack = stack;

    container.use = function (...args) {
      let mountPath = '/';
      let handlers = args;
      if (typeof args[0] === 'string') {
        mountPath = args[0];
        handlers = args.slice(1);
      }
      handlers.flat().forEach((h) => {
        if (h && h.__isExpressRouter) {
          stack.push({ kind: 'router', path: mountPath, router: h });
        } else if (typeof h === 'function') {
          stack.push({ kind: 'middleware', path: mountPath, handler: h });
        }
      });
      return container;
    };

    ['get', 'post', 'put', 'patch', 'delete', 'all'].forEach((method) => {
      container[method] = function (routePath, ...handlers) {
        stack.push({
          kind: 'route',
          method: method.toUpperCase(),
          path: routePath || '/',
          handlers: handlers.flat().filter((fn) => typeof fn === 'function'),
        });
        return container;
      };
    });

    if (isApp) {
      const settings = new Map();
      container.set = (k, v) => settings.set(k, v);
      container.get = function (pathOrSetting, ...handlers) {
        if (handlers.length === 0) return settings.get(pathOrSetting);
        stack.push({
          kind: 'route',
          method: 'GET',
          path: pathOrSetting || '/',
          handlers: handlers.flat().filter((fn) => typeof fn === 'function'),
        });
        return container;
      };
      container.listen = function (port, cb) {
        listeningPort = Number(port) || 5000;
        activeApp = container;
        if (typeof cb === 'function') cb();
        return { close: () => {} };
      };
      activeApp = container;
    }

    return container;
  }

  const expressShim = function () {
    return createLayerContainer(true);
  };
  expressShim.Router = () => createLayerContainer(false);
  expressShim.json = () => (req, _res, next) => next();
  expressShim.urlencoded = () => (req, _res, next) => next();
  expressShim.static = () => (_req, _res, next) => next();

  const builtins = {
    express: expressShim,
    cors: () => (_req, res, next) => {
      res.set('Access-Control-Allow-Origin', '*');
      next();
    },
    dotenv: {
      config: () => ({ parsed: envVars }),
    },
    path: {
      join: (...parts) => normalizeNodePath(parts.join('/').split('/')),
      resolve: (...parts) => normalizeNodePath(parts.join('/').split('/')),
      basename: (p = '') => p.split('/').pop() || '',
      extname: (p = '') => {
        const b = p.split('/').pop() || '';
        const i = b.lastIndexOf('.');
        return i > 0 ? b.slice(i) : '';
      },
    },
    crypto: {
      randomUUID: () =>
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : 'uuid-' + Math.random().toString(36).slice(2, 11),
    },
  };

  const moduleCache = {};

  function resolveNodeFile(fromFile, request) {
    if (builtins[request]) return { builtin: true, id: request };
    if (!request.startsWith('./') && !request.startsWith('../') && !request.startsWith('/')) {
      throw new Error(
        `Package "${request}" is not installed in browser sandbox. Built-in packages: express, cors, dotenv, path, crypto.`
      );
    }

    const baseDir = fromFile.split('/').slice(0, -1);
    const resolvedBase = request.startsWith('/')
      ? normalizeNodePath(request.split('/'))
      : normalizeNodePath([...baseDir, ...request.split('/')]);

    const candidates = [
      resolvedBase,
      resolvedBase + '.js',
      resolvedBase + '.cjs',
      resolvedBase + '.mjs',
      resolvedBase + '.json',
      resolvedBase + '/index.js',
    ];

    for (const c of candidates) {
      if (Object.prototype.hasOwnProperty.call(vfs, c)) {
        return { builtin: false, id: c };
      }
    }
    throw new Error(`Cannot find module '${request}' from '${fromFile.slice(1)}'`);
  }

  function requireNode(fromFile, request) {
    const resolved = resolveNodeFile(fromFile, request);
    if (resolved.builtin) return builtins[resolved.id];

    const target = resolved.id;
    if (moduleCache[target]) return moduleCache[target].exports;

    if (target.endsWith('.json')) {
      const parsed = JSON.parse(vfs[target] || '{}');
      moduleCache[target] = { exports: parsed };
      return parsed;
    }

    const mod = { exports: {} };
    moduleCache[target] = mod;

    const code = transpileEsmIfNeeded(vfs[target]);
    const dirname = target.split('/').slice(0, -1).join('/') || '/';
    const localRequire = (r) => requireNode(target, r);

    try {
      const fn = new Function(
        'module',
        'exports',
        'require',
        'console',
        'process',
        '__filename',
        '__dirname',
        code
      );
      fn(mod, mod.exports, localRequire, sandboxConsole, processShim, target, dirname);
    } catch (err) {
      err.message = `[${target.slice(1)}] ${err.message}`;
      throw err;
    }

    return mod.exports;
  }

  // Boot entry file (server.js / index.js / app.js)
  const entryCandidates = ['/server.js', '/index.js', '/app.js', '/src/server.js'];
  const entry = entryCandidates.find((c) => Object.prototype.hasOwnProperty.call(vfs, c));

  let bootError = null;
  if (!entry) {
    bootError = 'Entry file not found. Create a server.js file to start your Express server.';
    pushLog('error', bootError);
  } else {
    try {
      requireNode('/', '.' + entry);
    } catch (err) {
      bootError = err.message;
      pushLog('error', 'Server Crash:', err.message);
    }
  }

  // Collect registered endpoints for UI quick-select chips
  function collectRoutes(container, prefix = '') {
    if (!container || !container.__stack) return [];
    const list = [];
    for (const item of container.__stack) {
      if (item.kind === 'route') {
        list.push({
          method: item.method,
          path: joinMountPath(prefix, item.path),
        });
      } else if (item.kind === 'router') {
        list.push(...collectRoutes(item.router, joinMountPath(prefix, item.path)));
      }
    }
    return list;
  }

  // Dispatch simulated HTTP request through middleware + route stack
  async function dispatchRequest({ method = 'GET', url = '/', headers = {}, body = undefined }) {
    const startedAt = performance.now();
    if (bootError || !activeApp) {
      return {
        status: 500,
        statusText: 'Server Error',
        durationMs: 0,
        headers: { 'content-type': 'application/json' },
        data: { error: bootError || 'Express app was not initialized in server.js' },
      };
    }

    let parsedUrl;
    try {
      parsedUrl = new URL(url.startsWith('http') ? url : `http://localhost:${listeningPort}${url.startsWith('/') ? '' : '/'}${url}`);
    } catch {
      parsedUrl = new URL(`http://localhost:${listeningPort}/`);
    }

    const query = {};
    parsedUrl.searchParams.forEach((v, k) => {
      query[k] = v;
    });

    let parsedBody = body;
    if (typeof body === 'string' && body.trim()) {
      try {
        parsedBody = JSON.parse(body);
      } catch {
        parsedBody = body;
      }
    }

    const req = {
      method: method.toUpperCase(),
      url: parsedUrl.pathname + parsedUrl.search,
      originalUrl: parsedUrl.pathname + parsedUrl.search,
      path: parsedUrl.pathname,
      query,
      params: {},
      headers: { 'content-type': 'application/json', ...headers },
      body: parsedBody ?? {},
      get: (h) => req.headers[String(h).toLowerCase()],
    };

    const resHeaders = { 'x-powered-by': 'Express (Sandbox)' };
    let statusCode = 200;
    let finished = false;
    let responsePayload = null;

    let resolveRequest;
    const donePromise = new Promise((resolve) => {
      resolveRequest = resolve;
    });

    const finalize = (payload) => {
      if (finished) return;
      finished = true;
      responsePayload = payload;
      resolveRequest();
    };

    const res = {
      status(code) {
        statusCode = Number(code) || 200;
        return res;
      },
      set(k, v) {
        resHeaders[String(k).toLowerCase()] = String(v);
        return res;
      },
      header(k, v) {
        return res.set(k, v);
      },
      json(data) {
        resHeaders['content-type'] = 'application/json; charset=utf-8';
        finalize(data);
        return res;
      },
      send(data) {
        if (typeof data === 'object' && data !== null) {
          resHeaders['content-type'] = 'application/json; charset=utf-8';
        } else {
          resHeaders['content-type'] = 'text/plain; charset=utf-8';
        }
        finalize(data);
        return res;
      },
      sendStatus(code) {
        statusCode = Number(code) || 200;
        finalize({ status: statusCode });
        return res;
      },
      end(data = '') {
        finalize(data);
        return res;
      },
    };

    // Flatten executable pipeline for current request
    const pipeline = [];
    function flattenContainer(container, prefix = '') {
      for (const layer of container.__stack || []) {
        if (layer.kind === 'middleware') {
          const mount = joinMountPath(prefix, layer.path);
          if (mount === '/' || req.path === mount || req.path.startsWith(mount + '/')) {
            pipeline.push({ type: 'mw', fn: layer.handler });
          }
        } else if (layer.kind === 'router') {
          const mount = joinMountPath(prefix, layer.path);
          if (mount === '/' || req.path === mount || req.path.startsWith(mount + '/')) {
            flattenContainer(layer.router, mount);
          }
        } else if (layer.kind === 'route') {
          if (layer.method === 'ALL' || layer.method === req.method) {
            const fullPattern = joinMountPath(prefix, layer.path);
            const matchedParams = matchRoutePattern(fullPattern, req.path);
            if (matchedParams) {
              layer.handlers.forEach((fn) => {
                pipeline.push({ type: 'route', fn, params: matchedParams });
              });
            }
          }
        }
      }
    }

    flattenContainer(activeApp, '');

    let idx = 0;
    const next = async (err) => {
      if (finished) return;
      if (err) {
        statusCode = 500;
        pushLog('error', 'Route Error:', err.message || err);
        finalize({ message: err.message || 'Internal Server Error' });
        return;
      }
      const step = pipeline[idx++];
      if (!step) {
        if (!finished) {
          statusCode = 404;
          finalize({
            error: `Cannot ${req.method} ${req.path}`,
            hint: 'Check your route path and HTTP method in server.js / routes/',
          });
        }
        return;
      }
      if (step.params) {
        req.params = { ...req.params, ...step.params };
      }
      try {
        await step.fn(req, res, next);
      } catch (handlerErr) {
        await next(handlerErr);
      }
    };

    // Safety timeout so infinite middleware without res.send/next doesn't freeze UI
    const timeoutId = setTimeout(() => {
      if (!finished) {
        statusCode = 504;
        finalize({
          error: 'Request timed out (3s). Make sure your middleware calls next() or sends a response with res.json() / res.send().',
        });
      }
    }, 3000);

    await next();
    await donePromise;
    clearTimeout(timeoutId);

    const STATUS_LABELS = {
      200: 'OK',
      201: 'Created',
      204: 'No Content',
      400: 'Bad Request',
      401: 'Unauthorized',
      403: 'Forbidden',
      404: 'Not Found',
      500: 'Internal Server Error',
      504: 'Gateway Timeout',
    };

    return {
      status: statusCode,
      statusText: STATUS_LABELS[statusCode] || 'Response',
      durationMs: Math.max(1, Math.round(performance.now() - startedAt)),
      headers: resHeaders,
      data: responsePayload,
    };
  }

  return {
    port: listeningPort,
    bootError,
    routes: collectRoutes(activeApp),
    logs,
    dispatchRequest,
  };
}
