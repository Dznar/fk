export class DocumentHistory {
  constructor(maxSize = 50) {
    this.maxSize = maxSize;
    this.history = [];
    this.currentIndex = -1;
  }

  push(content) {
    if (this.currentIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.currentIndex + 1);
    }

    this.history.push({
      content,
      timestamp: Date.now(),
    });

    if (this.history.length > this.maxSize) {
      this.history.shift();
    } else {
      this.currentIndex++;
    }
  }

  canUndo() {
    return this.currentIndex > 0;
  }

  canRedo() {
    return this.currentIndex < this.history.length - 1;
  }

  undo() {
    if (this.canUndo()) {
      this.currentIndex--;
      return this.history[this.currentIndex].content;
    }
    return null;
  }

  redo() {
    if (this.canRedo()) {
      this.currentIndex++;
      return this.history[this.currentIndex].content;
    }
    return null;
  }

  clear() {
    this.history = [];
    this.currentIndex = -1;
  }

  getCurrent() {
    return this.currentIndex >= 0 ? this.history[this.currentIndex].content : null;
  }
}
