import { invoke } from '@tauri-apps/api/tauri';

let renderTimeout = null;

export async function renderTypstPreview(content) {
  if (!content.trim()) {
    return '<div style="color: #858585; padding: 24px; text-align: center;">Start typing to see preview...</div>';
  }

  try {
    const svgPagesBytes = await invoke('render_typst_preview', { content });
    const imagesHtml = svgPagesBytes.map(svgBytes => {
        const svgBlob = new Blob([new Uint8Array(svgBytes)], { type: 'image/svg+xml' });
        const svgUrl = URL.createObjectURL(svgBlob);
        return `<img src="${svgUrl}" style="width: 100%; height: auto; background: white; border-radius: 4px; box-shadow: 0 0 10px rgba(0,0,0,0.1);" alt="Typst Preview Page" />`;
    }).join('');

    return `<div style="display: flex; flex-direction: column; gap: 16px;">
      ${imagesHtml}
    </div>`;
  } catch (error) {
    const errorMessage = String(error);

    if (errorMessage.includes('Typst rendering failed:')) {
      const details = errorMessage.replace('Typst rendering failed:', '').trim();
      return `<div style="color: #f48771; padding: 24px; background: #2d2d30; border-radius: 6px; border-left: 3px solid #f48771;">
        <h3 style="margin-top: 0; margin-bottom: 12px; font-size: 18px;">Compilation Error</h3>
        <pre style="margin: 0; white-space: pre-wrap; font-family: monospace; font-size: 13px; line-height: 1.5;">${escapeHtml(details)}</pre>
      </div>`;
    }

    return `<div style="color: #f48771; padding: 24px;">
      <strong>Preview Error:</strong><br>
      ${escapeHtml(errorMessage)}
    </div>`;
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
