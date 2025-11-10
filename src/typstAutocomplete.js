import { autocompletion, completeFromList } from '@codemirror/autocomplete';

const TYPST_FUNCTIONS = [
  { label: 'heading', detail: 'Create a heading (use = instead)', type: 'keyword' },
  { label: 'paragraph', detail: 'Create a paragraph break', type: 'keyword' },
  { label: 'text', detail: 'Set text properties', type: 'function' },
  { label: 'align', detail: 'Align content', type: 'function' },
  { label: 'emph', detail: 'Emphasize text (italic)', type: 'function' },
  { label: 'strong', detail: 'Strong text (bold)', type: 'function' },
  { label: 'image', detail: 'Insert an image', type: 'function' },
  { label: 'figure', detail: 'Create a figure with caption', type: 'function' },
  { label: 'table', detail: 'Create a table', type: 'function' },
  { label: 'box', detail: 'Create a box container', type: 'function' },
  { label: 'block', detail: 'Create a styled block', type: 'function' },
  { label: 'list', detail: 'Create a bullet list', type: 'function' },
  { label: 'enum', detail: 'Create a numbered list', type: 'function' },
  { label: 'terms', detail: 'Create term definitions', type: 'function' },
  { label: 'outline', detail: 'Insert document outline/table of contents', type: 'function' },
  { label: 'pagebreak', detail: 'Insert a page break', type: 'function' },
  { label: 'page', detail: 'Configure page properties', type: 'function' },
  { label: 'set', detail: 'Set global properties', type: 'function' },
  { label: 'let', detail: 'Define a variable', type: 'function' },
  { label: 'show', detail: 'Configure element display', type: 'function' },
  { label: 'if', detail: 'Conditional statement', type: 'keyword' },
  { label: 'else', detail: 'Else clause', type: 'keyword' },
  { label: 'for', detail: 'Loop statement', type: 'keyword' },
  { label: 'while', detail: 'While loop', type: 'keyword' },
  { label: 'break', detail: 'Break loop', type: 'keyword' },
  { label: 'continue', detail: 'Continue loop', type: 'keyword' },
  { label: 'return', detail: 'Return from function', type: 'keyword' },
  { label: 'import', detail: 'Import module', type: 'keyword' },
  { label: 'include', detail: 'Include file', type: 'keyword' },
  { label: 'v', detail: 'Vertical spacing', type: 'function' },
  { label: 'h', detail: 'Horizontal spacing', type: 'function' },
  { label: 'pad', detail: 'Add padding', type: 'function' },
  { label: 'scale', detail: 'Scale content', type: 'function' },
  { label: 'rotate', detail: 'Rotate content', type: 'function' },
  { label: 'move', detail: 'Move content', type: 'function' },
  { label: 'place', detail: 'Place content at position', type: 'function' },
  { label: 'rect', detail: 'Draw a rectangle', type: 'function' },
  { label: 'circle', detail: 'Draw a circle', type: 'function' },
  { label: 'polygon', detail: 'Draw a polygon', type: 'function' },
  { label: 'line', detail: 'Draw a line', type: 'function' },
  { label: 'path', detail: 'Draw a path', type: 'function' },
  { label: 'grid', table: 'Create a grid layout', type: 'function' },
  { label: 'stack', detail: 'Stack elements', type: 'function' },
  { label: 'columns', detail: 'Create columns', type: 'function' },
];

const TYPST_PARAMETERS = {
  'text': ['font', 'size', 'weight', 'style', 'color', 'fill', 'stroke', 'ligatures', 'lang', 'script', 'region', 'top-edge', 'bottom-edge'],
  'page': ['width', 'height', 'margin', 'margin-top', 'margin-bottom', 'margin-left', 'margin-right', 'number-align', 'numbering', 'header', 'footer', 'background', 'fill'],
  'heading': ['level', 'numbering', 'outlined', 'bookmarked'],
  'image': ['width', 'height', 'fit', 'alt'],
  'table': ['columns', 'rows', 'gutter', 'stroke', 'fill', 'align', 'inset'],
  'block': ['width', 'height', 'fill', 'stroke', 'inset', 'outset', 'radius', 'above', 'below'],
  'box': ['width', 'height', 'fill', 'stroke', 'inset', 'outset', 'radius'],
  'figure': ['kind', 'caption', 'numbering', 'supplement'],
};

const TYPST_UNITS = [
  { label: 'pt', detail: 'Points', type: 'constant' },
  { label: 'mm', detail: 'Millimeters', type: 'constant' },
  { label: 'cm', detail: 'Centimeters', type: 'constant' },
  { label: 'in', detail: 'Inches', type: 'constant' },
  { label: 'em', detail: 'Relative to font size', type: 'constant' },
  { label: 'ex', detail: 'Relative to x-height', type: 'constant' },
  { label: '%', detail: 'Percentage', type: 'constant' },
];

function getContext(text, pos) {
  const line = text.slice(0, pos).split('\n').pop();
  const wordMatch = /[\w-]*$/.exec(line);
  const word = wordMatch ? wordMatch[0] : '';
  return { line, word };
}

function getTypstCompletions(context) {
  const { line, word } = getContext(context.state.doc.toString(), context.pos);
  const completions = [];

  if (line.includes('(') && !line.includes(')')) {
    const functionMatch = /#(\w+)\s*\(/.exec(line.slice(0, line.lastIndexOf(word)));
    if (functionMatch) {
      const funcName = functionMatch[1];
      const params = TYPST_PARAMETERS[funcName] || [];
      params.forEach(param => {
        if (param.startsWith(word)) {
          completions.push({
            label: param,
            type: 'property',
            detail: 'Parameter',
            apply: param + ': ',
          });
        }
      });
    }
  }

  TYPST_FUNCTIONS.forEach(func => {
    if (func.label.startsWith(word)) {
      completions.push({
        ...func,
        apply: func.label + '()',
      });
    }
  });

  if (word.match(/^\d*$/) || word === '') {
    TYPST_UNITS.forEach(unit => {
      if (unit.label.startsWith(word)) {
        completions.push(unit);
      }
    });
  }

  const markup = [
    { label: '=', detail: 'Heading level 1', type: 'keyword' },
    { label: '==', detail: 'Heading level 2', type: 'keyword' },
    { label: '===', detail: 'Heading level 3', type: 'keyword' },
    { label: '*bold*', detail: 'Bold text', type: 'keyword' },
    { label: '_italic_', detail: 'Italic text', type: 'keyword' },
    { label: '`code`', detail: 'Inline code', type: 'keyword' },
    { label: '- ', detail: 'Bullet list item', type: 'keyword' },
    { label: '+ ', detail: 'Numbered list item', type: 'keyword' },
    { label: '/ ', detail: 'Term definition', type: 'keyword' },
  ];

  markup.forEach(item => {
    if (item.label.startsWith(word) && word.length > 0) {
      completions.push(item);
    }
  });

  return completions.filter((comp, idx, arr) => arr.findIndex(c => c.label === comp.label) === idx);
}

export function typstAutocompleteSource(context) {
  if (context.matchBefore(/[\-#]/)) {
    const completions = getTypstCompletions(context);
    if (completions.length > 0) {
      return {
        from: context.pos - getContext(context.state.doc.toString(), context.pos).word.length,
        options: completions,
      };
    }
  }
  return null;
}

export function createTypstAutocompleteExtension() {
  return autocompletion({
    override: [typstAutocompleteSource],
  });
}
