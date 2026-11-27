/**
 * VS Code–style ES7+ React/JS/Express Snippets, Emmet HTML/JSX/CSS Completions,
 * TypeScript/JSX Compiler Intelligence, and Smart Auto-Closing + Auto-Indenting Tags.
 */

let snippetsRegistered = false;
let workspaceFilesGetter = () => ({});

export function setMonacoWorkspaceFilesGetter(fn) {
  if (typeof fn === 'function') {
    workspaceFilesGetter = fn;
  }
}

// HTML5 void (self-closing) elements — only applies to lowercase native HTML tags,
// so custom PascalCase React components like <Input> or <Image> still auto-close!
export const VOID_HTML_TAGS = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
]);

// Tag completions adaptable to both standard HTML and React JSX (className / htmlFor)
const TAG_DEFINITIONS = [
  // Headings & Text
  { tag: 'h1', html: '<h1>$0</h1>', desc: 'Heading 1' },
  { tag: 'h2', html: '<h2>$0</h2>', desc: 'Heading 2' },
  { tag: 'h3', html: '<h3>$0</h3>', desc: 'Heading 3' },
  { tag: 'h4', html: '<h4>$0</h4>', desc: 'Heading 4' },
  { tag: 'h5', html: '<h5>$0</h5>', desc: 'Heading 5' },
  { tag: 'h6', html: '<h6>$0</h6>', desc: 'Heading 6' },
  { tag: 'p', html: '<p>$0</p>', desc: 'Paragraph' },
  { tag: 'span', html: '<span>$0</span>', desc: 'Inline span' },
  { tag: 'strong', html: '<strong>$0</strong>', desc: 'Bold strong text' },
  { tag: 'em', html: '<em>$0</em>', desc: 'Italic emphasized text' },
  { tag: 'small', html: '<small>$0</small>', desc: 'Small text' },
  { tag: 'code', html: '<code>$0</code>', desc: 'Inline code' },
  { tag: 'pre', html: '<pre>$0</pre>', desc: 'Preformatted block' },
  { tag: 'blockquote', html: '<blockquote>$0</blockquote>', desc: 'Blockquote' },

  // Layout Containers
  { tag: 'div', html: '<div>$0</div>', desc: 'Container div' },
  {
    tag: 'divc',
    html: '<div class="${1:container}">\n\t$0\n</div>',
    jsx: '<div className="${1:container}">\n\t$0\n</div>',
    desc: 'Div with class / className',
  },
  { tag: 'section', html: '<section>\n\t$0\n</section>', desc: 'Section container' },
  { tag: 'article', html: '<article>\n\t$0\n</article>', desc: 'Article block' },
  { tag: 'header', html: '<header>\n\t$0\n</header>', desc: 'Header banner' },
  { tag: 'footer', html: '<footer>\n\t$0</footer>', desc: 'Footer block' },
  { tag: 'main', html: '<main>\n\t$0\n</main>', desc: 'Main content area' },
  { tag: 'nav', html: '<nav>\n\t$0\n</nav>', desc: 'Navigation bar' },
  { tag: 'aside', html: '<aside>\n\t$0\n</aside>', desc: 'Sidebar / Aside' },

  // Interactive & Forms
  {
    tag: 'button',
    html: '<button type="${1:button}">$0</button>',
    jsx: '<button type="${1:button}" onClick={${2:() => {}}}>\n\t$0\n</button>',
    desc: 'Interactive Button',
  },
  {
    tag: 'btn',
    html: '<button class="${1:btn}">$0</button>',
    jsx: '<button className="${1:btn}" onClick={${2:handleClick}}>$0</button>',
    desc: 'Styled Button shortcut',
  },
  { tag: 'a', html: '<a href="${1:#}">$0</a>', desc: 'Anchor link' },
  {
    tag: 'form',
    html: '<form action="${1:#}">\n\t$0\n</form>',
    jsx: '<form onSubmit={(e) => { e.preventDefault(); $1 }}>\n\t$0\n</form>',
    desc: 'Form element',
  },
  {
    tag: 'label',
    html: '<label for="${1:fieldId}">$0</label>',
    jsx: '<label htmlFor="${1:fieldId}">$0</label>',
    desc: 'Form Label',
  },
  {
    tag: 'input',
    html: '<input type="${1:text}" placeholder="${2:Enter text...}" />',
    jsx: '<input type="${1:text}" value={${2:value}} onChange={(e) => ${3:setValue}(e.target.value)} placeholder="${4:Enter text...}" />',
    desc: 'Input field',
  },
  { tag: 'input:text', html: '<input type="text" placeholder="${1:Enter text...}" />', desc: 'Text input' },
  { tag: 'input:password', html: '<input type="password" placeholder="${1:Password}" />', desc: 'Password input' },
  { tag: 'input:email', html: '<input type="email" placeholder="${1:email@example.com}" />', desc: 'Email input' },
  { tag: 'input:number', html: '<input type="number" placeholder="${1:0}" />', desc: 'Number input' },
  {
    tag: 'textarea',
    html: '<textarea rows="${1:4}" placeholder="${2:Write here...}">$0</textarea>',
    jsx: '<textarea rows={${1:4}} placeholder="${2:Write here...}" value={${3:text}} onChange={(e) => ${4:setText}(e.target.value)} />',
    desc: 'Multiline textarea',
  },
  {
    tag: 'select',
    html: '<select>\n\t<option value="${1:val}">$0</option>\n</select>',
    desc: 'Dropdown select',
  },
  { tag: 'option', html: '<option value="${1:val}">$0</option>', desc: 'Select option' },

  // Lists & Tables
  { tag: 'ul', html: '<ul>\n\t<li>$0</li>\n</ul>', desc: 'Unordered list' },
  { tag: 'ol', html: '<ol>\n\t<li>$0</li>\n</ol>', desc: 'Ordered list' },
  { tag: 'li', html: '<li>$0</li>', desc: 'List item' },
  {
    tag: 'table',
    html: '<table>\n\t<thead>\n\t\t<tr>\n\t\t\t<th>$1</th>\n\t\t</tr>\n\t</thead>\n\t<tbody>\n\t\t<tr>\n\t\t\t<td>$0</td>\n\t\t</tr>\n\t</tbody>\n</table>',
    desc: 'Table with thead & tbody',
  },
  { tag: 'tr', html: '<tr>$0</tr>', desc: 'Table row' },
  { tag: 'th', html: '<th>$0</th>', desc: 'Table header cell' },
  { tag: 'td', html: '<td>$0</td>', desc: 'Table data cell' },

  // Media & Void
  { tag: 'img', html: '<img src="${1:image.jpg}" alt="${2:description}" />', desc: 'Image element' },
  { tag: 'video', html: '<video src="${1:video.mp4}" controls>$0</video>', desc: 'Video player' },
  { tag: 'audio', html: '<audio src="${1:audio.mp3}" controls>$0</audio>', desc: 'Audio player' },
  { tag: 'iframe', html: '<iframe src="${1:https://...}" title="${2:embed}" width="100%" height="${3:400}"></iframe>', desc: 'Iframe embed' },
  { tag: 'br', html: '<br />', desc: 'Line break' },
  { tag: 'hr', html: '<hr />', desc: 'Horizontal divider' },
];

const HTML_ONLY_SNIPPETS = [
  { tag: 'link', snippet: '<link rel="stylesheet" href="${1:style.css}" />', desc: 'Stylesheet link' },
  { tag: 'script', snippet: '<script src="${1:script.js}"></script>', desc: 'External script tag' },
  {
    tag: '!',
    snippet:
      '<!DOCTYPE html>\n<html lang="en">\n<head>\n\t<meta charset="UTF-8" />\n\t<meta name="viewport" content="width=device-width, initial-scale=1.0" />\n\t<title>${1:Document}</title>\n</head>\n<body>\n\t$0\n</body>\n</html>',
    desc: 'HTML5 Boilerplate (!)',
  },
  {
    tag: 'html:5',
    snippet:
      '<!DOCTYPE html>\n<html lang="en">\n<head>\n\t<meta charset="UTF-8" />\n\t<meta name="viewport" content="width=device-width, initial-scale=1.0" />\n\t<title>${1:Document}</title>\n</head>\n<body>\n\t$0\n</body>\n</html>',
    desc: 'HTML5 Starter Template',
  },
];

const CSS_SNIPPETS = [
  { prefix: 'df', snippet: 'display: flex;\njustify-content: ${1:center};\nalign-items: ${2:center};', desc: 'Flexbox center' },
  { prefix: 'flex', snippet: 'display: flex;\ngap: ${1:12px};\n$0', desc: 'Display flex with gap' },
  { prefix: 'fcol', snippet: 'display: flex;\nflex-direction: column;\ngap: ${1:12px};', desc: 'Flex column' },
  { prefix: 'fbet', snippet: 'display: flex;\nalign-items: center;\njustify-content: space-between;', desc: 'Flex space-between' },
  { prefix: 'grid', snippet: 'display: grid;\ngrid-template-columns: repeat(${1:3}, minmax(0, 1fr));\ngap: ${2:16px};', desc: 'Responsive CSS Grid' },
  { prefix: 'cen', snippet: 'display: grid;\nplace-items: center;', desc: 'Center with Grid' },
  { prefix: 'bg', snippet: 'background-color: ${1:#ffffff};', desc: 'Background color' },
  { prefix: 'bgi', snippet: 'background-image: url("${1:image.jpg}");\nbackground-size: cover;\nbackground-position: center;', desc: 'Background cover image' },
  { prefix: 'c', snippet: 'color: ${1:#0f172a};', desc: 'Text color' },
  { prefix: 'p', snippet: 'padding: ${1:16px};', desc: 'Padding' },
  { prefix: 'm', snippet: 'margin: ${1:0 auto};', desc: 'Margin' },
  { prefix: 'w', snippet: 'width: ${1:100%};', desc: 'Width' },
  { prefix: 'h', snippet: 'height: ${1:100vh};', desc: 'Height' },
  { prefix: 'maxw', snippet: 'max-width: ${1:1200px};\nmargin: 0 auto;', desc: 'Centered container' },
  { prefix: 'fs', snippet: 'font-size: ${1:16px};', desc: 'Font size' },
  { prefix: 'fw', snippet: 'font-weight: ${1:600};', desc: 'Font weight' },
  { prefix: 'tc', snippet: 'text-align: ${1:center};', desc: 'Text align center' },
  { prefix: 'b', snippet: 'border: ${1:1px solid #e2e8f0};', desc: 'Border' },
  { prefix: 'br', snippet: 'border-radius: ${1:12px};', desc: 'Border radius' },
  { prefix: 'bs', snippet: 'box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08);', desc: 'Soft card shadow' },
  { prefix: 'cur', snippet: 'cursor: pointer;', desc: 'Cursor pointer' },
  { prefix: 'tr', snippet: 'transition: all ${1:0.2s} ease;', desc: 'Smooth transition' },
  { prefix: 'media', snippet: '@media (max-width: ${1:768px}) {\n\t$0\n}', desc: 'Responsive media query' },
  { prefix: 'reset', snippet: '* {\n\tbox-sizing: border-box;\n\tmargin: 0;\n\tpadding: 0;\n}', desc: 'CSS Box-sizing reset' },
];

// Build ES7+ React/Redux/JS/Express snippets dynamically using current filename!
function buildEs7Snippets(componentName = 'MyComponent') {
  return [
    // --- ES7+ Component Templates ---
    {
      prefix: 'rafce',
      detail: 'ES7+ React Arrow Function Component (Export Default)',
      desc: `Creates ${componentName} arrow component with export default`,
      snippet: `const \${1:${componentName}} = () => {\n\treturn (\n\t\t<div>\n\t\t\t$0\n\t\t</div>\n\t);\n};\n\nexport default \${1:${componentName}};`,
    },
    {
      prefix: 'rafc',
      detail: 'ES7+ React Arrow Function Component (Named Export)',
      desc: `Creates named exported ${componentName} arrow component`,
      snippet: `export const \${1:${componentName}} = () => {\n\treturn (\n\t\t<div>\n\t\t\t$0\n\t\t</div>\n\t);\n};`,
    },
    {
      prefix: 'rfce',
      detail: 'ES7+ React Function Component (Export Default)',
      desc: `Creates ${componentName} function component with export default`,
      snippet: `function \${1:${componentName}}() {\n\treturn (\n\t\t<div>\n\t\t\t$0\n\t\t</div>\n\t);\n}\n\nexport default \${1:${componentName}};`,
    },
    {
      prefix: 'rfc',
      detail: 'ES7+ React Function Component',
      desc: `Creates export default function ${componentName}()`,
      snippet: `export default function \${1:${componentName}}() {\n\treturn (\n\t\t<div>\n\t\t\t$0\n\t\t</div>\n\t);\n}`,
    },
    {
      prefix: 'rafcp',
      detail: 'ES7+ React Arrow Component with Props',
      desc: 'React component destructuring props',
      snippet: `export default function \${1:${componentName}}({ \${2:title} }) {\n\treturn (\n\t\t<div>\n\t\t\t<h2>{\${2:title}}</h2>\n\t\t\t$0\n\t\t</div>\n\t);\n}`,
    },

    // --- ES7+ Imports & Exports ---
    {
      prefix: 'imr',
      detail: 'ES7+ Import React',
      desc: "import React from 'react'",
      snippet: "import React from 'react';$0",
    },
    {
      prefix: 'imrs',
      detail: 'ES7+ Import React & useState',
      desc: "import React, { useState } from 'react'",
      snippet: "import React, { useState } from 'react';$0",
    },
    {
      prefix: 'imrse',
      detail: 'ES7+ Import React, useState & useEffect',
      desc: "import React, { useState, useEffect } from 'react'",
      snippet: "import React, { useState, useEffect } from 'react';$0",
    },
    {
      prefix: 'imp',
      detail: 'ES7+ Import Default Module',
      desc: "import moduleName from './module'",
      snippet: "import ${2:ModuleName} from '${1:./components/ModuleName}';$0",
    },
    {
      prefix: 'imd',
      detail: 'ES7+ Import Named Destructured',
      desc: "import { item } from 'module'",
      snippet: "import { $2 } from '${1:react}';$0",
    },
    {
      prefix: 'imc',
      detail: 'ES7+ Import CSS File',
      desc: "import './styles.css'",
      snippet: "import './${1:index.css}';$0",
    },
    {
      prefix: 'exp',
      detail: 'ES7+ Export Default',
      desc: 'export default identifier',
      snippet: 'export default ${1:' + componentName + '};',
    },

    // --- React Hooks ---
    {
      prefix: 'usf',
      detail: 'ES7+ useState Hook',
      desc: 'Declares React state with auto-capitalized setter',
      snippet: 'const [${1:state}, set${1/(.*)/${1:/capitalize}/}] = useState(${2:initialValue});$0',
    },
    {
      prefix: 'useStateSnippet',
      detail: 'React useState Hook',
      desc: 'const [state, setState] = useState(...)',
      snippet: 'const [${1:count}, set${1/(.*)/${1:/capitalize}/}] = useState(${2:0});$0',
    },
    {
      prefix: 'uef',
      detail: 'ES7+ useEffect Hook',
      desc: 'useEffect(() => { ... }, [])',
      snippet: 'useEffect(() => {\n\t$0\n}, [${1}]);',
    },
    {
      prefix: 'urf',
      detail: 'ES7+ useRef Hook',
      desc: 'const ref = useRef(null)',
      snippet: 'const ${1:inputRef} = useRef(${2:null});$0',
    },
    {
      prefix: 'umf',
      detail: 'ES7+ useMemo Hook',
      desc: 'const memoized = useMemo(() => ..., [deps])',
      snippet: 'const ${1:memoizedValue} = useMemo(() => ${2:compute()}, [${3}]);$0',
    },
    {
      prefix: 'ucb',
      detail: 'ES7+ useCallback Hook',
      desc: 'const memoizedFn = useCallback(() => { ... }, [deps])',
      snippet: 'const ${1:handleAction} = useCallback((${2}) => {\n\t$0\n}, [${3}]);',
    },
    {
      prefix: 'ucf',
      detail: 'ES7+ useContext Hook',
      desc: 'const ctx = useContext(Context)',
      snippet: 'const ${1:context} = useContext(${2:AppContext});$0',
    },

    // --- JSX & Modern JS Helpers ---
    {
      prefix: 'frag',
      detail: 'JSX Fragment <>...</>',
      desc: 'Wraps elements in a React Fragment',
      snippet: '<>\n\t$0\n</>',
    },
    {
      prefix: 'fmap',
      detail: 'JSX Array .map() List Render',
      desc: 'Renders array items with key prop',
      snippet: '{${1:items}.map((${2:item}, ${3:index}) => (\n\t<div key={${2:item}.id || ${3:index}}>\n\t\t{$0}\n\t</div>\n))}',
    },
    {
      prefix: 'tern',
      detail: 'JSX Conditional Ternary Render',
      desc: '{condition ? (<A />) : (<B />)}',
      snippet: '{${1:isLoaded} ? (\n\t$2\n) : (\n\t$0\n)}',
    },
    {
      prefix: 'cn',
      detail: 'JSX className=""',
      desc: 'className attribute',
      snippet: 'className="${1:card}"$0',
    },
    {
      prefix: 'onClick',
      detail: 'JSX onClick Handler',
      desc: 'onClick={() => ...}',
      snippet: 'onClick={() => ${1:handleClick()}}$0',
    },
    {
      prefix: 'onChange',
      detail: 'JSX onChange Input Handler',
      desc: 'onChange={(e) => ...}',
      snippet: 'onChange={(e) => ${1:setValue(e.target.value)}}$0',
    },
    {
      prefix: 'clg',
      detail: 'ES7+ console.log()',
      desc: 'Logs value to console',
      snippet: 'console.log(${1:value});$0',
    },
    {
      prefix: 'clo',
      detail: 'ES7+ console.log labeled object',
      desc: "console.log('label:', value)",
      snippet: "console.log('${1:data}:', ${1:data});$0",
    },
    {
      prefix: 'cer',
      detail: 'ES7+ console.error()',
      desc: 'Logs error to console',
      snippet: 'console.error(${1:error});$0',
    },
    {
      prefix: 'anfn',
      detail: 'ES7+ Arrow Function',
      desc: 'const name = (params) => { ... }',
      snippet: 'const ${1:handleAction} = (${2:e}) => {\n\t$0\n};',
    },
    {
      prefix: 'tryc',
      detail: 'Try / Catch Block',
      desc: 'try { ... } catch (error) { ... }',
      snippet: 'try {\n\t$0\n} catch (${1:error}) {\n\tconsole.error(${1:error});\n}',
    },
    {
      prefix: 'fetchapi',
      detail: 'Async Fetch JSON Helper',
      desc: 'Async function fetching JSON from an API URL',
      snippet:
        "const ${1:fetchData} = async () => {\n\ttry {\n\t\tconst res = await fetch('${2:https://jsonplaceholder.typicode.com/users}');\n\t\tconst data = await res.json();\n\t\tconsole.log(data);\n\t\t$0\n\t} catch (err) {\n\t\tconsole.error(err);\n\t}\n};",
    },

    // --- Node.js + Express Helpers ---
    {
      prefix: 'expapp',
      detail: 'Express Server Boilerplate',
      desc: 'Creates an Express server listening on PORT',
      snippet:
        "const express = require('express');\nconst app = express();\napp.use(express.json());\n\napp.get('/', (req, res) => {\n\tres.json({ message: '${1:Server running}' });\n});\n\napp.listen(5000, () => console.log('Server started on port 5000'));",
    },
    {
      prefix: 'exprouter',
      detail: 'Express Router Module',
      desc: 'Creates a modular Express router',
      snippet:
        "const express = require('express');\nconst router = express.Router();\n\nrouter.get('/', (req, res) => {\n\tres.json({ data: [] });\n});\n\nmodule.exports = router;",
    },
    {
      prefix: 'expget',
      detail: 'Express GET Route',
      desc: "app.get('/path', (req, res) => ...)",
      snippet:
        "${1:router}.get('${2:/}', (req, res) => {\n\t$0\n\tres.status(200).json({ success: true });\n});",
    },
    {
      prefix: 'exppost',
      detail: 'Express POST Route',
      desc: "app.post('/path', (req, res) => ...)",
      snippet:
        "${1:router}.post('${2:/}', (req, res) => {\n\tconst body = req.body;\n\t$0\n\tres.status(201).json({ created: body });\n});",
    },
  ];
}

function getComponentNameFromModel(model) {
  const rawPath = model?.uri?.path || '';
  const base = rawPath.split('/').pop()?.replace(/\.[^.]+$/, '') || 'Component';
  const cleaned = base.replace(/[^a-zA-Z0-9_]/g, '');
  if (!cleaned) return 'Component';
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

function computeRelativeImport(fromPath = '', toPath = '') {
  const fromParts = fromPath.replace(/^\/+/, '').split('/').slice(0, -1);
  const toParts = toPath.replace(/^\/+/, '').split('/');
  let common = 0;
  while (
    common < fromParts.length &&
    common < toParts.length - 1 &&
    fromParts[common] === toParts[common]
  ) {
    common++;
  }
  const upCount = fromParts.length - common;
  const prefix = upCount === 0 ? './' : '../'.repeat(upCount);
  return prefix + toParts.slice(common).join('/');
}

function configureMonacoJsxAndTypes(monaco) {
  const ts = monaco.languages?.typescript;
  if (!ts) return;

  const compilerOpts = {
    target: ts.ScriptTarget.ESNext,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.NodeJs,
    jsx: ts.JsxEmit.React,
    allowJs: true,
    checkJs: false,
    allowNonTsExtensions: true,
    esModuleInterop: true,
    allowSyntheticDefaultImports: true,
  };

  ts.javascriptDefaults.setCompilerOptions(compilerOpts);
  ts.typescriptDefaults.setCompilerOptions(compilerOpts);

  // Disable noisy false-positive module diagnostics while keeping full syntax & hook IntelliSense
  ts.javascriptDefaults.setDiagnosticsOptions({
    noSemanticValidation: true,
    noSyntaxValidation: false,
  });

  ts.javascriptDefaults.setEagerModelSync(true);

  // Ambient React 18/19 + Express type hints for rich parameter popups & hook autocomplete
  const ambientDts = `
    declare module 'react' {
      export function useState<T>(initialState: T | (() => T)): [T, (value: T | ((prev: T) => T)) => void];
      export function useEffect(effect: () => void | (() => void), deps?: ReadonlyArray<any>): void;
      export function useRef<T>(initialValue: T): { current: T };
      export function useMemo<T>(factory: () => T, deps: ReadonlyArray<any>): T;
      export function useCallback<T extends (...args: any[]) => any>(callback: T, deps: ReadonlyArray<any>): T;
      export function useContext<T>(context: any): T;
      export function useReducer<S, A>(reducer: (state: S, action: A) => S, initialState: S): [S, (action: A) => void];
      export function createContext<T>(defaultValue: T): any;
      export const StrictMode: any;
      export const Fragment: any;
      const React: any;
      export default React;
    }
    declare module 'react-dom/client' {
      export function createRoot(container: Element | DocumentFragment | null): {
        render(children: any): void;
        unmount(): void;
      };
    }
  `;
  ts.javascriptDefaults.addExtraLib(ambientDts, 'file:///node_modules/@types/react/index.d.ts');
}

export function registerMonacoSnippets(monaco) {
  if (snippetsRegistered || !monaco?.languages) return;
  snippetsRegistered = true;

  configureMonacoJsxAndTypes(monaco);

  // 1. HTML Completion Provider (supports both `h1` and `<h1` without double `<<`)
  monaco.languages.registerCompletionItemProvider('html', {
    triggerCharacters: ['<', '!'],
    provideCompletionItems: (model, position) => {
      const word = model.getWordUntilPosition(position);
      const lineContent = model.getLineContent(position.lineNumber);
      const charBeforeWord = lineContent[word.startColumn - 2] || '';
      const hasOpenAngle = charBeforeWord === '<';

      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: hasOpenAngle ? word.startColumn - 1 : word.startColumn,
        endColumn: word.endColumn,
      };

      const tagSuggestions = TAG_DEFINITIONS.map((item, idx) => ({
        label: item.tag,
        kind: monaco.languages.CompletionItemKind.Snippet,
        documentation: item.desc,
        insertText: item.html,
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        range,
        sortText: '00_' + String(idx).padStart(3, '0'),
        detail: `HTML Tag <${item.tag}>`,
      }));

      const htmlExtra = HTML_ONLY_SNIPPETS.map((item, idx) => ({
        label: item.tag,
        kind: monaco.languages.CompletionItemKind.Snippet,
        documentation: item.desc,
        insertText: item.snippet,
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        range,
        sortText: '00_extra_' + idx,
        detail: item.desc,
      }));

      return { suggestions: [...htmlExtra, ...tagSuggestions] };
    },
  });

  // 2. JavaScript & React JSX Completion Provider (ES7+ Snippets + JSX Tags + Workspace Components!)
  const jsAndJsxProvider = {
    triggerCharacters: ['<'],
    provideCompletionItems: (model, position) => {
      const uriPath = (model.uri?.path || '').replace(/^\/+/, '');
      const isJsxFile = uriPath.endsWith('.jsx') || uriPath.endsWith('.tsx');
      const word = model.getWordUntilPosition(position);
      const lineContent = model.getLineContent(position.lineNumber);
      const charBeforeWord = lineContent[word.startColumn - 2] || '';
      const hasOpenAngle = charBeforeWord === '<';

      const wordRange = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      };

      const tagRange = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: hasOpenAngle ? word.startColumn - 1 : word.startColumn,
        endColumn: word.endColumn,
      };

      const suggestions = [];

      // Include ES7+ React / JS / Express Snippets when not right after `<`
      if (!hasOpenAngle) {
        const compName = getComponentNameFromModel(model);
        const es7List = buildEs7Snippets(compName);
        es7List.forEach((s, idx) => {
          suggestions.push({
            label: s.prefix,
            kind: monaco.languages.CompletionItemKind.Snippet,
            detail: s.detail,
            documentation: s.desc,
            insertText: s.snippet,
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range: wordRange,
            sortText: '01_es7_' + String(idx).padStart(3, '0'),
          });
        });
      }

      // Include JSX HTML tag completions inside .jsx/.tsx files (or after `<` in .js React files)
      if (isJsxFile || hasOpenAngle) {
        TAG_DEFINITIONS.forEach((item, idx) => {
          suggestions.push({
            label: item.tag,
            kind: monaco.languages.CompletionItemKind.Property,
            detail: `JSX <${item.tag}>`,
            documentation: item.desc,
            insertText: item.jsx || item.html,
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range: tagRange,
            sortText: '02_jsx_' + String(idx).padStart(3, '0'),
          });
        });
      }

      // Dynamic Workspace Component Suggestions (auto-suggests components from src/!)
      const allFiles = workspaceFilesGetter() || {};
      Object.keys(allFiles).forEach((filePath) => {
        if (
          filePath === uriPath ||
          filePath.startsWith('node_modules/') ||
          allFiles[filePath]?.isEducational ||
          !(filePath.endsWith('.jsx') || filePath.endsWith('.tsx'))
        ) {
          return;
        }
        const rawBase = filePath.split('/').pop()?.replace(/\.[^.]+$/, '') || '';
        if (!rawBase || rawBase === 'main' || rawBase === 'index') return;
        const compName = rawBase.charAt(0).toUpperCase() + rawBase.slice(1);
        const relImport = computeRelativeImport(uriPath, filePath);

        if (hasOpenAngle || isJsxFile) {
          suggestions.push({
            label: `<${compName} />`,
            filterText: compName,
            kind: monaco.languages.CompletionItemKind.Class,
            detail: `Component (${relImport})`,
            documentation: `Insert <${compName} /> component from ${filePath}`,
            insertText: `<${compName} $0/>`,
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range: tagRange,
            sortText: '00_comp_' + compName,
          });
        }

        if (!hasOpenAngle) {
          suggestions.push({
            label: `import ${compName}`,
            filterText: `import ${compName}`,
            kind: monaco.languages.CompletionItemKind.Module,
            detail: `from '${relImport}'`,
            documentation: `Auto-import ${compName} from ${relImport}`,
            insertText: `import ${compName} from '${relImport}';$0`,
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range: wordRange,
            sortText: '00_imp_' + compName,
          });
        }
      });

      return { suggestions };
    },
  };

  monaco.languages.registerCompletionItemProvider('javascript', jsAndJsxProvider);
  monaco.languages.registerCompletionItemProvider('javascriptreact', jsAndJsxProvider);

  // 3. CSS Emmet & Shorthand Snippets
  monaco.languages.registerCompletionItemProvider('css', {
    provideCompletionItems: (model, position) => {
      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      };

      const suggestions = CSS_SNIPPETS.map((item, idx) => ({
        label: item.prefix,
        kind: monaco.languages.CompletionItemKind.Snippet,
        documentation: item.desc,
        insertText: item.snippet,
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        range,
        sortText: '00_css_' + String(idx).padStart(3, '0'),
        detail: `CSS: ${item.desc}`,
      }));

      return { suggestions };
    },
  });
}

/**
 * Smart VS Code–style Auto-Closing Tags & Auto-Indent Between Tags for HTML and React JSX:
 * 1. Typing `<div>` -> `<div>|</div>`, `<Navbar title="Hi">` -> `<Navbar title="Hi">|</Navbar>` (preserves exact PascalCase!)
 * 2. Typing `<>` in JSX -> `<>|</>` (React Fragment auto-close!)
 * 3. Ignores arrow functions `=>`, self-closing `<Card />`, closing `</div>`, and lowercase HTML5 void tags (`<img>`, `<input>`, `<br>`).
 * 4. Pressing `Enter` when cursor sits directly between `<Tag>|</Tag>` automatically expands & indents the inner line!
 */
export function setupAutoCloseTags(editor, monaco) {
  if (!editor || !monaco) return () => {};

  const contentDisposable = editor.onDidChangeModelContent((event) => {
    const changes = event.changes;
    if (!changes || changes.length !== 1) return;

    const change = changes[0];
    if (change.text !== '>') return;

    const model = editor.getModel();
    const position = editor.getPosition();
    if (!model || !position) return;

    const langId = model.getLanguageId();
    const uriPath = (model.uri?.path || '').toLowerCase();
    const isMarkupCapable =
      langId === 'html' ||
      langId === 'javascript' ||
      langId === 'javascriptreact' ||
      langId === 'typescriptreact' ||
      uriPath.endsWith('.html') ||
      uriPath.endsWith('.jsx') ||
      uriPath.endsWith('.tsx') ||
      uriPath.endsWith('.js');

    if (!isMarkupCapable) return;

    const lineContent = model.getLineContent(position.lineNumber);
    const textBefore = lineContent.substring(0, position.column - 1);
    const textAfter = lineContent.substring(position.column);

    // Ignore arrow function `=>` or comparison `>=` / `->`
    if (/[=\-!]$/.test(textBefore)) return;

    // Ignore self-closing tags `<Navbar />` or `<img />`
    if (/\/\s*$/.test(textBefore)) return;

    // Case A: React Empty Fragment `<>` -> `<>|</>`
    if (textBefore.endsWith('<') && !textBefore.endsWith('</')) {
      if (textAfter.startsWith('</>')) return;
      editor.executeEdits('auto-close-fragment', [
        {
          range: new monaco.Range(
            position.lineNumber,
            position.column,
            position.lineNumber,
            position.column
          ),
          text: '</>',
          forceMoveMarkers: true,
        },
      ]);
      editor.setPosition(position);
      return;
    }

    // Find the nearest unclosed `<TagName ...` on the current line (or multi-line opening tag up to 5 lines above)
    const startScanLine = Math.max(1, position.lineNumber - 5);
    let recentText = '';
    for (let ln = startScanLine; ln < position.lineNumber; ln++) {
      recentText += model.getLineContent(ln) + '\n';
    }
    recentText += textBefore;

    // Locate last `<` that isn't inside `{...}` JSX expression or string
    let braceDepth = 0;
    let openTagStart = -1;
    for (let i = recentText.length - 1; i >= 0; i--) {
      const ch = recentText[i];
      if (ch === '}') braceDepth++;
      else if (ch === '{') braceDepth = Math.max(0, braceDepth - 1);
      else if (ch === '>' && braceDepth === 0) {
        // Hit a previous closed tag before finding an unclosed `<`
        break;
      } else if (ch === '<' && braceDepth === 0) {
        openTagStart = i;
        break;
      }
    }

    if (openTagStart === -1) return;

    // If `>` was typed inside a `{ count > 0 }` JSX prop expression, braceDepth would be > 0 before the outer tag
    // Check brace balance between openTagStart and end of recentText
    let innerBraces = 0;
    for (let j = openTagStart; j < recentText.length; j++) {
      if (recentText[j] === '{') innerBraces++;
      else if (recentText[j] === '}') innerBraces--;
    }
    if (innerBraces > 0) return;

    const tagSegment = recentText.slice(openTagStart);
    // Do not match closing tags `</div`, comments `<!--`, or doctype `<!DOCTYPE`
    const tagMatch = tagSegment.match(/^<([a-zA-Z][a-zA-Z0-9._-]*)(?:[\s\n][^]*)?$/);
    if (!tagMatch) return;

    const exactTagName = tagMatch[1]; // Preserves PascalCase like `Navbar` or `CounterCard`!

    // Skip HTML5 void tags ONLY when lowercase (so `<Input>` React component still auto-closes!)
    if (exactTagName === exactTagName.toLowerCase() && VOID_HTML_TAGS.has(exactTagName)) {
      return;
    }

    const closingTag = `</${exactTagName}>`;
    if (textAfter.startsWith(closingTag)) return;

    editor.executeEdits('auto-close-tag', [
      {
        range: new monaco.Range(
          position.lineNumber,
          position.column,
          position.lineNumber,
          position.column
        ),
        text: closingTag,
        forceMoveMarkers: true,
      },
    ]);

    editor.setPosition(position);
  });

  // Smart Enter-between-tags indentation (`<div>|</div>` + Enter -> indented middle line!)
  const keyDownDisposable = editor.onKeyDown((e) => {
    if (e.keyCode !== monaco.KeyCode.Enter || e.shiftKey || e.ctrlKey || e.altKey || e.metaKey) {
      return;
    }
    const model = editor.getModel();
    const pos = editor.getPosition();
    if (!model || !pos) return;

    const line = model.getLineContent(pos.lineNumber);
    const before = line.slice(0, pos.column - 1);
    const after = line.slice(pos.column - 1);

    // Match `<Tag...>|` followed immediately by `</Tag>` or `<>|</>`
    const openEndMatch = before.match(/<([a-zA-Z0-9._-]*)(?:\s[^<>]*)?>$/);
    if (!openEndMatch) return;
    const tagName = openEndMatch[1]; // '' for Fragment `<>`
    if (!after.startsWith(`</${tagName}>`)) return;

    e.preventDefault();
    e.stopPropagation();

    const currentIndent = (line.match(/^\s*/) || [''])[0];
    const indentUnit = '  ';
    const insertBlock = `\n${currentIndent}${indentUnit}\n${currentIndent}`;

    editor.executeEdits('enter-between-tags', [
      {
        range: new monaco.Range(pos.lineNumber, pos.column, pos.lineNumber, pos.column),
        text: insertBlock,
        forceMoveMarkers: true,
      },
    ]);

    editor.setPosition({
      lineNumber: pos.lineNumber + 1,
      column: currentIndent.length + indentUnit.length + 1,
    });
  });

  return () => {
    contentDisposable.dispose();
    keyDownDisposable.dispose();
  };
}
