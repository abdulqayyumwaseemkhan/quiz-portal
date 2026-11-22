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
    const relPath = prefix ? path.replace(prefix, '') : path;
    const fileName = relPath.split('/').pop();
    if (!fileName) continue;

    const ext = fileName.split('.').pop()?.toLowerCase() || '';

    if (IMAGE_EXTENSIONS.has(ext)) {
      const base64 = await zip.files[path].async('base64');
      const mime = ext === 'jpg' ? 'jpeg' : ext;
      const dataUrl = `data:image/${mime};base64,${base64}`;
      filesObj[fileName] = {
        name: fileName,
        isImage: true,
        url: dataUrl,
      };
    } else if (TEXT_EXTENSIONS[ext] || ext === '') {
      const content = await zip.files[path].async('string');
      filesObj[fileName] = {
        name: fileName,
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
 */
export async function extractRemoteZipToProjectFiles(zipUrl) {
  const response = await axios.get(zipUrl, {
    responseType: 'arraybuffer',
  });
  return extractZipToProjectFiles(response.data);
}

/**
 * Extracts project files from a public GitHub repository link
 * Accepts:
 *   https://github.com/owner/repo
 *   https://github.com/owner/repo/tree/branch
 */
export async function extractGitHubRepoToProjectFiles(githubUrl) {
  const match = githubUrl.trim().match(/github\.com\/([^/]+)\/([^/]+)(?:\/tree\/([^/]+))?/);
  if (!match) {
    throw new Error('Invalid GitHub repository URL format');
  }

  const owner = match[1];
  let repo = match[2];
  if (repo.endsWith('.git')) repo = repo.slice(0, -4);
  const branch = match[3] || 'main';

  // Strategy 1: Try public zipball download through github API or raw archive
  try {
    const zipUrl = `https://api.github.com/repos/${owner}/${repo}/zipball/${branch}`;
    const response = await axios.get(zipUrl, {
      responseType: 'arraybuffer',
      timeout: 10000,
    });
    return await extractZipToProjectFiles(response.data);
  } catch (err) {
    console.warn('GitHub zipball fetch failed, falling back to raw file probes:', err.message);
  }

  // Strategy 2: Fallback probe common starter files from jsDelivr / raw.githubusercontent.com
  const candidateBranches = [branch, 'master', 'main'];
  const commonFiles = ['index.html', 'style.css', 'styles.css', 'script.js', 'App.jsx', 'index.jsx', 'package.json'];
  const filesObj = {};

  for (const b of candidateBranches) {
    let anyFound = false;
    for (const f of commonFiles) {
      try {
        const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${b}/${f}`;
        const res = await axios.get(rawUrl, { timeout: 3500 });
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
    throw new Error('Could not automatically fetch repository source files. Please ensure the repository is public.');
  }

  return filesObj;
}
