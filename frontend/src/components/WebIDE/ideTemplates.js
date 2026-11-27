// Starter workspaces, language helpers, and simple English educational scaffold guides for WebIDE

export function detectLanguageFromPath(filePath = '') {
  const clean = filePath.split('/').pop()?.toLowerCase() || '';
  if (clean === '.gitignore' || clean === '.env' || clean.startsWith('.env.')) return 'ini';
  const ext = clean.includes('.') ? clean.split('.').pop() : '';
  switch (ext) {
    case 'html':
    case 'htm':
    case 'svg':
      return 'html';
    case 'css':
      return 'css';
    case 'jsx':
    case 'tsx':
    case 'js':
    case 'mjs':
    case 'cjs':
    case 'ts':
      return 'javascript';
    case 'json':
      return 'json';
    case 'md':
      return 'markdown';
    default:
      return 'plaintext';
  }
}

export const VANILLA_STARTER_FILES = {
  'index.html': {
    name: 'index.html',
    language: 'html',
    content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Web Playground</title>
</head>
<body>
  <main class="card">
    <span class="badge">HTML5 • CSS3 • ES6+</span>
    <h1>Hello Web Developer</h1>
    <p>Edit <code>index.html</code>, <code>style.css</code>, and <code>script.js</code> to build your project.</p>
    <button id="actionBtn">Click Counter (0)</button>
  </main>
</body>
</html>`,
  },
  'style.css': {
    name: 'style.css',
    language: 'css',
    content: `* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  min-height: 100vh;
  display: grid;
  place-items: center;
  background: #f4f6f8;
  color: #273444;
  padding: 24px;
}

.card {
  background: #ffffff;
  border: 1px solid #e3e8ed;
  border-radius: 8px;
  padding: 32px;
  max-width: 460px;
  width: 100%;
}

.badge {
  display: inline-block;
  font-size: 11px;
  font-weight: 600;
  color: #526f91;
  background: #eef2f6;
  padding: 4px 10px;
  border-radius: 4px;
  margin-bottom: 12px;
}

h1 {
  font-size: 22px;
  margin-bottom: 8px;
}

p {
  color: #697789;
  line-height: 1.6;
  margin-bottom: 20px;
  font-size: 14px;
}

button {
  background: #526f91;
  color: #ffffff;
  border: none;
  padding: 9px 16px;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
}

button:hover {
  background: #435c7a;
}
`,
  },
  'script.js': {
    name: 'script.js',
    language: 'javascript',
    content: `let clicks = 0;
const btn = document.getElementById('actionBtn');

if (btn) {
  btn.addEventListener('click', () => {
    clicks += 1;
    btn.textContent = \`Click Counter (\${clicks})\`;
    console.log('Button clicked:', clicks);
  });
}
`,
  },
};

// Kept for backward compatibility with legacy flat assignment submissions
export const LEGACY_REACT_ASSIGNMENT_FILES = {
  'index.html': {
    name: 'index.html',
    language: 'html',
    content: '<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <title>React App</title>\n</head>\n<body>\n  <div id="root"></div>\n</body>\n</html>',
  },
  'styles.css': {
    name: 'styles.css',
    language: 'css',
    content: 'body {\n  font-family: sans-serif;\n  padding: 20px;\n}\n\n.App {\n  text-align: center;\n}',
  },
  'App.jsx': {
    name: 'App.jsx',
    language: 'javascript',
    content: 'import React, { useState } from "react";\n\nexport default function App() {\n  const [count, setCount] = useState(0);\n  return (\n    <div className="App">\n      <h1>Hello React</h1>\n      <button onClick={() => setCount(c => c + 1)}>Count is {count}</button>\n    </div>\n  );\n}\n',
  },
  'index.jsx': {
    name: 'index.jsx',
    language: 'javascript',
    content: 'import React from "react";\nimport { createRoot } from "react-dom/client";\nimport App from "./App.jsx";\n\nconst root = createRoot(document.getElementById("root"));\nroot.render(<App />);\n',
  },
};

export const REACT_VITE_PRACTICE_FILES = {
  'node_modules/react/package.json': {
    name: 'node_modules/react/package.json',
    language: 'json',
    isEducational: true,
    readOnly: true,
    guide: {
      badge: 'Installed Dependencies Folder (Auto-Generated)',
      title: 'node_modules/ — Third-Party Packages Directory',
      summary:
        'When you run "npm install" in a real project, npm downloads React, Vite, Oxlint, and all required libraries into the node_modules folder.',
      whyUsed: [
        'Stores the source code of external libraries listed in your package.json (such as react, react-dom, and vite).',
        'Managed automatically by npm — developers never manually edit files inside node_modules.',
        'Because this folder can contain thousands of files, it is excluded from Git using .gitignore.',
      ],
      keyPoints: [
        'If you delete node_modules on your computer, running "npm install" recreates it automatically from package.json.',
        'When you write "import { useState } from \'react\'", the bundler resolves React from this folder.',
      ],
      proTip: 'Leave node_modules untouched and write all of your React components and folders inside the "src/" directory.',
    },
    content: `{
  "name": "react",
  "description": "React is a JavaScript library for building user interfaces.",
  "version": "19.0.0",
  "main": "index.js",
  "exports": {
    ".": "./index.js",
    "./jsx-runtime": "./jsx-runtime.js"
  }
}`,
  },
  'node_modules/vite/package.json': {
    name: 'node_modules/vite/package.json',
    language: 'json',
    isEducational: true,
    readOnly: true,
    guide: {
      badge: 'Build Tool Package (Read-Only)',
      title: 'node_modules/vite — Vite Development Server & Bundler',
      summary:
        'Vite is a fast modern build tool that runs your React project during development and bundles it for production deployment.',
      whyUsed: [
        'Starts a local development server in milliseconds and updates the browser instantly when you edit code (Hot Module Replacement).',
        'Optimizes, minifies, and bundles your JSX and CSS files into static production files when you run "npm run build".',
      ],
      keyPoints: [
        'Vite has replaced older tools like Create React App (CRA) as the modern standard for React projects.',
      ],
      proTip: 'You can customize how Vite behaves using the "vite.config.js" file in the project root.',
    },
    content: `{
  "name": "vite",
  "version": "7.0.0",
  "description": "Native-ESM powered web dev build tool"
}`,
  },
  'public/vite.svg': {
    name: 'public/vite.svg',
    language: 'html',
    isEducational: true,
    readOnly: true,
    guide: {
      badge: 'Static Public Assets Folder',
      title: 'public/ — Unprocessed Static Files',
      summary:
        'The "public/" folder holds static files (such as favicons, logos, or robots.txt) that are served directly from the root URL "/" without bundling.',
      whyUsed: [
        'Ideal for browser icons (favicon.ico, vite.svg), manifest files, or static documents that need a fixed URL.',
        'Files inside public/ are copied directly to the final build folder without being transformed by Vite.',
      ],
      keyPoints: [
        'Images used inside specific React components are usually placed inside "src/assets/" and imported in JSX.',
        'Global site icons referenced in index.html belong in "public/".',
      ],
      proTip: 'You can upload images directly into your workspace using the Upload Image icon in the Explorer toolbar.',
    },
    content: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="64" height="64">
  <rect width="32" height="32" rx="6" fill="#526F91" />
  <path d="M10 16l4 4 8-8" stroke="#FFFFFF" stroke-width="3" fill="none" stroke-linecap="round" />
</svg>`,
  },
  'src/main.jsx': {
    name: 'src/main.jsx',
    language: 'javascript',
    isProtectedEntry: true,
    content: `import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
`,
  },
  'src/index.css': {
    name: 'src/index.css',
    language: 'css',
    content: `* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  background-color: #f4f6f8;
  color: #273444;
  line-height: 1.6;
}

.app-container {
  max-width: 680px;
  margin: 40px auto;
  padding: 0 20px;
}

.card {
  background: #ffffff;
  border: 1px solid #e3e8ed;
  border-radius: 8px;
  padding: 28px;
}

.card h1 {
  font-size: 22px;
  margin-bottom: 8px;
}

.card p {
  color: #697789;
  font-size: 14px;
  margin-bottom: 20px;
}

.actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.btn {
  padding: 8px 16px;
  border-radius: 6px;
  border: 1px solid #d0d8e0;
  background: #ffffff;
  color: #273444;
  font-weight: 600;
  cursor: pointer;
}

.btn-primary {
  background: #526f91;
  border-color: #526f91;
  color: #ffffff;
}

.btn-primary:hover {
  background: #435c7a;
}
`,
  },
  'src/App.jsx': {
    name: 'src/App.jsx',
    language: 'javascript',
    content: `import { useState } from 'react';

export default function App() {
  const [count, setCount] = useState(0);

  return (
    <main className="app-container">
      <section className="card">
        <h1>Vite + React Workspace</h1>
        <p>
          Edit <code>src/App.jsx</code> or create your own folders (such as{' '}
          <code>components/</code>) and files inside <code>src/</code> to build your React application.
        </p>

        <div className="actions">
          <button className="btn btn-primary" onClick={() => setCount((c) => c + 1)}>
            Count: {count}
          </button>
          <button className="btn" onClick={() => setCount(0)}>
            Reset
          </button>
        </div>
      </section>
    </main>
  );
}
`,
  },
  '.env': {
    name: '.env',
    language: 'ini',
    isEducational: true,
    readOnly: true,
    guide: {
      badge: 'Environment Variables (Read-Only Guide)',
      title: '.env — Environment Configuration File',
      summary:
        'The ".env" file stores environment-specific values like API base URLs and public configuration keys outside your source code.',
      whyUsed: [
        'Lets you use different API URLs for local development (localhost) and live production servers without changing your code.',
        'In Vite projects, frontend variables must start with "VITE_" (for example, VITE_API_URL) and are read via "import.meta.env.VITE_API_URL".',
        'Real .env files containing private keys should never be uploaded to public GitHub repositories.',
      ],
      keyPoints: [
        'Never put private database passwords or secret server keys inside a frontend React .env file because frontend code runs in the user\'s browser.',
      ],
      proTip: 'Teams usually commit a safe ".env.example" file with placeholder values so other developers know which variables are needed.',
    },
    content: `# Vite Frontend Environment Variables
VITE_APP_NAME="React Academic App"
VITE_API_BASE_URL="https://api.example.com/v1"
`,
  },
  '.gitignore': {
    name: '.gitignore',
    language: 'ini',
    isEducational: true,
    readOnly: true,
    guide: {
      badge: 'Git Version Control (Read-Only Guide)',
      title: '.gitignore — Files Ignored by Git',
      summary:
        'The ".gitignore" file tells Git which folders and files should NOT be tracked or uploaded when you push your project to GitHub.',
      whyUsed: [
        'Skips heavy auto-generated folders like "node_modules/" and build output folders like "dist/".',
        'Prevents sensitive environment files like ".env" from accidentally leaking online.',
        'Keeps your Git repository clean, fast, and free of temporary OS/editor files.',
      ],
      keyPoints: [
        'Each line specifies a file name, folder name, or wildcard pattern (such as *.log) for Git to ignore.',
      ],
      proTip: 'Always double-check that "node_modules" and ".env" are listed in .gitignore before making your first Git commit.',
    },
    content: `# Dependencies
node_modules

# Production build output
dist
dist-ssr

# Environment files
.env
.env.local
.env.*.local

# Editor & OS files
.vscode/*
.DS_Store
*.log
`,
  },
  '.oxlintrc.json': {
    name: '.oxlintrc.json',
    language: 'json',
    isEducational: true,
    readOnly: true,
    guide: {
      badge: 'Fast Code Linter (Read-Only Guide)',
      title: '.oxlintrc.json — Oxlint Configuration',
      summary:
        'Oxlint is an ultra-fast JavaScript and React linter written in Rust that scans your code to catch bugs, typos, and bad practices early.',
      whyUsed: [
        'Detects unused variables, missing React key props, broken imports, and invalid hook calls before you even run the app.',
        'Runs 50x–100x faster than traditional linters, making code checks nearly instant in modern Vite projects.',
      ],
      keyPoints: [
        'Enables specialized rule plugins for "react", "import", and accessibility ("jsx-a11y").',
        'In a local terminal, running "npx oxlint" checks your entire codebase in milliseconds.',
      ],
      proTip: 'Using a linter like Oxlint alongside Prettier keeps your code both bug-free (Linter) and cleanly formatted (Prettier).',
    },
    content: `{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "import", "jsx-a11y"],
  "categories": {
    "correctness": "error",
    "suspicious": "warn"
  },
  "rules": {
    "no-unused-vars": "warn",
    "react/jsx-key": "error",
    "react/rules-of-hooks": "error"
  },
  "ignorePatterns": ["dist", "node_modules"]
}`,
  },
  'eslint.config.js': {
    name: 'eslint.config.js',
    language: 'javascript',
    isEducational: true,
    readOnly: true,
    guide: {
      badge: 'Code Quality Config (Read-Only Guide)',
      title: 'eslint.config.js — ESLint Rules Configuration',
      summary:
        'ESLint analyzes your JavaScript and JSX files to enforce coding standards and ensure React Hooks (like useState and useEffect) are used properly.',
      whyUsed: [
        'Prevents subtle bugs such as calling React Hooks inside loops or conditional if-statements.',
        'Ensures every developer on a team follows consistent JavaScript best practices.',
      ],
      keyPoints: [
        'Modern ESLint (v9+) uses this single "eslint.config.js" flat configuration file instead of older ".eslintrc" files.',
      ],
      proTip: 'In VS Code, the ESLint extension reads this file to underline potential code issues directly in the editor.',
    },
    content: `import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

export default [
  { ignores: ['dist'] },
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2024,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
    },
  },
];
`,
  },
  'index.html': {
    name: 'index.html',
    language: 'html',
    isEducational: true,
    readOnly: true,
    guide: {
      badge: 'Vite Root HTML Shell (Read-Only Guide)',
      title: 'index.html — Single Page Application Entry Point',
      summary:
        'React apps are Single Page Applications (SPAs). The browser loads this single index.html file, which provides an empty <div id="root"></div> container.',
      whyUsed: [
        'Loads "/src/main.jsx" via a <script type="module"> tag to boot your React application.',
        'React attaches itself to <div id="root"></div> and dynamically renders all your components inside it.',
        'Used to set the browser tab <title>, favicon, and external <link> tags such as Google Fonts.',
      ],
      keyPoints: [
        'In Vite, index.html sits at the root of the project rather than inside the public/ folder.',
      ],
      proTip: 'Build your user interface inside "src/App.jsx" and your own component files in "src/" instead of writing HTML directly in index.html.',
    },
    content: `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Vite + React App</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
`,
  },
  'package.json': {
    name: 'package.json',
    language: 'json',
    isEducational: true,
    readOnly: true,
    guide: {
      badge: 'Project Manifest (Read-Only Guide)',
      title: 'package.json — Project Metadata, Scripts & Dependencies',
      summary:
        'Every Node.js and React project has a package.json file at its root. It defines your project name, terminal commands (scripts), and installed packages.',
      whyUsed: [
        '"scripts": Defines commands like "npm run dev" (start dev server), "npm run build" (create production bundle), and "npm run lint".',
        '"dependencies": Lists libraries needed at runtime in the browser (such as react, react-dom, react-router-dom, lucide-react).',
        '"devDependencies": Lists tools only needed during development and building (such as vite, oxlint, and eslint).',
      ],
      keyPoints: [
        'In this Web IDE, react, react-dom, lucide-react, and react-router-dom are already pre-configured and ready to import.',
      ],
      proTip: 'Whenever you open an unfamiliar project on GitHub, read package.json first to understand its tech stack and scripts.',
    },
    content: `{
  "name": "react-vite-workspace",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "lint": "oxlint && eslint .",
    "preview": "vite preview"
  },
  "dependencies": {
    "lucide-react": "^0.460.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-router-dom": "^6.28.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^5.0.0",
    "eslint": "^9.20.0",
    "oxlint": "^0.16.0",
    "vite": "^7.0.0"
  }
}`,
  },
  'package-lock.json': {
    name: 'package-lock.json',
    language: 'json',
    isEducational: true,
    readOnly: true,
    guide: {
      badge: 'Dependency Lockfile (Auto-Generated)',
      title: 'package-lock.json — Exact Dependency Version Lock',
      summary:
        'While package.json allows flexible version ranges (like ^19.0.0), package-lock.json records the exact version and download integrity hash of every installed package.',
      whyUsed: [
        'Guarantees that every teammate and deployment server installs the exact same package versions.',
        'Prevents unexpected bugs caused by minor third-party library updates.',
      ],
      keyPoints: [
        'Generated and updated automatically by npm — you never edit this file manually.',
        'Unlike node_modules, package-lock.json SHOULD be committed to Git.',
      ],
      proTip: 'Cloud hosts like Vercel and GitHub Actions use package-lock.json via "npm ci" for fast, reproducible builds.',
    },
    content: `{
  "name": "react-vite-workspace",
  "version": "0.1.0",
  "lockfileVersion": 3,
  "requires": true,
  "packages": {
    "": {
      "name": "react-vite-workspace",
      "version": "0.1.0",
      "dependencies": {
        "react": "^19.0.0",
        "react-dom": "^19.0.0"
      }
    }
  }
}`,
  },
  'vite.config.js': {
    name: 'vite.config.js',
    language: 'javascript',
    isEducational: true,
    readOnly: true,
    guide: {
      badge: 'Bundler Config (Read-Only Guide)',
      title: 'vite.config.js — Vite Build & Plugin Configuration',
      summary:
        'This file configures how Vite compiles JSX, resolves folder path aliases, and runs the local development server.',
      whyUsed: [
        'Registers "@vitejs/plugin-react" so JSX syntax and React Fast Refresh work seamlessly.',
        'Configures clean import aliases (such as "@" pointing to "/src") and local API proxy rules.',
      ],
      keyPoints: [
        'The "@/" alias (for example, import Card from "@/components/Card") is already enabled for you in this Web IDE.',
      ],
      proTip: 'In full-stack projects, developers often add a "server.proxy" rule here to forward "/api" requests to their Express backend.',
    },
    content: `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  server: {
    port: 5173,
  },
});
`,
  },
  'README.md': {
    name: 'README.md',
    language: 'markdown',
    isEducational: true,
    readOnly: true,
    guide: {
      badge: 'Project Documentation (Read-Only Guide)',
      title: 'README.md — Project Documentation & Setup Guide',
      summary:
        'README.md is the front-page documentation of a software repository, written in Markdown and displayed automatically on GitHub.',
      whyUsed: [
        'Explains what the project does, which technologies were used, and how another developer can install and run it.',
        'Helps instructors, teammates, and employers quickly understand your work.',
      ],
      keyPoints: [
        'Uses Markdown syntax (# Headings, **Bold**, bullet lists, and fenced code blocks).',
      ],
      proTip: 'Always include a clear description, feature list, and setup commands in the README.md of your portfolio projects.',
    },
    content: `# React + Vite Workspace

## Project Structure
- \`src/main.jsx\` — Application entry point
- \`src/App.jsx\` — Main root component
- \`src/index.css\` — Global stylesheet

## Getting Started
1. Use the **New Folder** or **New File** icons on \`src/\` to organize your own folders (e.g., \`src/components/\`) and \`.jsx\` files.
2. Export components with \`export default\` or named \`export\`, and import them into \`src/App.jsx\`.
3. Type ES7+ shortcuts like \`rafce\`, \`usf\`, or \`uef\`, use **Format** for Prettier formatting, and click **Run** to preview!
`,
  },
};

export const NODE_EXPRESS_PRACTICE_FILES = {
  'node_modules/express/package.json': {
    name: 'node_modules/express/package.json',
    language: 'json',
    isEducational: true,
    readOnly: true,
    guide: {
      badge: 'Backend Dependencies Folder (Read-Only)',
      title: 'node_modules/ — Installed Node.js Packages',
      summary:
        'When you run "npm install express cors dotenv" in a backend project, npm downloads Express and all supporting libraries into node_modules.',
      whyUsed: [
        'Holds the code for Express routing, middleware helpers, CORS, and environment loaders.',
        'Excluded from Git repositories using .gitignore because npm can recreate it anytime from package.json.',
      ],
      keyPoints: [
        'When you call require(\'express\') in server.js, Node.js loads Express from this directory.',
      ],
      proTip: 'Organize your API endpoints in "routes/" and keep request handling logic clean inside "controllers/".',
    },
    content: `{
  "name": "express",
  "description": "Fast, unopinionated, minimalist web framework for node.",
  "version": "5.1.0"
}`,
  },
  'server.js': {
    name: 'server.js',
    language: 'javascript',
    isProtectedEntry: true,
    content: `const express = require('express');
const cors = require('cors');
const logger = require('./middleware/logger');
const studentRoutes = require('./routes/studentRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Global Middleware
app.use(cors());
app.use(express.json());
app.use(logger);

// Health Check Route
app.get('/', (req, res) => {
  res.json({
    success: true,
    service: 'Express Backend Practice API',
    port: PORT,
    endpoints: [
      'GET    /api/students',
      'GET    /api/students/:id',
      'POST   /api/students',
      'DELETE /api/students/:id',
    ],
  });
});

// Mount Modular Routes
app.use('/api/students', studentRoutes);

app.listen(PORT, () => {
  console.log(\`Express server listening on http://localhost:\${PORT}\`);
});
`,
  },
  'routes/studentRoutes.js': {
    name: 'routes/studentRoutes.js',
    language: 'javascript',
    content: `const express = require('express');
const router = express.Router();
const {
  getAllStudents,
  getStudentById,
  createStudent,
  deleteStudent,
} = require('../controllers/studentController');

router.get('/', getAllStudents);
router.get('/:id', getStudentById);
router.post('/', createStudent);
router.delete('/:id', deleteStudent);

module.exports = router;
`,
  },
  'controllers/studentController.js': {
    name: 'controllers/studentController.js',
    language: 'javascript',
    content: `// In-memory dataset for REST API practice
let students = [
  { id: '101', name: 'Ayesha Khan', batch: 'Batch 4', course: 'MERN Stack' },
  { id: '102', name: 'Bilal Ahmed', batch: 'Batch 4', course: 'Backend Node.js' },
];

exports.getAllStudents = (req, res) => {
  const { batch } = req.query;
  const result = batch
    ? students.filter((s) => s.batch.toLowerCase() === batch.toLowerCase())
    : students;

  res.status(200).json({
    count: result.length,
    data: result,
  });
};

exports.getStudentById = (req, res) => {
  const student = students.find((s) => s.id === req.params.id);
  if (!student) {
    return res.status(404).json({ message: 'Student not found' });
  }
  res.json(student);
};

exports.createStudent = (req, res) => {
  const { name, batch = 'Batch 5', course = 'Full Stack' } = req.body || {};
  if (!name || !name.trim()) {
    return res.status(400).json({ message: 'Student name is required in JSON body' });
  }

  const newStudent = {
    id: String(Date.now()).slice(-4),
    name: name.trim(),
    batch,
    course,
  };
  students.push(newStudent);
  console.log('Created new student:', newStudent.name);

  res.status(201).json({
    message: 'Student added successfully',
    student: newStudent,
  });
};

exports.deleteStudent = (req, res) => {
  const exists = students.some((s) => s.id === req.params.id);
  if (!exists) {
    return res.status(404).json({ message: 'Student ID not found' });
  }
  students = students.filter((s) => s.id !== req.params.id);
  res.json({ message: \`Student \${req.params.id} deleted\` });
};
`,
  },
  'middleware/logger.js': {
    name: 'middleware/logger.js',
    language: 'javascript',
    content: `module.exports = function logger(req, res, next) {
  console.log(\`[\${new Date().toLocaleTimeString()}] \${req.method} \${req.originalUrl}\`);
  next();
};
`,
  },
  '.env': {
    name: '.env',
    language: 'ini',
    isEducational: true,
    readOnly: true,
    guide: {
      badge: 'Backend Environment Variables (Read-Only Guide)',
      title: '.env — Server Port, Database URI & Secret Keys',
      summary:
        'In Node.js backends, sensitive configuration values such as PORT, database connection strings, and JWT secrets are stored in .env and read via process.env.',
      whyUsed: [
        'Keeps database credentials and signing keys secure and separate from application code.',
        'Loaded at startup using the dotenv package: require(\'dotenv\').config().',
      ],
      keyPoints: [
        'PORT=5000 and NODE_ENV=development are automatically available on process.env in this sandbox.',
      ],
      proTip: 'On cloud platforms like Vercel, Render, or Railway, add environment variables in the hosting dashboard rather than uploading .env.',
    },
    content: `PORT=5000
NODE_ENV=development
JWT_SECRET=super_secret_practice_key_change_in_prod
`,
  },
  '.gitignore': {
    name: '.gitignore',
    language: 'ini',
    isEducational: true,
    readOnly: true,
    guide: {
      badge: 'Git Ignore Rules (Read-Only Guide)',
      title: '.gitignore — Excluded Backend Files',
      summary: 'Prevents Git from uploading node_modules/, .env secrets, and log files to GitHub.',
      whyUsed: [
        'Protects private backend credentials and keeps repository size small.',
      ],
      keyPoints: ['Always ignore node_modules/, .env, and *.log in backend repositories.'],
      proTip: 'If a secret key is ever committed to Git by mistake, rotate (replace) that secret immediately.',
    },
    content: `node_modules/
.env
*.log
`,
  },
  '.oxlintrc.json': {
    name: '.oxlintrc.json',
    language: 'json',
    isEducational: true,
    readOnly: true,
    guide: {
      badge: 'Backend Linter Config (Read-Only Guide)',
      title: '.oxlintrc.json — Oxlint for Node.js & Express',
      summary:
        'Checks Node.js routes, controllers, and middleware for syntax mistakes, unused variables, and unreachable code.',
      whyUsed: [
        'Catches backend bugs early before an API endpoint fails at runtime.',
      ],
      keyPoints: ['Supports both CommonJS (require/module.exports) and ES Modules (import/export).'],
      proTip: 'Run your linter before deploying backend changes to production.',
    },
    content: `{
  "plugins": ["node", "import"],
  "categories": {
    "correctness": "error"
  }
}`,
  },
  'package.json': {
    name: 'package.json',
    language: 'json',
    isEducational: true,
    readOnly: true,
    guide: {
      badge: 'Backend Manifest (Read-Only Guide)',
      title: 'package.json — Node.js & Express Configuration',
      summary:
        'Defines the backend entry file ("main": "server.js"), start scripts, and server dependencies.',
      whyUsed: [
        '"npm start" runs node server.js in production, while "npm run dev" uses nodemon to auto-restart on file changes.',
      ],
      keyPoints: [
        'express, cors, and dotenv form the core foundation of most Node.js REST APIs.',
      ],
      proTip: 'Use the Express API Tester on the right panel to send GET, POST, and DELETE requests to your routes.',
    },
    content: `{
  "name": "express-backend-practice",
  "version": "1.0.0",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "lint": "oxlint"
  },
  "dependencies": {
    "cors": "^2.8.5",
    "dotenv": "^16.4.7",
    "express": "^5.1.0"
  },
  "devDependencies": {
    "nodemon": "^3.1.9",
    "oxlint": "^0.16.0"
  }
}`,
  },
  'README.md': {
    name: 'README.md',
    language: 'markdown',
    isEducational: true,
    readOnly: true,
    guide: {
      badge: 'API Documentation (Read-Only Guide)',
      title: 'README.md — REST API Reference',
      summary: 'Documents your available API routes, HTTP methods, request body fields, and response formats.',
      whyUsed: [
        'Helps frontend developers integrate quickly with your backend endpoints.',
      ],
      keyPoints: ['Document each route\'s HTTP method (GET, POST, PUT, DELETE) and sample JSON payload.'],
      proTip: 'Create new route and controller files and mount them in server.js to expand your API.',
    },
    content: `# Node.js + Express Practice Lab

Write Express routes, middleware, and controllers and test them live with the built-in **API Tester**.

## Default Endpoints
- \`GET /\` — API status check
- \`GET /api/students\` — List students (supports \`?batch=Batch 4\`)
- \`GET /api/students/:id\` — Get single student by ID
- \`POST /api/students\` — Create student (\`{ "name": "Zain", "batch": "Batch 5" }\`)
- \`DELETE /api/students/:id\` — Remove student by ID
`,
  },
};
