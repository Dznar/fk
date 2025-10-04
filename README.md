# Feather-ink

A modern Typst IDE built with Tauri, featuring real-time preview and automatic Typst compiler installation.

## Features

- **Automatic Typst Installation**: The app automatically downloads and installs the Typst compiler on first run
- **Multi-Platform Support**: Works on Windows, macOS, Linux, and NixOS
- **Real-time Preview**: See your Typst markup rendered as you type
- **Modern UI**: Clean, dark-themed interface with syntax highlighting
- **File Operations**: Create, open, save, and export Typst documents
- **Undo/Redo**: Full history support for your edits

## Platform-Specific Installation

### Windows, macOS, and Linux
The app will automatically download and install the Typst compiler when you first run it. No manual installation required.

### NixOS
Feather-ink supports development on NixOS and Nix-enabled systems.
The app detects NixOS and uses the system's Typst installation. Ensure you have Typst installed via nix-shell:

- If you use **Nix flakes** (nixpkgs unstable), run:
  ```sh
  nix develop
  ```
- If you use **stable Nix** or prefer classic workflows, run:
  ```sh
  nix-shell
  ```
Both commands will provide all the dependencies needed for building and running Feather-ink.

_Note: On NixOS, Typst and other dependencies are provided by Nix; the app will not attempt to download or install Typst automatically._
```bash
nix-shell
```

The `shell.nix` file includes all required dependencies:
- rustc
- cargo
- pkg-config
- glib
- gtk3
- libsoup_2_4
- webkitgtk
- typst

## Development

### Prerequisites
- Node.js
- npm
- Rust (for Tauri)

### Install Dependencies
```bash
npm install
```

### Run Development Server
```bash
npm run tauri:dev
```

### Build for Production
```bash
npm run tauri:build
```

## Customization

### Fonts
Place custom font files (.ttf or .otf) in the `fonts/` directory. The app is configured to load fonts named `custom-font.ttf` or `custom-font.otf`.

### Icons
Custom SVG icons are located in the `icons/` directory and are used throughout the UI for toolbar buttons.

## Binary Installation Details

The app implements a smart installation strategy:

1. **NixOS Detection**: Checks for NixOS and uses system Typst
2. **Existing Installation**: Checks if Typst is already installed in PATH
3. **Automatic Download**: Downloads the appropriate Typst binary for your platform from GitHub releases
4. **Local Installation**: Installs Typst in a `bin/` directory next to the app executable

Supported platforms:
- Windows x86_64
- macOS x86_64 (Intel)
- macOS aarch64 (Apple Silicon)
- Linux x86_64

## License

See the `fonts/SIL Open Font License.txt` for font licensing information.
