import { EditorView, Decoration } from '@codemirror/view';
import { StateField, StateEffect } from '@codemirror/state';

export const setSearchQuery = StateEffect.define();
export const setReplaceText = StateEffect.define();

const searchHighlighter = StateField.define({
  create() {
    return { query: '', decorations: Decoration.none };
  },
  update(value, tr) {
    for (let effect of tr.effects) {
      if (effect.is(setSearchQuery)) {
        const query = effect.value;
        if (!query) {
          return { query: '', decorations: Decoration.none };
        }

        const decorations = [];
        const text = tr.state.doc.toString();
        const regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        let match;

        while ((match = regex.exec(text)) !== null) {
          decorations.push(
            Decoration.mark({
              class: 'cm-search-match'
            }).range(match.index, match.index + match[0].length)
          );
        }

        return {
          query,
          decorations: Decoration.set(decorations)
        };
      }
    }
    return value;
  },
  provide: f => EditorView.decorations.from(f, v => v.decorations)
});

export const searchHighlightTheme = EditorView.baseTheme({
  '.cm-search-match': {
    backgroundColor: 'rgba(255, 200, 0, 0.3)',
    borderRadius: '2px'
  }
});

export const findReplaceExtension = [searchHighlighter, searchHighlightTheme];

export function findNext(view, query, fromPos = 0) {
  if (!query) return null;

  const text = view.state.doc.toString();
  const regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
  regex.lastIndex = fromPos;

  const match = regex.exec(text);
  if (match) {
    return { from: match.index, to: match.index + match[0].length };
  }

  // Wrap around
  regex.lastIndex = 0;
  const wrapMatch = regex.exec(text);
  if (wrapMatch && wrapMatch.index < fromPos) {
    return { from: wrapMatch.index, to: wrapMatch.index + wrapMatch[0].length };
  }

  return null;
}

export function replaceNext(view, query, replaceText) {
  const selection = view.state.selection.main;
  const selectedText = view.state.doc.sliceString(selection.from, selection.to);

  if (selectedText.toLowerCase() === query.toLowerCase()) {
    view.dispatch({
      changes: { from: selection.from, to: selection.to, insert: replaceText },
      selection: { anchor: selection.from + replaceText.length }
    });
    return true;
  }

  const match = findNext(view, query, selection.to);
  if (match) {
    view.dispatch({
      selection: { anchor: match.from, head: match.to }
    });
  }
  return false;
}

export function replaceAll(view, query, replaceText) {
  if (!query) return 0;

  const text = view.state.doc.toString();
  const regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
  const changes = [];
  let match;
  let count = 0;

  while ((match = regex.exec(text)) !== null) {
    changes.push({
      from: match.index,
      to: match.index + match[0].length,
      insert: replaceText
    });
    count++;
  }

  if (changes.length > 0) {
    view.dispatch({ changes });
  }

  return count;
}
