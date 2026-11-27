import JSZip from 'jszip';
import axios from 'axios';

const TEXT_EXTENSIONS = {
  html: 'html',
  htm: 'html',
  css: 'css',
  js: 'javascript',
  jsx: 'javascriptreact',
  json: 'json',
  txt: 'plaintext',
  md: 'markdown',
  svg: 'html',
};

const IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'webp', 'gif', 'ico']);

// In-memory cache to prevent re-fetching and extracting files repeatedly
// Zero hits to Cloudinary / DB when navigating between students
const extractionCache = new Map();

export function getCachedExtraction(key) {
  if (!key) return null;
  return extractionCache.get(key) || null;
}

export function hasCachedExtraction(key) {
  if (!key) return false;
  return extractionCache.has(key);
}

export function setCachedExtraction(key, data) {
  if (key && data) {
    extractionCache.set(key, data);
  }
}

export function clearExtractionCache() {
  extractionCache.clear();
}

/**
 * Parses a ZIP file (Blob, File, or ArrayBuffer) and converts it to WebIDE files object
 */
export async function extractZipToProjectFiles(zipData) {
  const zip = await JSZip.loadAsync(zipData);
  const filesObj = {};

  const entries = Object.keys(zip.files).filter((path) => {
    // Ignore directories and macOS/OS metadata junk
    return (
      !zip.files[path].dir &&
      !path.includes('__MACOSX') &&
      !path.includes('.DS_Store') &&
      !path.includes('node_modules/') &&
      !path.includes('.git/')
    );
  });

  // Detect common root prefix (e.g. if zip has a folder "my-app/index.html")
  let prefix = '';
  if (entries.length > 0) {
    const firstSlash = entries[0].indexOf('/');
    if (firstSlash !== -1) {
      const candidate = entries[0].substring(0, firstSlash + 1);
      const allShare = entries.every((e) => e.startsWith(candidate));
      if (allShare) {
        prefix = candidate;
      }
    }
  }

  for (const path of entries) {
    const relPath = (prefix ? path.replace(prefix, '') : path).replace(/^\/+/, '');
    const fileName = relPath.split('/').pop();
    if (!fileName) continue;

    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    const storeKey = relPath || fileName;

    if (IMAGE_EXTENSIONS.has(ext)) {
      const base64 = await zip.files[path].async('base64');
      const mime = ext === 'jpg' ? 'jpeg' : ext;
      const dataUrl = `data:image/${mime};base64,${base64}`;
      filesObj[storeKey] = {
        name: storeKey,
        isImage: true,
        url: dataUrl,
      };
    } else if (TEXT_EXTENSIONS[ext] || ext === '') {
      const content = await zip.files[path].async('string');
      filesObj[storeKey] = {
        name: storeKey,
        language: TEXT_EXTENSIONS[ext] || 'javascript',
        content,
      };
    }
  }

  // Ensure an index.html exists for rendering
  if (!filesObj['index.html']) {
    const htmlKey = Object.keys(filesObj).find((k) => k.endsWith('.html'));
    if (htmlKey) {
      filesObj['index.html'] = {
        ...filesObj[htmlKey],
        name: 'index.html',
      };
    }
  }

  return filesObj;
}

/**
 * Extracts a remote ZIP URL (e.g. Cloudinary stored zip from student submission)
 * Uses intelligent in-memory caching to eliminate redundant Cloudinary / network requests
 */
export async function extractRemoteZipToProjectFiles(zipUrl, forceRefresh = false) {
  if (!zipUrl) return {};
  if (!forceRefresh && extractionCache.has(zipUrl)) {
    return extractionCache.get(zipUrl);
  }

  const response = await axios.get(zipUrl, {
    responseType: 'arraybuffer',
  });
  const filesObj = await extractZipToProjectFiles(response.data);
  extractionCache.set(zipUrl, filesObj);
  return filesObj;
}

/**
 * Extracts project files from a public GitHub repository link
 * Uses in-memory caching to avoid hitting GitHub API / rate-limits repeatedly
 */
export async function extractGitHubRepoToProjectFiles(githubUrl, forceRefresh = false) {
  let cleanUrl = (githubUrl || '').trim();
  if (!cleanUrl) return {};
  if (!/^https?:\/\//i.test(cleanUrl)) {
    cleanUrl = `https://${cleanUrl}`;
  }
  if (!forceRefresh && extractionCache.has(cleanUrl)) {
    return extractionCache.get(cleanUrl);
  }

  const match = cleanUrl.match(/github\.com\/([^/]+)\/([^/?#]+)(?:\/tree\/([^/?#]+))?/i);
  if (!match) {
    throw new Error('Invalid GitHub repository URL format');
  }

  const owner = match[1];
  let repo = match[2];
  if (repo.endsWith('.git')) repo = repo.slice(0, -4);
  const explicitBranch = match[3] || '';

  // Strategy 1: CORS-friendly GitHub Git Trees API + raw.githubusercontent.com
  const candidateBranches = explicitBranch
    ? [explicitBranch, 'main', 'master']
    : ['main', 'master'];

  // Try resolving exact default_branch from repo metadata first
  if (!explicitBranch) {
    try {
      const metaRes = await axios.get(`https://api.github.com/repos/${owner}/${repo}`, {
        timeout: 6000,
      });
      if (metaRes.data?.default_branch && !candidateBranches.includes(metaRes.data.default_branch)) {
        candidateBranches.unshift(metaRes.data.default_branch);
      } else if (metaRes.data?.default_branch) {
        candidateBranches.splice(candidateBranches.indexOf(metaRes.data.default_branch), 1);
        candidateBranches.unshift(metaRes.data.default_branch);
      }
    } catch {
      // fallback to main/master
    }
  }

  for (const b of candidateBranches) {
    try {
      const treeRes = await axios.get(
        `https://api.github.com/repos/${owner}/${repo}/git/trees/${b}?recursive=1`,
        { timeout: 8000 }
      );
      const treeEntries = (treeRes.data?.tree || []).filter((item) => {
        if (item.type !== 'blob' || !item.path) return false;
        if (
          item.path.includes('node_modules/') ||
          item.path.includes('dist/') ||
          item.path.includes('.git/') ||
          item.path.endsWith('package-lock.json') ||
          item.path.endsWith('yarn.lock')
        ) {
          return false;
        }
        const ext = item.path.split('.').pop()?.toLowerCase() || '';
        return Boolean(TEXT_EXTENSIONS[ext]);
      });

      if (treeEntries.length > 0) {
        const filesObj = {};
        const limitedEntries = treeEntries.slice(0, 45);
        await Promise.all(
          limitedEntries.map(async (entry) => {
            try {
              const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${b}/${entry.path}`;
              const res = await axios.get(rawUrl, {
                responseType: 'text',
                transformResponse: [(d) => d],
                timeout: 6000,
              });
              const ext = entry.path.split('.').pop()?.toLowerCase() || '';
              filesObj[entry.path] = {
                name: entry.path,
                language: TEXT_EXTENSIONS[ext] || 'javascript',
                content: typeof res.data === 'string' ? res.data : JSON.stringify(res.data, null, 2),
              };
            } catch {
              // skip unreadable individual blob
            }
          })
        );

        if (Object.keys(filesObj).length > 0) {
          extractionCache.set(cleanUrl, filesObj);
          return filesObj;
        }
      }
    } catch {
      // try next branch or fallback probe
    }
  }

  // Strategy 2: Direct raw file probes (works even when GitHub API rate-limit is reached)
  const commonFiles = [
    'index.html',
    'style.css',
    'styles.css',
    'script.js',
    'src/main.jsx',
    'src/App.jsx',
    'src/index.css',
    'App.jsx',
    'index.jsx',
    'package.json',
  ];
  const filesObj = {};

  for (const b of candidateBranches) {
    let anyFound = false;
    for (const f of commonFiles) {
      try {
        const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${b}/${f}`;
        const res = await axios.get(rawUrl, {
          responseType: 'text',
          transformResponse: [(d) => d],
          timeout: 3500,
        });
        if (res.data) {
          const ext = f.split('.').pop()?.toLowerCase();
          filesObj[f] = {
            name: f,
            language: TEXT_EXTENSIONS[ext] || 'javascript',
            content: typeof res.data === 'string' ? res.data : JSON.stringify(res.data, null, 2),
          };
          anyFound = true;
        }
      } catch {
        // file not present in this branch
      }
    }
    if (anyFound) break;
  }

  if (Object.keys(filesObj).length === 0) {
    throw new Error(
      'Could not fetch repository source files. Please verify that the GitHub repository is Public.'
    );
  }

  extractionCache.set(cleanUrl, filesObj);
  return filesObj;
}
