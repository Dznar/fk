import './style.css';
import { createEditor } from './src/editor.js';
import { renderTypstPreview } from './src/typstPreview.js';
import { DocumentHistory } from './src/history.js';
import { open } from '@tauri-apps/api/dialog';
import { invoke } from '@tauri-apps/api';
import { openFile, saveFile, exportToPdf } from './src/fileOperations.js';

let editor;
let currentFilePath = null;
let documentHistory = new DocumentHistory();
let autoSaveTimer = null;
let selectedFont = '';

async function updatePreview(content) {
  const previewElement = document.getElementById('preview');
  previewElement.innerHTML = '<div style="color: #858585; padding: 24px; text-align: center;">Rendering preview...</div>';

  const html = await renderTypstPreview(content);
  previewElement.innerHTML = html;
}

function updateCharCount(content) {
  const charCount = document.getElementById('char-count');
  charCount.textContent = `${content.length} characters`;
}

function updateStatus(message, duration = 3000) {
  const statusText = document.getElementById('status-text');
  statusText.textContent = message;

  if (duration > 0) {
    setTimeout(() => {
      statusText.textContent = 'Ready';
    }, duration);
  }
}

function updateFileInfo(filename = 'Untitled') {
  const fileInfo = document.getElementById('file-info');
  fileInfo.textContent = filename;
}

function handleEditorChange(content) {
  updateCharCount(content);

  if (autoSaveTimer) {
    clearTimeout(autoSaveTimer);
  }

  autoSaveTimer = setTimeout(async () => {
    await updatePreview(content);
    documentHistory.push(content);
    updateUndoRedoButtons();
  }, 800);
}

function updateUndoRedoButtons() {
  const undoBtn = document.getElementById('btn-undo');
  const redoBtn = document.getElementById('btn-redo');

  undoBtn.disabled = !documentHistory.canUndo();
  redoBtn.disabled = !documentHistory.canRedo();
}

function setEditorContent(content) {
  const transaction = editor.state.update({
    changes: {
      from: 0,
      to: editor.state.doc.length,
      insert: content,
    },
  });
  editor.dispatch(transaction);
}

async function handleNew() {
  if (confirm('Create a new document? Unsaved changes will be lost.')) {
    currentFilePath = null;
    documentHistory.clear();
    setEditorContent('');
    updateFileInfo('Untitled');
    updateStatus('New document created');
    updateUndoRedoButtons();
  }
}

async function handleOpen() {
  try {
    const result = await openFile();
    if (result) {
      currentFilePath = result.path;
      setEditorContent(result.content);
      documentHistory.clear();
      documentHistory.push(result.content);
      updateFileInfo(result.path.split('/').pop());
      updateStatus(`Opened: ${result.path}`);
      updateUndoRedoButtons();
    }
  } catch (error) {
    updateStatus(`Error opening file: ${error}`, 5000);
  }
}

async function handleSave() {
  try {
    const content = editor.state.doc.toString();
    const path = await saveFile(content, currentFilePath);

    if (path) {
      currentFilePath = path;
      updateFileInfo(path.split('/').pop());
      updateStatus(`Saved: ${path}`);
    }
  } catch (error) {
    updateStatus(`Error saving file: ${error}`, 5000);
  }
}

async function handleExport() {
  try {
    const content = editor.state.doc.toString();
    updateStatus('Exporting to PDF...', 0);

    const result = await exportToPdf(content);

    if (result) {
      if (result.success) {
        updateStatus(`PDF exported: ${result.path}`, 5000);
      } else {
        updateStatus(`Export failed: ${result.message}`, 5000);
      }
    } else {
      updateStatus('Export cancelled');
    }
  } catch (error) {
    updateStatus(`Export error: ${error}`, 5000);
  }
}

function handleFontChange(event) {
  selectedFont = event.target.value;
  let content = editor.state.doc.toString();
  const fontConfig = `#set text(font: "${selectedFont}")\n\n`;

  // Remove existing font setting
  let newContent = content.replace(/^#set text\(font:.*?\)\n\n/, '');

  if (selectedFont) {
    newContent = fontConfig + newContent;
  }
  
  if (content !== newContent) {
    setEditorContent(newContent);
  }
  updateStatus(selectedFont ? `Font changed to: ${selectedFont}` : 'Using default font');
}

async function handleUndo() {
  const content = documentHistory.undo();
  if (content !== null) {
    setEditorContent(content);
    await updatePreview(content);
    updateStatus('Undo');
    updateUndoRedoButtons();
  }
}

async function handleRedo() {
  const content = documentHistory.redo();
  if (content !== null) {
    setEditorContent(content);
    await updatePreview(content);
    updateStatus('Redo');
    updateUndoRedoButtons();
  }
}

async function handleRefresh() {
  const content = editor.state.doc.toString();
  await updatePreview(content);
  updateStatus('Preview refreshed');
}

async function handleInsertImage() {
  try {
    const selected = await open({
      filters: [{
        name: 'Image',
        extensions: ['png', 'jpg', 'jpeg', 'gif', 'svg']
      }]
    });
    if (selected && typeof selected === 'string') {
      const imagePath = selected.replace(/\\/g, '/'); // Normalize path for typst
      const textToInsert = `#image("${imagePath}")`;
      
      const currentPos = editor.state.selection.main.head;
      const transaction = editor.state.update({
        changes: { from: currentPos, insert: textToInsert }
      });
      editor.dispatch(transaction);
    }
  } catch (error) {
    updateStatus(`Error selecting image: ${error}`, 5000);
  }
}

function initializeResizer() {
  const resizer = document.querySelector('.resizer');
  const editorPanel = document.querySelector('.editor-panel');
  const previewPanel = document.querySelector('.preview-panel');
  const container = document.querySelector('.container');

  let isResizing = false;

  resizer.addEventListener('mousedown', (e) => {
    isResizing = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  });

  document.addEventListener('mousemove', (e) => {
    if (!isResizing) return;

    const containerRect = container.getBoundingClientRect();
    const offsetX = e.clientX - containerRect.left;
    const percentage = (offsetX / containerRect.width) * 100;

    if (percentage > 20 && percentage < 80) {
      editorPanel.style.width = `${percentage}%`;
      previewPanel.style.width = `${100 - percentage}%`;
    }
  });

  document.addEventListener('mouseup', () => {
    if (isResizing) {
      isResizing = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }
  });
}

async function initializeApp() {
  const editorContainer = document.getElementById('editor');
  editor = createEditor(editorContainer, handleEditorChange);

  document.getElementById('btn-new').addEventListener('click', handleNew);
  document.getElementById('btn-open').addEventListener('click', handleOpen);
  document.getElementById('btn-save').addEventListener('click', handleSave);
  document.getElementById('btn-export').addEventListener('click', handleExport);
  document.getElementById('btn-undo').addEventListener('click', handleUndo);
  document.getElementById('btn-redo').addEventListener('click', handleRedo);
  document.getElementById('btn-refresh').addEventListener('click', handleRefresh);
  document.getElementById('btn-insert-image').addEventListener('click', handleInsertImage);
  document.getElementById('font-select').addEventListener('change', handleFontChange);

  initializeResizer();

  const initialContent = editor.state.doc.toString();
  documentHistory.push(initialContent);
  await updatePreview(initialContent);
  updateCharCount(initialContent);
  updateUndoRedoButtons();
  updateStatus('Ready');

  // Populate fonts
  try {
    const fontsJson = await invoke('get_fonts');
    const fonts = JSON.parse(fontsJson);
    const fontSelect = document.getElementById('font-select');

    // Clear existing options
    fontSelect.innerHTML = '<option value="">Default Font</option>';

    if (fonts.system_fonts && fonts.system_fonts.length > 0) {
      const systemGroup = document.createElement('optgroup');
      systemGroup.label = 'System Fonts';
      fonts.system_fonts.forEach(font => {
        const option = document.createElement('option');
        option.value = font;
        option.textContent = font;
        systemGroup.appendChild(option);
      });
      fontSelect.appendChild(systemGroup);
    }

    if (fonts.bundled_fonts && fonts.bundled_fonts.length > 0) {
      const bundledGroup = document.createElement('optgroup');
      bundledGroup.label = 'Bundled Fonts';
      fonts.bundled_fonts.forEach(font => {
        const option = document.createElement('option');
        option.value = font;
        option.textContent = font;
        bundledGroup.appendChild(option);
      });
      fontSelect.appendChild(bundledGroup);
    }

  } catch (error) {
    console.error('Error getting fonts:', error);
    updateStatus('Error loading fonts', 5000);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}
