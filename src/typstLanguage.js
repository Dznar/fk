import { StreamLanguage } from '@codemirror/language';

const typstLanguage = StreamLanguage.define({
  name: 'typst',

  token(stream, state) {
    if (stream.eatSpace()) return null;

    // Comments
    if (stream.match(/\/\/.*/)) return 'comment';
    if (stream.match(/\/\*/)) {
      state.inBlockComment = true;
      return 'comment';
    }
    if (state.inBlockComment) {
      if (stream.match(/\*\//)) {
        state.inBlockComment = false;
      } else {
        stream.next();
      }
      return 'comment';
    }

    // Headings
    if (stream.sol() && stream.match(/^=+\s/)) return 'heading';

    // Functions and commands
    if (stream.match(/#[a-zA-Z_][a-zA-Z0-9_]*/)) return 'keyword';

    // Math mode
    if (stream.match(/\$[^$]+\$/)) return 'string';

    // Bold
    if (stream.match(/\*[^*\n]+\*/)) return 'strong';

    // Italic
    if (stream.match(/_[^_\n]+_/)) return 'emphasis';

    // Inline code
    if (stream.match(/`[^`\n]+`/)) return 'string.special';

    // Strings
    if (stream.match(/"[^"]*"/)) return 'string';

    // Numbers
    if (stream.match(/\d+(\.\d+)?(cm|mm|pt|em|ex|in|pc|%)?/)) return 'number';

    // Labels and references
    if (stream.match(/<[a-zA-Z][a-zA-Z0-9_-]*>/)) return 'labelName';
    if (stream.match(/@[a-zA-Z][a-zA-Z0-9_-]*/)) return 'labelName';

    // Brackets
    if (stream.match(/[\[\](){}]/)) return 'bracket';

    stream.next();
    return null;
  },

  startState() {
    return { inBlockComment: false };
  }
});

export default typstLanguage;
