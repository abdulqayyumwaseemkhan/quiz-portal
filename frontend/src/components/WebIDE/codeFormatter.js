// Browser-native Prettier v3 Formatter for HTML, CSS, JavaScript, React JSX, JSON & Markdown
// Lazy-loads Prettier standalone & parser plugins so initial IDE load stays fast.

let prettierCache = null;

async function loadPrettierBundle() {
  if (prettierCache) return prettierCache;

  const [
    prettierStandalone,
    babelPlugin,
    estreePlugin,
    htmlPlugin,
    postcssPlugin,
    markdownPlugin,
  ] = await Promise.all([
    import('prettier/standalone'),
    import('prettier/plugins/babel'),
    import('prettier/plugins/estree'),
    import('prettier/plugins/html'),
    import('prettier/plugins/postcss'),
    import('prettier/plugins/markdown'),
  ]);

  prettierCache = {
    format: prettierStandalone.format || prettierStandalone.default?.format,
    plugins: [
      babelPlugin.default || babelPlugin,
      estreePlugin.default || estreePlugin,
      htmlPlugin.default || htmlPlugin,
      postcssPlugin.default || postcssPlugin,
      markdownPlugin.default || markdownPlugin,
    ],
  };

  return prettierCache;
}

export function getPrettierParserForFile(filePath = '', fallbackLanguage = '') {
  const lower = String(filePath).split('/').pop()?.toLowerCase() || '';
  const ext = lower.includes('.') ? lower.split('.').pop() : '';

  if (ext === 'html' || ext === 'htm' || fallbackLanguage === 'html') return 'html';
  if (ext === 'css' || fallbackLanguage === 'css') return 'css';
  if (ext === 'json' || fallbackLanguage === 'json') return 'json';
  if (ext === 'md' || fallbackLanguage === 'markdown') return 'markdown';
  if (
    ['js', 'jsx', 'mjs', 'cjs', 'ts', 'tsx'].includes(ext) ||
    fallbackLanguage === 'javascript' ||
    fallbackLanguage === 'javascriptreact'
  ) {
    return 'babel';
  }
  return null;
}

export async function formatCodeWithPrettier(code = '', filePath = '', language = '') {
  const parser = getPrettierParserForFile(filePath, language);
  if (!parser) {
    return { formatted: code, changed: false, unsupported: true };
  }

  const { format, plugins } = await loadPrettierBundle();
  const formatted = await format(String(code), {
    parser,
    plugins,
    semi: true,
    singleQuote: parser === 'babel',
    jsxSingleQuote: false,
    tabWidth: 2,
    useTabs: false,
    trailingComma: 'es5',
    printWidth: 88,
    bracketSpacing: true,
    arrowParens: 'always',
  });

  return {
    formatted,
    changed: formatted !== code,
    unsupported: false,
  };
}

let formattingProvidersRegistered = false;

export function registerPrettierFormatterWithMonaco(monaco) {
  if (formattingProvidersRegistered || !monaco?.languages) return;
  formattingProvidersRegistered = true;

  const targetLanguages = ['javascript', 'typescript', 'html', 'css', 'json', 'markdown'];

  targetLanguages.forEach((lang) => {
    monaco.languages.registerDocumentFormattingEditProvider(lang, {
      provideDocumentFormattingEdits: async (model) => {
        try {
          const source = model.getValue();
          const uriPath = model.uri?.path || '';
          const { formatted, changed } = await formatCodeWithPrettier(source, uriPath, lang);
          if (!changed) return [];
          return [
            {
              range: model.getFullModelRange(),
              text: formatted,
            },
          ];
        } catch (err) {
          console.warn('Prettier formatting error:', err.message);
          return [];
        }
      },
    });
  });
}
