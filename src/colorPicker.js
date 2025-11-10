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

  const presetColors = [
    '#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff',
    '#ffff00', '#ff00ff', '#00ffff', '#808080', '#800000',
    '#808000', '#008000', '#800080', '#008080', '#000080',
    '#ffa500', '#a52a2a', '#deb887', '#5f9ea0', '#7fff00'
  ];

  const presetsContainer = document.createElement('div');
  presetsContainer.className = 'color-picker-presets';

  presetColors.forEach(color => {
    const preset = document.createElement('div');
    preset.className = 'color-preset';
    preset.style.backgroundColor = color;
    preset.title = color;
    preset.addEventListener('click', () => {
      input.value = color;
      hexInput.value = color;
      if (onColorSelect) {
        onColorSelect(color);
      }
    });
    presetsContainer.appendChild(preset);
  });

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
  container.appendChild(inputGroup);
  container.appendChild(presetsContainer);
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
