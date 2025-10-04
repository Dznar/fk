import { open, save } from '@tauri-apps/api/dialog';
import { invoke } from '@tauri-apps/api/tauri';

export async function openFile() {
  try {
    const selected = await open({
      filters: [
        {
          name: 'Typst',
          extensions: ['typ'],
        },
        {
          name: 'All Files',
          extensions: ['*'],
        },
      ],
    });

    if (selected && typeof selected === 'string') {
      const content = await invoke('read_file', { path: selected });
      return { content, path: selected };
    }
  } catch (error) {
    console.error('Error opening file:', error);
    throw error;
  }
  return null;
}

export async function saveFile(content, currentPath = null) {
  try {
    let filePath = currentPath;

    if (!filePath) {
      filePath = await save({
        filters: [
          {
            name: 'Typst',
            extensions: ['typ'],
          },
        ],
        defaultPath: 'untitled.typ',
      });
    }

    if (filePath) {
      await invoke('write_file', { path: filePath, content });
      return filePath;
    }
  } catch (error) {
    console.error('Error saving file:', error);
    throw error;
  }
  return null;
}

export async function exportToPdf(content) {
  try {
    const filePath = await save({
      filters: [
        {
          name: 'PDF',
          extensions: ['pdf'],
        },
      ],
      defaultPath: 'output.pdf',
    });

    if (filePath) {
      const result = await invoke('compile_typst', {
        content,
        outputPath: filePath,
      });
      return { success: true, message: result, path: filePath };
    }
  } catch (error) {
    return { success: false, message: error.toString() };
  }
  return null;
}
