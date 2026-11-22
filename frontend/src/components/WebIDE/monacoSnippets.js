/**
 * Monaco Editor Custom Emmet-like HTML & CSS Snippets and Auto-close Tag Handlers
 */

let snippetsRegistered = false;

// List of HTML void (self-closing) elements according to HTML5 spec
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

const HTML_TAG_SNIPPETS = [
  // Typography & Headers
  { tag: 'h1', snippet: '<h1>$0</h1>', desc: 'Heading 1' },
  { tag: 'h2', snippet: '<h2>$0</h2>', desc: 'Heading 2' },
  { tag: 'h3', snippet: '<h3>$0</h3>', desc: 'Heading 3' },
  { tag: 'h4', snippet: '<h4>$0</h4>', desc: 'Heading 4' },
  { tag: 'h5', snippet: '<h5>$0</h5>', desc: 'Heading 5' },
  { tag: 'h6', snippet: '<h6>$0</h6>', desc: 'Heading 6' },
  { tag: 'p', snippet: '<p>$0</p>', desc: 'Paragraph' },
  { tag: 'span', snippet: '<span>$0</span>', desc: 'Inline Span' },
  { tag: 'b', snippet: '<b>$0</b>', desc: 'Bold text' },
  { tag: 'strong', snippet: '<strong>$0</strong>', desc: 'Strong text' },
  { tag: 'i', snippet: '<i>$0</i>', desc: 'Italic text' },
  { tag: 'em', snippet: '<em>$0</em>', desc: 'Emphasized text' },
  { tag: 'small', snippet: '<small>$0</small>', desc: 'Small text' },
  { tag: 'code', snippet: '<code>$0</code>', desc: 'Inline code' },
  { tag: 'pre', snippet: '<pre>$0</pre>', desc: 'Preformatted text' },
  { tag: 'blockquote', snippet: '<blockquote>$0</blockquote>', desc: 'Blockquote' },

  // Layout & Containers
  { tag: 'div', snippet: '<div>$0</div>', desc: 'Generic Container (div)' },
  { tag: 'section', snippet: '<section>\n\t$0\n</section>', desc: 'Section element' },
  { tag: 'article', snippet: '<article>\n\t$0\n</article>', desc: 'Article element' },
  { tag: 'header', snippet: '<header>\n\t$0\n</header>', desc: 'Header banner' },
  { tag: 'footer', snippet: '<footer>\n\t$0\n</footer>', desc: 'Footer element' },
  { tag: 'main', snippet: '<main>\n\t$0\n</main>', desc: 'Main content' },
  { tag: 'nav', snippet: '<nav>\n\t$0\n</nav>', desc: 'Navigation bar' },
  { tag: 'aside', snippet: '<aside>\n\t$0\n</aside>', desc: 'Sidebar/Aside' },

  // Interactive & Forms
  { tag: 'button', snippet: '<button type="${1:button}">$0</button>', desc: 'Button' },
  { tag: 'a', snippet: '<a href="${1:#}">$0</a>', desc: 'Hyperlink' },
  { tag: 'form', snippet: '<form action="${1:#}" method="${2:POST}">\n\t$0\n</form>', desc: 'Form' },
  { tag: 'label', snippet: '<label for="${1:id}">$0</label>', desc: 'Form Label' },
  { tag: 'input', snippet: '<input type="${1:text}" placeholder="${2:Enter text...}" />', desc: 'Input field' },
  { tag: 'input:text', snippet: '<input type="text" placeholder="${1:Enter text...}" />', desc: 'Text input' },
  { tag: 'input:password', snippet: '<input type="password" placeholder="${1:Password}" />', desc: 'Password input' },
  { tag: 'input:email', snippet: '<input type="email" placeholder="${1:email@example.com}" />', desc: 'Email input' },
  { tag: 'input:number', snippet: '<input type="number" placeholder="${1:0}" />', desc: 'Number input' },
  { tag: 'input:checkbox', snippet: '<input type="checkbox" id="${1:check}" /> <label for="${1:check}">$0</label>', desc: 'Checkbox' },
  { tag: 'input:radio', snippet: '<input type="radio" name="${1:group}" id="${2:rad}" /> <label for="${2:rad}">$0</label>', desc: 'Radio' },
  { tag: 'input:submit', snippet: '<input type="submit" value="${1:Submit}" />', desc: 'Submit button' },
  { tag: 'textarea', snippet: '<textarea name="${1:message}" rows="${2:4}" placeholder="${3:Write here...}">$0</textarea>', desc: 'Textarea' },
  { tag: 'select', snippet: '<select name="${1:item}" id="${2:item}">\n\t<option value="${3:val}">$0</option>\n</select>', desc: 'Select dropdown' },
  { tag: 'option', snippet: '<option value="${1:val}">$0</option>', desc: 'Dropdown option' },

  // Lists
  { tag: 'ul', snippet: '<ul>\n\t<li>$0</li>\n</ul>', desc: 'Unordered list' },
  { tag: 'ol', snippet: '<ol>\n\t<li>$0</li>\n</ol>', desc: 'Ordered list' },
  { tag: 'li', snippet: '<li>$0</li>', desc: 'List item' },

  // Tables
  { tag: 'table', snippet: '<table>\n\t<thead>\n\t\t<tr>\n\t\t\t<th>$1</th>\n\t\t</tr>\n\t</thead>\n\t<tbody>\n\t\t<tr>\n\t\t\t<td>$0</td>\n\t\t</tr>\n\t</tbody>\n</table>', desc: 'HTML Table' },
  { tag: 'tr', snippet: '<tr>$0</tr>', desc: 'Table row' },
  { tag: 'th', snippet: '<th>$0</th>', desc: 'Table header cell' },
  { tag: 'td', snippet: '<td>$0</td>', desc: 'Table data cell' },
  { tag: 'thead', snippet: '<thead>$0</thead>', desc: 'Table header group' },
  { tag: 'tbody', snippet: '<tbody>$0</tbody>', desc: 'Table body group' },

  // Media & Embedded
  { tag: 'img', snippet: '<img src="${1:image.jpg}" alt="${2:description}" />', desc: 'Image' },
  { tag: 'video', snippet: '<video src="${1:video.mp4}" controls>$0</video>', desc: 'Video player' },
  { tag: 'audio', snippet: '<audio src="${1:audio.mp3}" controls>$0</audio>', desc: 'Audio player' },
  { tag: 'iframe', snippet: '<iframe src="${1:https://...}" title="${2:frame}" width="100%" height="${3:400}"></iframe>', desc: 'iFrame embed' },
  { tag: 'canvas', snippet: '<canvas id="${1:myCanvas}" width="${2:300}" height="${3:150}"></canvas>', desc: 'Canvas' },

  // Self-closing & Utilities
  { tag: 'br', snippet: '<br />', desc: 'Line break' },
  { tag: 'hr', snippet: '<hr />', desc: 'Horizontal rule' },
  { tag: 'link', snippet: '<link rel="stylesheet" href="${1:style.css}" />', desc: 'CSS Stylesheet Link' },
  { tag: 'script', snippet: '<script src="${1:script.js}"></script>', desc: 'Script tag (external)' },
  { tag: 'script:inline', snippet: '<script>\n\t$0\n</script>', desc: 'Inline Script' },
  { tag: 'style', snippet: '<style>\n\t$0\n</style>', desc: 'Inline Style' },

  // Full Boilerplate
  {
    tag: '!',
    snippet: '<!DOCTYPE html>\n<html lang="en">\n<head>\n\t<meta charset="UTF-8" />\n\t<meta name="viewport" content="width=device-width, initial-scale=1.0" />\n\t<title>${1:Document}</title>\n</head>\n<body>\n\t$0\n</body>\n</html>',
    desc: 'HTML5 Boilerplate',
  },
  {
    tag: 'html:5',
    snippet: '<!DOCTYPE html>\n<html lang="en">\n<head>\n\t<meta charset="UTF-8" />\n\t<meta name="viewport" content="width=device-width, initial-scale=1.0" />\n\t<title>${1:Document}</title>\n</head>\n<body>\n\t$0\n</body>\n</html>',
    desc: 'HTML5 Template',
  },
];

const CSS_SNIPPETS = [
  { prefix: 'df', snippet: 'display: flex;\njustify-content: ${1:center};\nalign-items: ${2:center};', desc: 'Flexbox center' },
  { prefix: 'flex', snippet: 'display: flex;\n$0', desc: 'Display flex' },
  { prefix: 'grid', snippet: 'display: grid;\ngrid-template-columns: repeat(${1:3}, 1fr);\ngap: ${2:16px};', desc: 'CSS Grid' },
  { prefix: 'cen', snippet: 'display: flex;\njustify-content: center;\nalign-items: center;', desc: 'Center with Flex' },
  { prefix: 'bg', snippet: 'background-color: ${1:#ffffff};', desc: 'Background color' },
  { prefix: 'bgi', snippet: 'background-image: url("${1:image.jpg}");\nbackground-size: cover;\nbackground-position: center;', desc: 'Background image cover' },
  { prefix: 'c', snippet: 'color: ${1:#333333};', desc: 'Text color' },
  { prefix: 'color', snippet: 'color: ${1:#333333};', desc: 'Text color' },
  { prefix: 'p', snippet: 'padding: ${1:12px};', desc: 'Padding' },
  { prefix: 'm', snippet: 'margin: ${1:0 auto};', desc: 'Margin center' },
  { prefix: 'w', snippet: 'width: ${1:100%};', desc: 'Width 100%' },
  { prefix: 'h', snippet: 'height: ${1:100vh};', desc: 'Height 100vh' },
  { prefix: 'maxw', snippet: 'max-width: ${1:1200px};\nmargin: 0 auto;', desc: 'Max width container' },
  { prefix: 'fs', snippet: 'font-size: ${1:16px};', desc: 'Font size' },
  { prefix: 'fw', snippet: 'font-weight: ${1:bold};', desc: 'Font weight' },
  { prefix: 'ff', snippet: 'font-family: ${1:system-ui, -apple-system, sans-serif};', desc: 'Font family' },
  { prefix: 'tc', snippet: 'text-align: ${1:center};', desc: 'Text align center' },
  { prefix: 'b', snippet: 'border: ${1:1px solid #e2e8f0};', desc: 'Border' },
  { prefix: 'br', snippet: 'border-radius: ${1:8px};', desc: 'Border radius' },
  { prefix: 'bs', snippet: 'box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);', desc: 'Box shadow' },
  { prefix: 'cur', snippet: 'cursor: pointer;', desc: 'Cursor pointer' },
  { prefix: 'pos', snippet: 'position: ${1:relative};', desc: 'Position relative' },
  { prefix: 'posa', snippet: 'position: absolute;\ntop: ${1:0};\nleft: ${2:0};', desc: 'Position absolute' },
  { prefix: 'tr', snippet: 'transition: all ${1:0.3s} ease;', desc: 'CSS Transition' },
];

export function registerMonacoSnippets(monaco) {
  if (snippetsRegistered || !monaco || !monaco.languages) return;
  snippetsRegistered = true;

  // 1. Register HTML Snippets for 'html' and 'javascriptreact'
  const htmlProvider = {
    provideCompletionItems: (model, position) => {
      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      };

      const suggestions = HTML_TAG_SNIPPETS.map((item, idx) => ({
        label: item.tag,
        kind: monaco.languages.CompletionItemKind.Snippet,
        documentation: item.desc,
        insertText: item.snippet,
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        range: range,
        sortText: '0000_' + String(idx).padStart(4, '0'),
        detail: `Tag: <${item.tag}>...</${item.tag}>`,
      }));

      return { suggestions };
    },
  };

  monaco.languages.registerCompletionItemProvider('html', htmlProvider);
  monaco.languages.registerCompletionItemProvider('javascriptreact', htmlProvider);

  // 2. Register CSS Snippets
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
        range: range,
        sortText: '0000_' + String(idx).padStart(4, '0'),
        detail: `CSS: ${item.desc}`,
      }));

      return { suggestions };
    },
  });
}

/**
 * Attaches smart auto-closing tag listener to Monaco editor instance
 * When user types `>` after an opening tag like `<h1>` or `<div class="...">`,
 * it automatically writes `</h1>` or `</div>` and keeps cursor in between.
 */
export function setupAutoCloseTags(editor, monaco) {
  if (!editor || !monaco) return () => {};

  const disposable = editor.onDidChangeModelContent((event) => {
    const changes = event.changes;
    if (!changes || changes.length === 0) return;

    // Check if the character just inserted is '>'
    const change = changes[0];
    if (change.text !== '>') return;

    const position = editor.getPosition();
    const model = editor.getModel();
    if (!position || !model) return;

    const lineContent = model.getLineContent(position.lineNumber);
    // Everything up to the '>' that was just typed
    const textBefore = lineContent.substring(0, position.column - 1);

    // Regex to match an opening tag: <tag or <tag attr="val"
    // Does NOT match closing tags (</tag>) or comments (<!--)
    const match = textBefore.match(/<([a-zA-Z0-9-]+)(?:\s+[^<>]*)?$/);
    if (!match) return;

    const tagName = match[1].toLowerCase();

    // Do not auto-close void tags (img, input, hr, br, etc.)
    if (VOID_HTML_TAGS.has(tagName)) return;

    // Check if closing tag is already typed right after
    const textAfter = lineContent.substring(position.column - 1);
    if (textAfter.startsWith(`</${tagName}>`)) return;

    const closingTag = `</${tagName}>`;

    // Insert closing tag right after cursor position without moving cursor
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

    // Position cursor between opening and closing tags: <tag>|</tag>
    editor.setPosition(position);
  });

  return () => {
    disposable.dispose();
  };
}
