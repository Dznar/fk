// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::fs;
use std::path::PathBuf;
use std::process::Command;
use tauri::command;

fn detect_nixos() -> bool {
    std::path::Path::new("/etc/NIXOS").exists() ||
    std::path::Path::new("/etc/os-release")
        .and_then(|p| std::fs::read_to_string(p).ok())
        .map(|content| content.contains("nixos"))
        .unwrap_or(false)
}

fn get_typst_binary_path() -> Result<PathBuf, String> {
    if detect_nixos() {
        return Ok(PathBuf::from("typst"));
    }

    if let Ok(output) = Command::new("which").arg("typst").output() {
        if output.status.success() {
            let path_str = String::from_utf8_lossy(&output.stdout).trim().to_string();
            if !path_str.is_empty() {
                return Ok(PathBuf::from(path_str));
            }
        }
    }

    let bin_dir = std::env::current_exe()
        .map_err(|e| e.to_string())?
        .parent()
        .ok_or("Failed to get exe directory")?
        .join("bin");

    if !bin_dir.exists() {
        fs::create_dir_all(&bin_dir).map_err(|e| e.to_string())?;
    }

    #[cfg(target_os = "windows")]
    let binary_name = "typst.exe";
    #[cfg(not(target_os = "windows"))]
    let binary_name = "typst";

    let binary_path = bin_dir.join(binary_name);

    if binary_path.exists() {
        return Ok(binary_path);
    }

    let (url, archive_type) = match (std::env::consts::OS, std::env::consts::ARCH) {
        ("windows", "x86_64") => (
            "https://github.com/typst/typst/releases/latest/download/typst-x86_64-pc-windows-msvc.zip",
            "zip"
        ),
        ("linux", "x86_64") => (
            "https://github.com/typst/typst/releases/latest/download/typst-x86_64-unknown-linux-musl.tar.xz",
            "tar"
        ),
        ("macos", "x86_64") => (
            "https://github.com/typst/typst/releases/latest/download/typst-x86_64-apple-darwin.tar.xz",
            "tar"
        ),
        ("macos", "aarch64") => (
            "https://github.com/typst/typst/releases/latest/download/typst-aarch64-apple-darwin.tar.xz",
            "tar"
        ),
        _ => return Err("Unsupported platform".into()),
    };

    let response = reqwest::blocking::get(url).map_err(|e| e.to_string())?;
    if !response.status().is_success() {
        return Err(format!("Failed to download Typst CLI: HTTP {}", response.status()));
    }
    let bytes = response.bytes().map_err(|e| e.to_string())?;

    if archive_type == "zip" {
        let tmp_zip_path = bin_dir.join("typst.zip");
        fs::write(&tmp_zip_path, &bytes).map_err(|e| e.to_string())?;

        let file = fs::File::open(&tmp_zip_path).map_err(|e| e.to_string())?;
        let mut archive = zip::ZipArchive::new(file).map_err(|e| e.to_string())?;

        for i in 0..archive.len() {
            let mut file = archive.by_index(i).map_err(|e| e.to_string())?;
            if file.name().ends_with(binary_name) || file.name().ends_with("typst.exe") {
                let mut out_file = fs::File::create(&binary_path).map_err(|e| e.to_string())?;
                std::io::copy(&mut file, &mut out_file).map_err(|e| e.to_string())?;
                break;
            }
        }

        fs::remove_file(&tmp_zip_path).ok();
    } else {
        let tmp_tar_path = bin_dir.join("typst.tar.xz");
        fs::write(&tmp_tar_path, &bytes).map_err(|e| e.to_string())?;

        let tar_file = fs::File::open(&tmp_tar_path).map_err(|e| e.to_string())?;
        let decompressor = xz2::read::XzDecoder::new(tar_file);
        let mut archive = tar::Archive::new(decompressor);

        for entry in archive.entries().map_err(|e| e.to_string())? {
            let mut entry = entry.map_err(|e| e.to_string())?;
            let path = entry.path().map_err(|e| e.to_string())?;

            if path.file_name().and_then(|n| n.to_str()) == Some(binary_name) {
                let mut out_file = fs::File::create(&binary_path).map_err(|e| e.to_string())?;
                std::io::copy(&mut entry, &mut out_file).map_err(|e| e.to_string())?;
                break;
            }
        }

        fs::remove_file(&tmp_tar_path).ok();
    }

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

    let output = Command::new(&typst_path)
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

#[command]
fn read_file(path: String) -> Result<String, String> {
    fs::read_to_string(path).map_err(|e| e.to_string())
}

#[command]
fn write_file(path: String, content: String) -> Result<(), String> {
    fs::write(path, content).map_err(|e| e.to_string())
}

#[command]
fn check_typst_installation() -> Result<String, String> {
    match get_typst_binary_path() {
        Ok(path) => Ok(format!("Typst is available at: {:?}", path)),
        Err(e) => Err(format!("Typst installation check failed: {}", e)),
    }
}

#[command]
fn render_typst_preview(content: String) -> Result<Vec<u8>, String> {
    let typst_path = get_typst_binary_path()?;

    let temp_dir = std::env::temp_dir();
    let input_path = temp_dir.join("preview_input.typ");
    let output_path = temp_dir.join("preview_output.svg");

    fs::write(&input_path, content).map_err(|e| e.to_string())?;

    let output = Command::new(&typst_path)
        .arg("compile")
        .arg(&input_path)
        .arg(&output_path)
        .arg("--format")
        .arg("svg")
        .output()
        .map_err(|e| format!("Failed to execute typst command: {}", e))?;

    if output.status.success() {
        let svg_data = fs::read(&output_path).map_err(|e| e.to_string())?;
        fs::remove_file(&output_path).ok();
        fs::remove_file(&input_path).ok();
        Ok(svg_data)
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        Err(format!("Typst rendering failed: {}", stderr))
    }
}

fn main() {
    tauri::Builder::default()
        .setup(|_app| {
            let _ = get_typst_binary_path();
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            compile_typst,
            read_file,
            write_file,
            check_typst_installation,
            render_typst_preview
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
