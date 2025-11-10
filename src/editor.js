import { EditorView, keymap, lineNumbers, highlightActiveLineGutter, highlightActiveLine } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { oneDark } from '@codemirror/theme-one-dark';
import { syntaxHighlighting, HighlightStyle, bracketMatching } from '@codemirror/language';
import { tags } from '@lezer/highlight';
import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import typstLanguage from './typstLanguage.js';
import { createTypstAutocompleteExtension } from './typstAutocomplete.js';
import { findReplaceExtension } from './findReplace.js';
import { syntaxValidationExtension } from './syntaxValidator.js';

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
    doc: `// page parameters
#set page(
 // height: 100pt,
 // margin: 20pt,
   header: [
    #set text(10pt)
    #smallcaps[Top left]
    #h(1fr) _Top right_
  ],
  footer: context [
    #set align(right)
    #set text(8pt)
    #counter(page).display(
    // current page of how many pages in the document feel free to edit
      "1 of I",
      both: true,
    )
  ]
)
// remove the // from the line below if you want the titles to be enumerated in Roman
// #set heading(numbering: "I")
= Heading Level 1
== Heading Level 2
=== Heading Level 3
==== Heading Level 4
===== Heading Level 5
====== Heading Level 6

This paragraph contains *bold text*, _italic text_, and #underline[underlined text].
// the backslash  is to return to line

Mathematical formula: $E = m c^2$

#emph[Hello] 
#emoji.face 
// count

#"hello".len()
//we'll add some space 
#v(0.5cm)
// adding a grid here
#grid(
    columns: (1fr, 1fr),
    gutter: 2cm,
    [
      #text(1.1em)[
        #box(width: 100%, inset: (bottom: 0.5em))[
          #grid(columns: (auto, 1fr), gutter: 1em, align(right, text(weight: "bold")[Auteur :]), "Fakhri Mrabet")
        ]
        #box(width: 100%, inset: (bottom: 0.5em))[
          #grid(columns: (auto, 1fr), gutter: 0.72em, align(right, text(weight: "bold")[Diploma :]), "Cloud & Network Engineer")
        ]
      ]
    ],
    [
      #text(1.1em)[
        #box(width: 100%, inset: (bottom: 0.5em))[
          #grid(columns: (auto, 1fr), gutter: 1em, align(right, text(weight: "bold")[Université :]), "EPI")
        ]
        #box(width: 100%, inset: (bottom: 0.5em))[
         #grid(columns: (auto, 1fr), gutter: 1em, align(right, text(weight: "bold")[Année Universitaire :]), "2024-2025")
        ]
      ]
    ]
  )

//setting a colored table
#set table(
  stroke: none,
  gutter: 0.2em,
  //filling the table box cells with gray color
  fill: (x, y) =>
    if x == 0 or y == 0 { gray },
  inset: (right: 1.5em),
)

#show table.cell: it => {
  if it.x == 0 or it.y == 0 {
  // coloring the default cells white
    set text(white)
    strong(it)
  } else if it.body == [] {
    // Replace empty cells with 'N/A'
    pad(..it.inset)[_N/A_]
  } else {
    it
  }
}
// a is for A cells
#let a = table.cell(
  fill: blue.lighten(60%),
)[A]
// b is for B cells
#let b = table.cell(
  fill: red.lighten(60%),
)[B]
// this is the actual table requirements to make it created
#table(
  columns: 4,
  [], [Exam 1], [Exam 2], [Exam 3],

  [John], [], a, [],
  [Mary], [], a, a,
  [Robert], b, a, b,
)
  #show regex("[♚-♟︎]"): set text(fill: rgb("21212A"))
#show regex("[♔-♙]"): set text(fill: rgb("111015"))
// we'll add a chess board for fun here
#grid(
  fill: (x, y) => rgb(
    if calc.odd(x + y) { "7F8396" }
    else { "EFF0F3" }
  ),
  columns: (1em,) * 8,
  rows: 1em,
  align: center + horizon,

  [♖], [♘], [♗], [♕], [♔], [♗], [♘], [♖],
  [♙], [♙], [♙], [♙], [],  [♙], [♙], [♙],
  grid.cell(
    x: 4, y: 3,
    stroke: blue.transparentize(60%)
  )[♙],

  ..(grid.cell(y: 6)[♟],) * 8,
  ..([♜], [♞], [♝], [♛], [♚], [♝], [♞], [♜])
    .map(grid.cell.with(y: 7)),
)
#pagebreak()

#outline()

#pagebreak()
#block(
  fill: luma(100),
  inset: 50pt,
  radius: 80pt,
  [
    This is a styled block with some *bold* and _italic_ text.
  ]
)

- Bullet list item 1
- Bullet list item 2

+ Numbered list item 1
+ Numbered list item 2

#set enum(numbering: "a)")

+ Starting off ...
+ Don't forget step two

#set enum(numbering: "1.a)", full: true)
+ Cook
  + Heat water
  + Add ingredients
+ Eat

#set enum(reversed: true)
+ Coffee
+ Tea
+ Milk

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
      createTypstAutocompleteExtension(),
      findReplaceExtension,
      syntaxValidationExtension,
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
