import { EditorView, keymap, lineNumbers, highlightActiveLineGutter, highlightActiveLine } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { oneDark } from '@codemirror/theme-one-dark';
import { syntaxHighlighting, HighlightStyle, bracketMatching } from '@codemirror/language';
import { tags } from '@lezer/highlight';
import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import typstLanguage from './typstLanguage.js';

const typstHighlighting = HighlightStyle.define([
  { tag: tags.heading, color: '#4ec9b0', fontWeight: 'bold' },
  { tag: tags.keyword, color: '#569cd6' },
  { tag: tags.string, color: '#ce9178' },
  { tag: tags.comment, color: '#6a9955', fontStyle: 'italic' },
  { tag: tags.number, color: '#b5cea8' },
  { tag: tags.strong, color: '#dcdcaa', fontWeight: 'bold' },
  { tag: tags.emphasis, color: '#dcdcaa', fontStyle: 'italic' },
  { tag: tags.bracket, color: '#d4d4d4' },
  { tag: tags.labelName, color: '#4fc1ff' },
]);

export function createEditor(parent, onChange) {
  const startState = EditorState.create({
    doc: `= Heading Level 1
== Heading Level 2
=== Heading Level 3
==== Heading Level 4
===== Heading Level 5
====== Heading Level 6

This paragraph contains *bold text*, _italic text_, and #underline[underlined text].

Mathematical formula: $E = m c^2$

// This is a single-line comment and should be removed
/* This is a
   multi-line comment and should be removed */

#pagebreak()

#outline()

#v(1cm)
  #image("icons/32x32.png", width: 20%)
  caption: [Sample Figure Caption]


#block(
  fill: luma(20),
  inset: 100pt,
  radius: 80pt,
  [
    This is a styled block with some *bold* and _italic_ text.
  ]
)

- Bullet list item 1
- Bullet list item 2

+ Numbered list item 1
+ Numbered list item 2

/ Term 1: Definition 1
/ Term 2: Definition 2
`,
    extensions: [
      lineNumbers(),
      highlightActiveLineGutter(),
      highlightActiveLine(),
      history(),
      typstLanguage,
      oneDark,
      syntaxHighlighting(typstHighlighting),
      bracketMatching(),
      closeBrackets(),
      keymap.of([...defaultKeymap, ...historyKeymap, ...closeBracketsKeymap]),
      EditorView.updateListener.of((update) => {
        if (update.docChanged && onChange) {
          onChange(update.state.doc.toString());
        }
      }),
      EditorView.theme({
        '&': {
          height: '100%',
          fontSize: '15px',
        },
        '.cm-scroller': {
          overflow: 'auto',
          fontFamily: '"Fira Code", "JetBrains Mono", "Consolas", "Monaco", monospace',
          lineHeight: '1.6',
        },
        '.cm-content': {
          padding: '16px 0',
        },
        '.cm-line': {
          padding: '0 20px',
        },
        '.cm-activeLine': {
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
        },
        '.cm-activeLineGutter': {
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
        },
        '.cm-gutters': {
          backgroundColor: '#21252b',
          borderRight: '1px solid #3e3e42',
        },
        '.cm-lineNumbers .cm-gutterElement': {
          padding: '0 16px 0 8px',
          minWidth: '40px',
        },
        '.cm-cursor': {
          borderLeftColor: '#528bff',
          borderLeftWidth: '2px',
        },
        '.cm-selectionBackground': {
          backgroundColor: 'rgba(82, 139, 255, 0.3) !important',
        },
        '&.cm-focused .cm-selectionBackground': {
          backgroundColor: 'rgba(82, 139, 255, 0.3) !important',
        },
      }),
    ],
  });

  const view = new EditorView({
    state: startState,
    parent,
  });

  return view;
}
