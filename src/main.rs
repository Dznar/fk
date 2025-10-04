// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::fs;
//use std::path::PathBuf;
use tauri::command;

#[command]
fn compile_typst(content: String, output_path: String) -> Result<String, String> {
    // Create temporary input file
    let temp_dir = std::env::temp_dir();
    let input_path = temp_dir.join("temp_typst_input.typ");

    // Write content to temp file
    fs::write(&input_path, content).map_err(|e| e.to_string())?;

    // Execute typst compiler
    let output = std::process::Command::new("typst")
        .arg("compile")
        .arg(&input_path)
        .arg(&output_path)
        .output();

    match output {
        Ok(result) => {
            if result.status.success() {
                Ok(format!("PDF exported successfully to: {}", output_path))
            } else {
                let stderr = String::from_utf8_lossy(&result.stderr);
                Err(format!("Typst compilation failed: {}", stderr))
            }
        }
        Err(e) => {
            Err(format!("Failed to execute typst command. Make sure Typst is installed: {}", e))
        }
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

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            compile_typst,
            read_file,
            write_file
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
