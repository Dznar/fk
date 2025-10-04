// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::fs;
use std::io::Write;
use std::path::PathBuf;
use std::process::Command;

fn get_typst_binary_path() -> Result<PathBuf, String> {
    let bin_dir = std::env::current_exe()
        .map_err(|e| e.to_string())?
        .parent()
        .ok_or("Failed to get exe directory")?
        .join("bin");

    if !bin_dir.exists() {
        fs::create_dir_all(&bin_dir).map_err(|e| e.to_string())?;
    }

    // Determine platform-specific binary name
    #[cfg(target_os = "windows")]
    let binary_name = "typst.exe";
    #[cfg(not(target_os = "windows"))]
    let binary_name = "typst";

    let binary_path = bin_dir.join(binary_name);

    // If binary already exists, return path
    if binary_path.exists() {
        return Ok(binary_path);
    }

    // Otherwise, download the binary
    let url = match (std::env::consts::OS, std::env::consts::ARCH) {
        ("windows", "x86_64") => "https://github.com/typst/typst/releases/latest/download/typst-x86_64-pc-windows-msvc.zip",
        ("linux", "x86_64") => "https://github.com/typst/typst/releases/latest/download/typst-x86_64-unknown-linux-gnu.zip",
        ("macos", "x86_64") => "https://github.com/typst/typst/releases/latest/download/typst-x86_64-apple-darwin.zip",
        ("macos", "aarch64") => "https://github.com/typst/typst/releases/latest/download/typst-aarch64-apple-darwin.zip",
        _ => return Err("Unsupported platform".into()),
    };

    // Download the zip archive
    let response = reqwest::blocking::get(url).map_err(|e| e.to_string())?;
    if !response.status().is_success() {
        return Err(format!("Failed to download Typst CLI: HTTP {}", response.status()));
    }
    let bytes = response.bytes().map_err(|e| e.to_string())?;

    // Save zip to temp file
    let tmp_zip_path = bin_dir.join("typst.zip");
    fs::write(&tmp_zip_path, &bytes).map_err(|e| e.to_string())?;

    // Extract the binary from zip
    let file = fs::File::open(&tmp_zip_path).map_err(|e| e.to_string())?;
    let mut archive = zip::ZipArchive::new(file).map_err(|e| e.to_string())?;

    for i in 0..archive.len() {
        let mut file = archive.by_index(i).map_err(|e| e.to_string())?;
        if file.name().ends_with(binary_name) {
            let mut out_file = fs::File::create(&binary_path).map_err(|e| e.to_string())?;
            std::io::copy(&mut file, &mut out_file).map_err(|e| e.to_string())?;
            break;
        }
    }

    // Remove the zip file
    fs::remove_file(&tmp_zip_path).ok();

    // Set executable permissions on Unix
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let perms = fs::Permissions::from_mode(0o755);
        fs::set_permissions(&binary_path, perms).map_err(|e| e.to_string())?;
    }

    Ok(binary_path)
}
#[command]
fn compile_typst(content: String, output_path: String) -> Result<String, String> {
    let typst_path = get_typst_binary_path()?;

    let temp_dir = std::env::temp_dir();
    let input_path = temp_dir.join("temp_input.typ");

    fs::write(&input_path, content).map_err(|e| e.to_string())?;

    let output = Command::new(typst_path)
        .arg("compile")
        .arg(&input_path)
        .arg(&output_path)
        .output()
        .map_err(|e| format!("Failed to execute typst command: {}", e))?;

    if output.status.success() {
        Ok(format!("PDF exported successfully to: {}", output_path))
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        Err(format!("Typst compilation failed: {}", stderr))
    }
}
