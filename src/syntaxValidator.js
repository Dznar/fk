import { Decoration } from '@codemirror/view';
import { StateField, StateEffect } from '@codemirror/state';
import { EditorView } from '@codemirror/view';

export const addDiagnostics = StateEffect.define();

const diagnosticField = StateField.define({
  create() {
    return Decoration.none;
  },
  update(diagnostics, tr) {
    diagnostics = diagnostics.map(tr.changes);
    for (let effect of tr.effects) {
      if (effect.is(addDiagnostics)) {
        diagnostics = addDiagnosticDecorations(tr.state.doc, effect.value);
      }
    }
    return diagnostics;
  },
  provide: f => EditorView.decorations.from(f)
});

function addDiagnosticDecorations(doc, errors) {
  const decorations = [];

  for (let error of errors) {
    decorations.push(
      Decoration.mark({
        class: 'cm-error-highlight',
        attributes: { title: error.message }
      }).range(error.from, error.to)
    );
  }

  return Decoration.set(decorations, true);
}

export const diagnosticTheme = EditorView.baseTheme({
  '.cm-error-highlight': {
    textDecoration: 'wavy underline',
    textDecorationColor: '#f48771',
    textDecorationThickness: '2px'
  }
});

export function validateTypstSyntax(text) {
  const errors = [];
  const lines = text.split('\n');

  // Check for unmatched brackets
  const brackets = { '(': ')', '[': ']', '{': '}' };
  const stack = [];
  let pos = 0;

  for (let char of text) {
    if (brackets[char]) {
      stack.push({ char, pos });
    } else if (Object.values(brackets).includes(char)) {
      if (stack.length === 0) {
        errors.push({
          from: pos,
          to: pos + 1,
          message: `Unmatched closing bracket '${char}'`
        });
      } else {
        const last = stack.pop();
        if (brackets[last.char] !== char) {
          errors.push({
            from: last.pos,
            to: last.pos + 1,
            message: `Mismatched bracket: expected '${brackets[last.char]}' but found '${char}'`
          });
        }
      }
    }
    pos++;
  }

  // Report unclosed brackets
  for (let unclosed of stack) {
    errors.push({
      from: unclosed.pos,
      to: unclosed.pos + 1,
      message: `Unclosed bracket '${unclosed.char}'`
    });
  }

  // Check for unclosed strings
  let inString = false;
  let stringStart = 0;
  pos = 0;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const prevChar = i > 0 ? text[i - 1] : '';

    if (char === '"' && prevChar !== '\\') {
      if (!inString) {
        inString = true;
        stringStart = i;
      } else {
        inString = false;
      }
    }

    if (char === '\n' && inString) {
      errors.push({
        from: stringStart,
        to: i,
        message: 'Unclosed string'
      });
      inString = false;
    }
  }

  if (inString) {
    errors.push({
      from: stringStart,
      to: text.length,
      message: 'Unclosed string at end of document'
    });
  }

  return errors;
}

export const syntaxValidationExtension = [diagnosticField, diagnosticTheme];

export function runValidation(view) {
  const text = view.state.doc.toString();
  const errors = validateTypstSyntax(text);

  view.dispatch({
    effects: addDiagnostics.of(errors)
  });
}
