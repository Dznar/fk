export function renderTypstPreview(content) {
  // --- Step 0: Parse complex Typst functions with parameters and nested blocks first ---
  let html = parseTypstFunctions(content);

  // --- Step 1: Remove comments ---
  html = html.replace(/\/\/.*$/gm, ''); // Single-line comments
  html = html.replace(/\/\*[\s\S]*?\*\//g, ''); // Block comments

  // --- Step 2: Handle character escapes ---
  html = html.replace(/\\#/g, '&#35;'); // Escaped hash
  html = html.replace(/\\([*_`~@<>])/g, '$1'); // Escaped special chars

  // --- Step 3: Process simpler Typst functions and blocks ---

  // Page breaks
  html = html.replace(/#pagebreak\(\s*\)/g, '<hr class="pagebreak">');

  // Outline/Table of Contents
  html = html.replace(/#outline\(\s*\)/g, '<nav class="outline"><ul class="toc-list"></ul></nav>');

  // Vertical spacing - supports various units
  html = html.replace(/#v\(([0-9.]+)\s*(cm|mm|pt|em|ex|in|pc)\)/g, '<div style="height:$1$2"></div>');
  html = html.replace(/#v\s*$/gm, '<div class="v-space"></div>');

  // Figures and captions
  html = html.replace(/#figure\(\s*([\s\S]*?)\s*,\s*caption:\s*\[([^\]]+)\]\s*\)/g, '<figure>$1<figcaption>$2</figcaption></figure>');
  html = html.replace(/#figure\(\s*([\s\S]*?)\s*\)/g, '<figure>$1</figure>');
  html = html.replace(/caption:\s*\[([^\]]+)\]/g, '<figcaption>$1</figcaption>');

  // Tables (basic support)
  html = html.replace(/#table\(\s*[\s\S]*?\)/g, '<table class="typst-table"><tr><td>Table content</td></tr></table>');

  // Enhanced blocks with parameter parsing
  html = html.replace(
    /#block\(\s*fill:\s*luma\((\d+)\),\s*inset:\s*(\d+)pt,\s*radius:\s*(\d+)pt,\s*\[([^\]]+)\]\s*\)/g,
    '<div class="block" style="background-color:rgb($1,$1,$1);padding:$2px;border-radius:$3px">$4</div>'
  );
  html = html.replace(/#block\(\s*([^)]*)\s*,\s*\[([^\]]+)\]\s*\)/g, '<div class="block">$2</div>');
  html = html.replace(/#block\(\s*\[([^\]]+)\]\s*\)/g, '<div class="block">$1</div>');

  // --- Step 4: Process headings (levels 1-6) ---
  html = html.replace(/^======\s+(.+)$/gm, '<h6>$1</h6>');
  html = html.replace(/^=====\s+(.+)$/gm, '<h5>$1</h5>');
  html = html.replace(/^====\s+(.+)$/gm, '<h4>$1</h4>');
  html = html.replace(/^===\s+(.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^==\s+(.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^=\s+(.+)$/gm, '<h1>$1</h1>');

  // --- Step 5: Text formatting ---
  html = html.replace(/#underline\[([^\]]+)\]/g, '<u>$1</u>');
  html = html.replace(/\*([^*\n]+)\*/g, '<strong>$1</strong>');
  html = html.replace(/_([^_\n]+)_/g, '<em>$1</em>');
  html = html.replace(/\$([^$\n]+)\$/g, '<span class="math">$1</span>');

  // --- Step 6: Links and references ---
  html = html.replace(/(https?:\/\/[^\s<>"]+)/g, '<a href="$1">$1</a>');
  html = html.replace(/<([a-zA-Z][a-zA-Z0-9_-]*)>/g, '<span id="$1" class="label"></span>');
  html = html.replace(/@([a-zA-Z][a-zA-Z0-9_-]*)/g, '<a href="#$1" class="ref">@$1</a>');

  // --- Step 7: Lists ---
  html = html.replace(/^\/\s*([^:\n]+):\s*(.+)$/gm, '<dt>$1</dt><dd>$2</dd>');
  html = html.replace(/(<dt>.*<\/dt>\s*<dd>.*<\/dd>\s*)+/g, '<dl>$&</dl>');
  html = html.replace(/^-\s+(.+)$/gm, '<li>$1</li>');
  html = html.replace(/^\+\s+(.+)$/gm, '<li class="numbered">$1</li>');
  html = html.replace(/(<li(?:\s+class="numbered")?>.*<\/li>\s*)+/g, match => {
    if (match.includes('class="numbered"')) {
      return '<ol>' + match.replace(/class="numbered"/g, '') + '</ol>';
    }
    return '<ul>' + match + '</ul>';
  });

  // --- Step 8: Code blocks and inline code ---
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>');
  html = html.replace(/`([^`\n]+)`/g, '<code>$1</code>');

  // --- Step 9: Special characters and typography ---
  html = html.replace(/\\\s*$/gm, '<br>');
  html = html.replace(/"([^"\n]+)"/g, '"$1"');
  html = html.replace(/'([^'\n]+)'/g, "'$1'");
  html = html.replace(/---/g, '&mdash;');
  html = html.replace(/--/g, '&ndash;');
  html = html.replace(/~/g, '&nbsp;');
  html = html.replace(/\.{3}/g, '&hellip;');

  // --- Step 10: Paragraphs and cleanup ---
  html = html.replace(/\n\n+/g, '</p><p>');
  html = '<p>' + html + '</p>';
  html = html.replace(/<p>(<h[1-6]>)/g, '$1');
  html = html.replace(/(<\/h[1-6]>)<\/p>/g, '$1');
  html = html.replace(/<p>(<(?:ul|ol|dl|div|figure|table|pre|hr|nav)[\s>])/g, '$1');
  html = html.replace(/(<\/(?:ul|ol|dl|div|figure|table|pre|hr|nav)>)<\/p>/g, '$1');
  html = html.replace(/<p>(<img[^>]*>)<\/p>/g, '$1');
  html = html.replace(/<p>\s*<\/p>/g, '');
  html = html.replace(/<p><\/p>/g, '');

  return html;

  // --- Recursive parser for complex Typst functions ---
  function parseTypstFunctions(input) {
    const funcRegex = /#([a-zA-Z]+)\s*\(([\s\S]*?)\)/g;

    function parseParams(paramStr) {
      let params = {};
      let blocks = [];
      let rest = paramStr.trim();

      // Extract named parameters key: value (simple, no nested parsing)
      const namedParamRegex = /([a-zA-Z]+)\s*:\s*([^,\[\]\(\)]+|(\([^)]+\)))/g;
      let match;
      while ((match = namedParamRegex.exec(rest)) !== null) {
        params[match[1]] = match[2].trim();
      }

      // Extract blocks inside [ ... ]
      const blockRegex = /\[([\s\S]*?)\]/g;
      while ((match = blockRegex.exec(rest)) !== null) {
        blocks.push(match[1].trim());
      }

      return { params, blocks };
    }

    function replaceFuncCalls(str) {
      return str.replace(funcRegex, (full, name, paramStr) => {
        const { params, blocks } = parseParams(paramStr);

        if (name === 'image') {
          const srcMatch = paramStr.match(/["']([^"']+)["']/);
          const src = srcMatch ? srcMatch[1] : '';
          const width = params.width || 'auto';
          return `<img src="${src}" style="width:${width}">`;
        }

        if (name === 'grid') {
          const columns = params.columns || 'auto';
          const gutter = params.gutter || '0';
          const columnsCss = columns.replace(/[()]/g, '');
          const content = blocks.map(b => replaceFuncCalls(b)).join('');
          return `<div class="grid" style="display:grid; grid-template-columns:${columnsCss}; gap:${gutter};">${content}</div>`;
        }

        // Add more function handlers here as needed (e.g., #box, #text, #figure)

        if (blocks.length) {
          return blocks.map(b => replaceFuncCalls(b)).join('');
        }

        return full; // fallback: no change
      });
    }

    return replaceFuncCalls(input);
  }
}
