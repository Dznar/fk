import { EditorView, keymap, lineNumbers, highlightActiveLineGutter } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { markdown } from '@codemirror/lang-markdown';
import { oneDark } from '@codemirror/theme-one-dark';
import { syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language';

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
      history(),
      markdown(),
      oneDark,
      syntaxHighlighting(defaultHighlightStyle),
      keymap.of([...defaultKeymap, ...historyKeymap]),
      EditorView.updateListener.of((update) => {
        if (update.docChanged && onChange) {
          onChange(update.state.doc.toString());
        }
      }),
      EditorView.theme({
        '&': {
          height: '100%',
          fontSize: '14px',
        },
        '.cm-scroller': {
          overflow: 'auto',
          fontFamily: '"Fira Code", "Consolas", "Monaco", monospace',
        },
        '.cm-content': {
          padding: '16px 0',
        },
        '.cm-line': {
          padding: '0 16px',
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
