export const typstSnippets = {
  'table': {
    label: 'table',
    detail: 'Insert table template',
    template: `#table(
  columns: ($1),
  [$2], [$3],
  [$4], [$5]
)`,
    cursorPosition: 0
  },
  'grid': {
    label: 'grid',
    detail: 'Insert grid layout',
    template: `#grid(
  columns: ($1),
  gutter: $2,
  [$3],
  [$4]
)`,
    cursorPosition: 0
  },
  'figure': {
    label: 'figure',
    detail: 'Insert figure with caption',
    template: `#figure(
  image("$1"),
  caption: [$2]
)`,
    cursorPosition: 0
  },
  'block': {
    label: 'block',
    detail: 'Insert styled block',
    template: `#block(
  fill: luma($1),
  inset: $2pt,
  radius: $3pt,
  [
    $4
  ]
)`,
    cursorPosition: 0
  },
  'page': {
    label: 'page',
    detail: 'Insert page configuration',
    template: `#set page(
  width: $1,
  height: $2,
  margin: $3pt,
  header: [$4],
  footer: [$5]
)`,
    cursorPosition: 0
  },
  'header': {
    label: 'header',
    detail: 'Insert page header template',
    template: `header: [
  #set text(10pt)
  $1
  #h(1fr) $2
]`,
    cursorPosition: 0
  },
  'footer': {
    label: 'footer',
    detail: 'Insert page footer template',
    template: `footer: context [
  #set align($1)
  #counter(page).display("1 of I", both: true)
]`,
    cursorPosition: 0
  },
  'color': {
    label: 'color',
    detail: 'Insert color definition',
    template: `rgb("$1")`,
    cursorPosition: 0
  },
  'equation': {
    label: 'equation',
    detail: 'Insert numbered equation',
    template: `$ $1 $`,
    cursorPosition: 0
  },
  'list': {
    label: 'list',
    detail: 'Insert bullet list',
    template: `- $1
- $2
- $3`,
    cursorPosition: 0
  },
  'enum': {
    label: 'enum',
    detail: 'Insert numbered list',
    template: `+ $1
+ $2
+ $3`,
    cursorPosition: 0
  },
  'terms': {
    label: 'terms',
    detail: 'Insert term definitions',
    template: `/ $1: $2
/ $3: $4`,
    cursorPosition: 0
  },
  'function': {
    label: 'function',
    detail: 'Insert function definition',
    template: `#let $1($2) = {
  $3
}`,
    cursorPosition: 0
  },
  'align': {
    label: 'align',
    detail: 'Insert alignment block',
    template: `#align($1)[
  $2
]`,
    cursorPosition: 0
  },
  'columns': {
    label: 'columns',
    detail: 'Insert columns layout',
    template: `#columns($1)[
  $2
]`,
    cursorPosition: 0
  }
};

export function expandSnippet(snippetKey) {
  const snippet = typstSnippets[snippetKey];
  if (!snippet) return null;

  return {
    text: snippet.template,
    label: snippet.label,
    detail: snippet.detail
  };
}
