use std::fs;
use std::io::Read;
use std::path::{Path, PathBuf};
use std::process::Command;
use tauri::{command, AppHandle};

mod utils;

fn get_typst_binary_path(app: &AppHandle) -> Result<PathBuf, String> {
    let bin_name = if cfg!(target_os = "windows") { "typst.exe" } else { "typst" };
    app.path_resolver()
        .resolve_resource(Path::new("bin").join(bin_name))
        .ok_or_else(|| "Failed to resolve typst binary path".to_string())
}

#[command]
fn compile_typst(app: AppHandle, content: String, current_file_path: String, output_path: String) -> Result<String, String> {
    let typst_path = get_typst_binary_path(&app)?;

    let temp_dir = std::env::temp_dir();
    let input_path = temp_dir.join("temp_input.typ");

    let base_dir = Path::new(&current_file_path).parent().unwrap_or_else(|| Path::new(""));
    let processed_content = utils::rewrite_image_paths(&content, base_dir, &app);

    fs::write(&input_path, processed_content).map_err(|e| e.to_string())?;

    let font_paths = app.path_resolver().resolve_resource("fonts").ok_or("Failed to resolve fonts directory")?;
    let project_root = base_dir.parent().unwrap_or(base_dir); // A reasonable guess for project root

    let output = Command::new(&typst_path)
        .env("TYPST_FONT_PATHS", font_paths)
        .arg("compile")
        .arg("--root")
        .arg(project_root)
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
fn check_typst_installation(app: AppHandle) -> Result<String, String> {
    match get_typst_binary_path(&app) {
        Ok(path) => Ok(format!("Typst is available at: {:?}", path)),
        Err(e) => Err(format!("Typst installation check failed: {}", e)),
    }
}

#[command]
fn get_fonts(app: AppHandle) -> Result<String, String> {
    let typst_path = get_typst_binary_path(&app)?;

    let system_fonts_output = Command::new(&typst_path)
        .arg("fonts")
        .output()
        .map_err(|e| format!("Failed to execute typst fonts command: {}", e))?;

    if !system_fonts_output.status.success() {
        let stderr = String::from_utf8_lossy(&system_fonts_output.stderr);
        return Err(format!("Typst fonts command failed: {}", stderr));
    }

    let system_font_list_str = String::from_utf8_lossy(&system_fonts_output.stdout);
    let system_fonts: Vec<&str> = system_font_list_str.lines().collect();

    let mut bundled_fonts = Vec::new();
    if let Some(fonts_dir) = app.path_resolver().resolve_resource("fonts") {
        if fonts_dir.exists() {
            let bundled_fonts_output = Command::new(&typst_path)
                .arg("fonts")
                .arg("--font-path")
                .arg(&fonts_dir)
                .arg("--ignore-system-fonts")
                .output()
                .map_err(|e| format!("Failed to execute typst fonts command: {}", e))?;

            if !bundled_fonts_output.status.success() {
                let stderr = String::from_utf8_lossy(&bundled_fonts_output.stderr);
                return Err(format!("Typst fonts command failed for bundled fonts: {}", stderr));
            }

            let bundled_font_list_str = String::from_utf8_lossy(&bundled_fonts_output.stdout);
            bundled_fonts = bundled_font_list_str.lines().map(|s| s.to_string()).collect();
        }
    }

    let result = serde_json::json!({
        "system_fonts": system_fonts,
        "bundled_fonts": bundled_fonts
    });

    Ok(result.to_string())
}

#[command]
fn render_typst_preview(app: AppHandle, content: String, current_file_path: String) -> Result<Vec<Vec<u8>>, String> {
    let typst_path = get_typst_binary_path(&app)?;

    let temp_dir = std::env::temp_dir();
    let preview_dir = temp_dir.join(format!(
        "preview_{}",
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_millis()
    ));
    fs::create_dir_all(&preview_dir).map_err(|e| e.to_string())?;

    let base_dir = Path::new(&current_file_path).parent().unwrap_or_else(|| Path::new(""));
    let rewritten_content = utils::rewrite_image_paths(&content, base_dir, &app);

    let input_path = preview_dir.join("preview_input.typ");
    let output_path_template = preview_dir.join("preview-{p}.svg");
    fs::write(&input_path, &rewritten_content).map_err(|e| e.to_string())?;

    let font_paths = app.path_resolver().resolve_resource("fonts").ok_or("Failed to resolve fonts directory")?;
    let project_root = base_dir.parent().unwrap_or(base_dir);

    let output = Command::new(&typst_path)
        .env("TYPST_FONT_PATHS", font_paths)
        .arg("compile")
        .arg("--root")
        .arg(project_root)
        .arg(&input_path)
        .arg(&output_path_template)
        .arg("--format")
        .arg("svg")
        .output()
        .map_err(|e| format!("Failed to execute typst command: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        fs::remove_dir_all(&preview_dir).ok();
        return Err(format!("Typst rendering failed: {}", stderr));
    }

    let mut svg_pages = Vec::new();
    for i in 1.. {
        let page_path = preview_dir.join(format!("preview-{}.svg", i));
        if page_path.exists() {
            let mut file = fs::File::open(&page_path).map_err(|e| e.to_string())?;
            let mut buffer = Vec::new();
            file.read_to_end(&mut buffer).map_err(|e| e.to_string())?;
            svg_pages.push(buffer);
        } else {
            break;
        }
    }

    fs::remove_dir_all(&preview_dir).ok();

    Ok(svg_pages)
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            compile_typst,
            read_file,
            write_file,
            check_typst_installation,
            render_typst_preview,
            get_fonts
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
