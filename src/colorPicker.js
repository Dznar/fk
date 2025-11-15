export function createColorPicker(onColorSelect) {
  const container = document.createElement('div');
  container.className = 'color-picker-container';
  container.style.display = 'none';

  const input = document.createElement('input');
  input.type = 'color';
  input.className = 'color-picker-input';

  const hexInput = document.createElement('input');
  hexInput.type = 'text';
  hexInput.className = 'color-picker-hex';
  hexInput.placeholder = '#000000';
  hexInput.maxLength = 7;

  const spectrumContainer = document.createElement('div');
  spectrumContainer.className = 'color-spectrum-container';

  const hueCanvas = document.createElement('canvas');
  hueCanvas.className = 'color-spectrum-hue';
  hueCanvas.width = 280;
  hueCanvas.height = 20;

  const satLightCanvas = document.createElement('canvas');
  satLightCanvas.className = 'color-spectrum-satlight';
  satLightCanvas.width = 280;
  satLightCanvas.height = 140;

  let currentHue = 0;

  function drawHueBar() {
    const ctx = hueCanvas.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, hueCanvas.width, 0);
    for (let i = 0; i <= 360; i += 30) {
      gradient.addColorStop(i / 360, `hsl(${i}, 100%, 50%)`);
    }
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, hueCanvas.width, hueCanvas.height);
  }

  function drawSatLightBox(hue) {
    const ctx = satLightCanvas.getContext('2d');

    for (let y = 0; y < satLightCanvas.height; y++) {
      const lightness = 100 - (y / satLightCanvas.height) * 100;
      const gradient = ctx.createLinearGradient(0, y, satLightCanvas.width, y);
      gradient.addColorStop(0, `hsl(${hue}, 0%, ${lightness}%)`);
      gradient.addColorStop(1, `hsl(${hue}, 100%, ${lightness}%)`);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, y, satLightCanvas.width, 1);
    }
  }

  function hslToHex(h, s, l) {
    s /= 100;
    l /= 100;
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs((h / 60) % 2 - 1));
    const m = l - c / 2;
    let r = 0, g = 0, b = 0;
    if (h >= 0 && h < 60) { r = c; g = x; b = 0; }
    else if (h >= 60 && h < 120) { r = x; g = c; b = 0; }
    else if (h >= 120 && h < 180) { r = 0; g = c; b = x; }
    else if (h >= 180 && h < 240) { r = 0; g = x; b = c; }
    else if (h >= 240 && h < 300) { r = x; g = 0; b = c; }
    else if (h >= 300 && h < 360) { r = c; g = 0; b = x; }
    const toHex = (n) => {
      const hex = Math.round((n + m) * 255).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }

  hueCanvas.addEventListener('click', (e) => {
    const rect = hueCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    currentHue = Math.round((x / hueCanvas.width) * 360);
    drawSatLightBox(currentHue);
  });

  satLightCanvas.addEventListener('click', (e) => {
    const rect = satLightCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const saturation = (x / satLightCanvas.width) * 100;
    const lightness = 100 - (y / satLightCanvas.height) * 100;
    const hex = hslToHex(currentHue, saturation, lightness);
    input.value = hex;
    hexInput.value = hex;
  });

  drawHueBar();
  drawSatLightBox(currentHue);

  spectrumContainer.appendChild(satLightCanvas);
  spectrumContainer.appendChild(hueCanvas);

  input.addEventListener('input', (e) => {
    hexInput.value = e.target.value;
  });

  hexInput.addEventListener('input', (e) => {
    const value = e.target.value;
    if (/^#[0-9A-Fa-f]{6}$/.test(value)) {
      input.value = value;
    }
  });

  hexInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const value = hexInput.value;
      if (/^#[0-9A-Fa-f]{6}$/.test(value)) {
        if (onColorSelect) {
          onColorSelect(value);
        }
      }
    }
  });

  const applyBtn = document.createElement('button');
  applyBtn.textContent = 'Insert';
  applyBtn.className = 'color-picker-apply';
  applyBtn.addEventListener('click', () => {
    if (onColorSelect) {
      onColorSelect(input.value);
    }
  });

  const header = document.createElement('div');
  header.className = 'color-picker-header';
  header.innerHTML = '<span>Color Picker</span>';

  const closeBtn = document.createElement('button');
  closeBtn.className = 'color-picker-close';
  closeBtn.innerHTML = '×';
  closeBtn.addEventListener('click', () => {
    container.style.display = 'none';
  });
  header.appendChild(closeBtn);

  const inputGroup = document.createElement('div');
  inputGroup.className = 'color-picker-inputs';
  inputGroup.appendChild(input);
  inputGroup.appendChild(hexInput);

  container.appendChild(header);
  container.appendChild(spectrumContainer);
  container.appendChild(inputGroup);
  container.appendChild(applyBtn);

  return {
    element: container,
    show: (initialColor = '#000000') => {
      input.value = initialColor;
      hexInput.value = initialColor;
      container.style.display = 'block';
    },
    hide: () => {
      container.style.display = 'none';
    }
  };
}

export function detectColorAtCursor(text, pos) {
  // Look for color patterns around cursor: rgb("..."), #...
  const before = text.slice(Math.max(0, pos - 50), pos);
  const after = text.slice(pos, Math.min(text.length, pos + 50));
  const context = before + after;

  // Check for rgb("XXXXXX")
  const rgbMatch = context.match(/rgb\s*\(\s*"([#0-9A-Fa-f]{6})"\s*\)/);
  if (rgbMatch) {
    return rgbMatch[1];
  }

  // Check for standalone hex color
  const hexMatch = context.match(/#([0-9A-Fa-f]{6})\b/);
  if (hexMatch) {
    return '#' + hexMatch[1];
  }

  return null;
}
