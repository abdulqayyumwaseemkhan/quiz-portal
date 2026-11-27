// Starter workspaces, language helpers, and educational scaffold metadata for WebIDE

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
      return 'javascriptreact';
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
    <h1>Hello Web Developer!</h1>
    <p>Edit <code>index.html</code>, <code>style.css</code>, and <code>script.js</code> to build your project.</p>
    <button id="actionBtn">Click Me (0)</button>
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
  font-family: system-ui, -apple-system, sans-serif;
  min-height: 100vh;
  display: grid;
  place-items: center;
  background: #f8fafc;
  color: #0f172a;
  padding: 24px;
}

.card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  padding: 32px;
  max-width: 460px;
  width: 100%;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.05);
}

.badge {
  display: inline-block;
  font-size: 11px;
  font-weight: 700;
  color: #2563eb;
  background: #eff6ff;
  padding: 4px 10px;
  border-radius: 999px;
  margin-bottom: 12px;
}

h1 {
  font-size: 24px;
  margin-bottom: 8px;
}

p {
  color: #64748b;
  line-height: 1.6;
  margin-bottom: 20px;
  font-size: 14px;
}

button {
  background: #2563eb;
  color: #ffffff;
  border: none;
  padding: 10px 18px;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s ease;
}

button:hover {
  background: #1d4ed8;
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
    btn.textContent = \`Click Me (\${clicks})\`;
    console.log('Button clicked:', clicks);
  });
}
`,
  },
};

// Kept for backward compatibility with flat assignment templates
export const LEGACY_REACT_ASSIGNMENT_FILES = {
  'index.html': {
    name: 'index.html',
    language: 'html',
    content: '<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <title>React App</title>\n</head>\n<body>\n  <div id="root"></div>\n</body>\n</html>',
  },
  'styles.css': {
    name: 'styles.css',
    language: 'css',
    content: 'body {\n  font-family: sans-serif;\n  padding: 20px;\n}\n\n.App {\n  text-align: center;\n}\n\nh1 {\n  color: #2563eb;\n}',
  },
  'App.jsx': {
    name: 'App.jsx',
    language: 'javascriptreact',
    content: 'import React, { useState } from "react";\n\nexport default function App() {\n  const [count, setCount] = useState(0);\n  \n  return (\n    <div className="App">\n      <h1>Hello React!</h1>\n      <button onClick={() => setCount(c => c + 1)}>\n        Count is {count}\n      </button>\n    </div>\n  );\n}\n',
  },
  'index.jsx': {
    name: 'index.jsx',
    language: 'javascriptreact',
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
      title: 'node_modules/ — External Packages Directory',
      summary:
        'Jab aap terminal me "npm install" chalate hain, to React, Vite, Oxlint aur tamam libraries ka code is folder me download hota hai.',
      whyUsed: [
        'Is folder me hazaron helper packages aur unki internal files hoti hain (jaise react, react-dom, vite, lucide-react).',
        'Aap is folder ke andar kabhi bhi khud se code edit nahi karte — ye 100% npm/pnpm manage karta hai.',
        'Iska size aksar 150MB–500MB hota hai, is liye ise GitHub par upload NAHI kiya jata (.gitignore me rakha jata hai).',
      ],
      keyPoints: [
        'Agar node_modules delete ho jaye, to sirf "npm install" likhne se package.json dekh kar dobara ban jata hai.',
        'Jab aap "import { useState } from \'react\'" likhte hain, bundler use isi node_modules folder se uthata hai.',
      ],
      proTip: 'Practice karne ke liye aapko node_modules chherne ki zaroorat nahi — apna tamam React code "src/" folder ke andar likhein!',
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
      title: 'node_modules/vite — Vite Frontend Build Tool',
      summary:
        'Vite modern React projects ka super-fast development server aur production bundler hai.',
      whyUsed: [
        'Development ke dauran code save karte hi browser ko milliseconds me update karta hai (Hot Module Replacement / HMR).',
        'Production deploy ke waqt aapke JSX aur CSS files ko optimize aur minify kar ke "dist/" folder banata hai.',
      ],
      keyPoints: [
        'Purane Create-React-App (CRA) ki jagah ab industry me Vite standard ban chuka hai.',
      ],
      proTip: 'Vite ki settings root par maujood "vite.config.js" file se control hoti hain.',
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
        '"public/" folder me wo static files rakhi jati hain jinhein bina kisi bundling ya naam badle seedha root URL ("/") se serve karna ho.',
      whyUsed: [
        'Favicon (favicon.ico / vite.svg), robots.txt, manifest.json, ya aisi public PDFs/images jo direct "/logo.png" URL par chahiye hon.',
        'Public folder ki files Vite ke JavaScript bundle me process nahi hotin, balke build ke waqt as-is copy ho jati hain.',
      ],
      keyPoints: [
        'Component-specific images ko aam tor par "src/assets/" me rakh kar import kiya jata hai.',
        'Root-level browser icons aur static files ke liye "public/" best jagah hai.',
      ],
      proTip: 'Is Web IDE me aap Explorer ke Upload Image button se images upload kar ke apne JSX me use kar sakte hain.',
    },
    content: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="64" height="64">
  <circle cx="16" cy="16" r="14" fill="#2563EB" />
  <path d="M10 16l4 4 8-8" stroke="#FFFFFF" stroke-width="3" fill="none" stroke-linecap="round" />
</svg>`,
  },
  'src/main.jsx': {
    name: 'src/main.jsx',
    language: 'javascriptreact',
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
  background-color: #f8fafc;
  color: #0f172a;
  line-height: 1.5;
}

.app-shell {
  max-width: 760px;
  margin: 0 auto;
  padding: 28px 20px;
}

.navbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  padding: 14px 20px;
  border-radius: 12px;
  margin-bottom: 24px;
}

.brand {
  font-weight: 800;
  font-size: 16px;
  color: #2563eb;
}

.tag {
  font-size: 12px;
  font-weight: 600;
  background: #eff6ff;
  color: #1d4ed8;
  padding: 4px 10px;
  border-radius: 999px;
}

.hero-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  padding: 24px;
  margin-bottom: 20px;
  box-shadow: 0 4px 16px rgba(15, 23, 42, 0.04);
}

.hero-card h1 {
  font-size: 24px;
  margin-bottom: 8px;
}

.hero-card p {
  color: #64748b;
  font-size: 14px;
}

.counter-box {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  padding: 22px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.btn-group {
  display: flex;
  gap: 8px;
}

.btn {
  border: 1px solid #cbd5e1;
  background: #ffffff;
  color: #0f172a;
  padding: 8px 14px;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
}

.btn-primary {
  background: #2563eb;
  border-color: #2563eb;
  color: #ffffff;
}

.btn-primary:hover {
  background: #1d4ed8;
}
`,
  },
  'src/App.jsx': {
    name: 'src/App.jsx',
    language: 'javascriptreact',
    content: `import { useState } from 'react';
import Navbar from './components/Navbar.jsx';
import CounterCard from './components/CounterCard.jsx';

export default function App() {
  const [count, setCount] = useState(0);

  return (
    <div className="app-shell">
      <Navbar title="React + Vite Workspace" badge="src/ Ready" />

      <section className="hero-card">
        <h1>Welcome to Your React Playground</h1>
        <p>
          Create folders & components inside <code>src/</code> (just like VS Code) and
          use standard <code>import</code> &amp; <code>export</code> statements!
        </p>
      </section>

      <CounterCard
        count={count}
        onIncrement={() => setCount((c) => c + 1)}
        onReset={() => setCount(0)}
      />
    </div>
  );
}
`,
  },
  'src/components/Navbar.jsx': {
    name: 'src/components/Navbar.jsx',
    language: 'javascriptreact',
    content: `export default function Navbar({ title, badge }) {
  return (
    <header className="navbar">
      <span className="brand">{title}</span>
      {badge && <span className="tag">{badge}</span>}
    </header>
  );
}
`,
  },
  'src/components/CounterCard.jsx': {
    name: 'src/components/CounterCard.jsx',
    language: 'javascriptreact',
    content: `export default function CounterCard({ count, onIncrement, onReset }) {
  return (
    <div className="counter-box">
      <div>
        <h3 style={{ fontSize: '16px', marginBottom: '4px' }}>Interactive Component State</h3>
        <p style={{ fontSize: '13px', color: '#64748b' }}>
          Current Count: <strong>{count}</strong>
        </p>
      </div>
      <div className="btn-group">
        <button className="btn" onClick={onReset}>
          Reset
        </button>
        <button className="btn btn-primary" onClick={onIncrement}>
          Increment +1
        </button>
      </div>
    </div>
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
      badge: 'Environment Configuration (Read-Only Guide)',
      title: '.env — Environment Variables & API Keys',
      summary:
        '".env" file me API URLs, public config keys, aur environment-specific settings rakhi jati hain taake unhein code me hardcode na karna pare.',
      whyUsed: [
        'Local computer (localhost) aur Live server (production) ke API URLs alag hote hain — .env se bina code badle URL switch ho jata hai.',
        'Vite projects me har frontend variable ka naam "VITE_" se shuru hona zaroori hai (maslan VITE_API_URL), aur code me "import.meta.env.VITE_API_URL" se milta hai.',
        'Secret keys wali .env file ko kabhi GitHub par push nahi kiya jata!',
      ],
      keyPoints: [
        'Frontend React browser me chalta hai, is liye private database passwords kabhi frontend .env me nahi rakhte — wo sirf Backend (.env) me rakhe jate hain.',
      ],
      proTip: 'Team members ke liye aam tor par ek ".env.example" file banayi jati hai jisme sirf dummy keys likhi hoti hain.',
    },
    content: `# Vite Frontend Environment Variables
VITE_APP_NAME="BanoQabil React App"
VITE_API_BASE_URL="https://api.example.com/v1"
`,
  },
  '.gitignore': {
    name: '.gitignore',
    language: 'ini',
    isEducational: true,
    readOnly: true,
    guide: {
      badge: 'Git Version Control Config (Read-Only Guide)',
      title: '.gitignore — Files Ignored by Git',
      summary:
        '".gitignore" Git ko batata hai ke kaunse folders aur files GitHub par upload (commit/push) NAHI karne.',
      whyUsed: [
        'node_modules/ (bohat bhari hota hai aur npm install se khud ban jata hai).',
        'dist/ (production build output jo deploy ke waqt generate hota hai).',
        '.env (jisme sensitive API keys aur credentials hote hain).',
      ],
      keyPoints: [
        'Har line par ek file ya folder pattern likha jata hai (jaise *.log ya .DS_Store).',
      ],
      proTip: 'Project shuru karte hi sab se pehle check karein ke ".env" aur "node_modules" aapki .gitignore me maujood hon!',
    },
    content: `# Dependencies
node_modules

# Production build output
dist
dist-ssr

# Environment secrets
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
      badge: 'Ultra-Fast Code Linter (Read-Only Guide)',
      title: '.oxlintrc.json — Oxlint Configuration',
      summary:
        'Oxlint (Oxidation Compiler Linter) ek modern, Rust-based JavaScript/React linter hai jo code likhte waqt ghaltiyan aur bugs foran pakarta hai.',
      whyUsed: [
        'Unused variables, missing React hook dependencies, duplicate keys, aur undefined variables ko run karne se pehle hi highlight kar deta hai.',
        'Traditional linters ke muqable me 50x se 100x zyada fast chalta hai — bare enterprise Vite/React projects me milliseconds me check mukammal karta hai.',
      ],
      keyPoints: [
        '"plugins": ["react", "jsx-a11y", "import"] enable karne se JSX aur import/export ki ghaltiyan bhi pakri jati hain.',
        'Terminal me "npx oxlint" chala kar poore project ki health check ki jati hai.',
      ],
      proTip: 'Oxlint aur ESLint mil kar aapke React code ko clean, bug-free aur professional standard par rakhte hain.',
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
      badge: 'Code Quality Rules (Read-Only Guide)',
      title: 'eslint.config.js — ESLint Flat Config',
      summary:
        'Vite React templates me ESLint code style, React Hooks ke rules (useState/useEffect), aur Fast Refresh compatibility check karne ke liye aata hai.',
      whyUsed: [
        'React Hooks ko conditional if-block ke andar likhne jaisi common mistakes se rokta hai.',
        'Team me sab developers ka code ek hi clean pattern follow karta hai.',
      ],
      keyPoints: [
        'Modern ESLint v9+ me purane ".eslintrc" ki jagah "eslint.config.js" (Flat Config) istemal hota hai.',
      ],
      proTip: 'VS Code me ESLint extension install ho to editor ke andar hi red/yellow squiggly lines me madad mil jati hai.',
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
      title: 'index.html — Single Page Application (SPA) Entry',
      summary:
        'React ek Single Page Application (SPA) hoti hai: browser sab se pehle sirf ye ek "index.html" load karta hai jisme <div id="root"></div> khali container hota hai.',
      whyUsed: [
        'Iske andar <script type="module" src="/src/main.jsx"></script> likha hota hai jo React engine ko start karta hai.',
        'src/main.jsx is "#root" div ko pakar kar aapka poora <App /> component uske andar render kar deta hai.',
        'Google Fonts, page <title>, aur meta tags isi file ke <head> me lagaye jate hain.',
      ],
      keyPoints: [
        'Vite me index.html "public/" ke andar nahi balke project ke bilkul bahar (root) par hoti hai.',
      ],
      proTip: 'HTML UI likhne ke liye index.html me nahi balke "src/App.jsx" aur "src/components/" ke JSX components me likhein!',
    },
    content: `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Vite + React Practice App</title>
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
      title: 'package.json — Project Blueprint, Scripts & Dependencies',
      summary:
        'Har Node.js aur React project ka ID card "package.json" hota hai — isme project ka naam, terminal commands (scripts), aur installed libraries ki list hoti hai.',
      whyUsed: [
        '"scripts": terminal shortcuts jaise "npm run dev" (local server chalana), "npm run build" (production bundle banana), aur "npm run lint" (code check karna).',
        '"dependencies": wo packages jo live website chalne ke liye chahiye (react, react-dom, lucide-react, react-router-dom).',
        '"devDependencies": wo tools jo sirf coding/building ke waqt chahiye (vite, oxlint, eslint).',
      ],
      keyPoints: [
        'Is Web IDE me react, react-dom, lucide-react, aur react-router-dom pehle se pre-configured hain — aap seedha import kar sakte hain!',
      ],
      proTip: 'Jab aap GitHub se koi React repo clone karte hain, sab se pehle package.json dekh kar pata chalta hai ke project me kaunsi libraries aur scripts use hui hain.',
    },
    content: `{
  "name": "react-vite-practice",
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
      title: 'package-lock.json — Exact Version Lockfile',
      summary:
        'Jab package.json me "^19.0.0" likha hota hai to uska matlab "19.x ka koi bhi minor update" hota hai — jabke package-lock.json har sub-package ka exact version aur checksum lock kar deti hai.',
      whyUsed: [
        'Guarantee deti hai ke aapke laptop, aapke dost ke laptop, aur Vercel/Netlify server par bilkul 100% same package versions install hon.',
        '"Mere computer par chal raha tha magar server par toot gaya" wale masle ko khatam karti hai.',
      ],
      keyPoints: [
        'Ise kabhi hath se edit nahi karte; npm install chalane par npm khud update karta hai.',
        'node_modules ke bar-aks, package-lock.json ko GitHub par ZAROOR commit kiya jata hai!',
      ],
      proTip: 'Production deployments me "npm ci" command isi package-lock.json ko parh kar fast aur exact install karti hai.',
    },
    content: `{
  "name": "react-vite-practice",
  "version": "0.1.0",
  "lockfileVersion": 3,
  "requires": true,
  "packages": {
    "": {
      "name": "react-vite-practice",
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
      title: 'vite.config.js — Vite Bundler Configuration',
      summary:
        'Ye file Vite ko batati hai ke aapke project me React JSX plugin, path aliases ("@/"), ya server proxy kaise kaam karenge.',
      whyUsed: [
        '@vitejs/plugin-react enable karta hai taake JSX transform aur Fast Refresh kaam kare.',
        'Path aliases (maslan "@" -> "/src") aur backend API proxy ("/api" -> "http://localhost:5000") yahin configure kiye jate hain.',
      ],
      keyPoints: [
        'Is Practice IDE me "@" alias ("@/components/...") pehle se aapke liye active hai!',
      ],
      proTip: 'Tailwind CSS v4 ya custom build plugins bhi isi plugins: [react()] array me add kiye jate hain.',
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
      title: 'README.md — Project Overview & Setup Instructions',
      summary:
        'README.md aapke project ka front-page manual hota hai jo GitHub repository kholte hi sab se neeche khubsurat formatted انداز me nazar aata hai.',
      whyUsed: [
        'Batata hai ke project kya karta hai, kaunsi technologies (React, Vite, Tailwind, Express) use hui hain, aur local computer par kaise run karna hai.',
        'Recruiters aur teachers aapka GitHub khol kar sab se pehle README.md dekhte hain.',
      ],
      keyPoints: [
        'Markdown (.md) syntax use karta hai: # Heading, **Bold**, ```bash code blocks```, aur screenshots.',
      ],
      proTip: 'Apne har portfolio project me clear features list, live demo link, aur setup commands README.md me zaroor likhein!',
    },
    content: `# React + Vite Practice Workspace

Welcome to the interactive React playground!

## Folder Structure
- \`src/main.jsx\` — Application entry point
- \`src/App.jsx\` — Root component
- \`src/components/\` — Reusable UI components
- \`src/index.css\` — Global styles

## How to Practice
1. Create new folders or \`.jsx\` / \`.js\` / \`.css\` files inside \`src/\`.
2. Export components using \`export default\` or named \`export\`.
3. Import them anywhere in \`src/App.jsx\` and click **Run Code**!
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
      title: 'node_modules/ — Installed Backend Packages',
      summary:
        'Node.js backend me "npm install express cors dotenv" chalane par Express framework aur uske helper packages is folder me store hote hain.',
      whyUsed: [
        'Express routing engine, body-parser, cors aur dotenv ki code libraries yahin maujood hoti hain.',
        'GitHub par push karte waqt ise .gitignore ke zariye skip kiya jata hai.',
      ],
      keyPoints: [
        'Jab aap server.js me "const express = require(\'express\')" likhte hain, Node.js use isi folder se load karta hai.',
      ],
      proTip: 'Apne API routes "routes/" me aur business logic "controllers/" folder me likhein!',
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
  console.log(\`🚀 Express server running on http://localhost:\${PORT}\`);
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
    content: `// In-memory mock database for practice
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
      badge: 'Backend Environment Secrets (Read-Only Guide)',
      title: '.env — Server Port, Database URI & JWT Secrets',
      summary:
        'Backend Node.js server me PORT, MongoDB connection string, aur JWT_SECRET hamesha .env file me rakhe jate hain aur "process.env" se read hote hain.',
      whyUsed: [
        'Database passwords aur API secrets ko source code se alag aur mehfooz rakhta hai.',
        'dotenv package ("require(\'dotenv\').config()") in variables ko process.env me load karta hai.',
      ],
      keyPoints: [
        'Is sandbox me PORT=5000 aur NODE_ENV=development automatically process.env me available hain.',
      ],
      proTip: 'Production deployment (Vercel, Render, Railway) par .env upload karne ke bajaye dashboard ke Environment Variables tab me paste karte hain.',
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
      title: '.gitignore — Backend Ignored Files',
      summary: 'Node.js backend me node_modules aur .env ko Git tracking se bahar rakhta hai.',
      whyUsed: [
        'Secret keys (.env) leak hone se bachata hai aur repository ko lightweight rakhta hai.',
      ],
      keyPoints: ['node_modules/, .env, logs/, aur coverage/ hamesha ignore kiye jate hain.'],
      proTip: 'Agar ghalti se .env commit ho jaye to foran apni database/API keys rotate (change) karein.',
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
        'Backend routes aur controllers me unhandled errors, unused variables, aur unreachable code ko catch karta hai.',
      whyUsed: [
        'API crash hone se pehle syntax aur logic bugs pakar leta hai.',
      ],
      keyPoints: ['Node.js globals aur CommonJS/ESM dono ko support karta hai.'],
      proTip: 'CI/CD pipelines me deploy se pehle oxlint chalana best practice hai.',
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
        'Express server ka entry file ("main": "server.js"), start scripts, aur backend packages define karta hai.',
      whyUsed: [
        '"npm start" production me node server.js chalata hai aur "npm run dev" nodemon ke sath auto-restart server chalata hai.',
      ],
      keyPoints: [
        'express, cors, aur dotenv har REST API project ki bunyadi dependencies hain.',
      ],
      proTip: 'Right side par maujood API Tester me endpoints click kar ke apne Express routes ko live test karein!',
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
      title: 'README.md — Backend API Guide',
      summary: 'Backend REST API ke endpoints, request body format, aur status codes document karta hai.',
      whyUsed: [
        'Frontend developers isi documentation ko dekh kar axios/fetch calls likhte hain.',
      ],
      keyPoints: ['Har endpoint ka HTTP Method (GET, POST, PUT, DELETE) aur sample JSON zaroor likhein.'],
      proTip: 'Naye folders ya route files banayein aur server.js me require() kar ke test karein!',
    },
    content: `# Node.js + Express Practice Lab

Write real Express routes, middleware, and controllers and test them with the built-in **API Tester**!

## Default Endpoints
- \`GET /\` — API status check
- \`GET /api/students\` — List students (supports \`?batch=Batch 4\`)
- \`GET /api/students/:id\` — Get single student by ID
- \`POST /api/students\` — Create student (\`{ "name": "Zain", "batch": "Batch 5" }\`)
- \`DELETE /api/students/:id\` — Remove student by ID
`,
  },
};
