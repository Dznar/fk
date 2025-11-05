
use std::env;
use std::fs::{self, File};
use std::io::{self, Cursor};
use std::path::{Path, PathBuf};

fn main() {
    println!("cargo:rerun-if-changed=build.rs");

    let target_os = env::var("CARGO_CFG_TARGET_OS").unwrap();
    let target_arch = env::var("CARGO_CFG_TARGET_ARCH").unwrap();
    let out_dir = PathBuf::from(env::var("OUT_DIR").unwrap());
    let bin_name = if target_os == "windows" { "typst.exe" } else { "typst" };
    let bin_path = out_dir.join(bin_name);

    if !bin_path.exists() {
        let url = match (target_os.as_str(), target_arch.as_str()) {
            ("windows", "x86_64") => "https://github.com/typst/typst/releases/latest/download/typst-x86_64-pc-windows-msvc.zip",
            ("linux", "x86_64") => "https://github.com/typst/typst/releases/latest/download/typst-x86_64-unknown-linux-musl.tar.xz",
            ("macos", "x86_64") => "https://github.com/typst/typst/releases/latest/download/typst-x86_64-apple-darwin.tar.xz",
            ("macos", "aarch64") => "https://github.com/typst/typst/releases/latest/download/typst-aarch64-apple-darwin.tar.xz",
            _ => panic!("Unsupported platform: {}-{}", target_os, target_arch),
        };

        download_and_extract(url, &bin_path, bin_name).expect("Failed to download and extract typst binary");
    }

    let dest_dir = PathBuf::from(env::var("CARGO_MANIFEST_DIR").unwrap()).join("bin");
    fs::create_dir_all(&dest_dir).unwrap();
    let final_bin_path = dest_dir.join(bin_name);
    fs::copy(&bin_path, &final_bin_path).unwrap();

    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        fs::set_permissions(&final_bin_path, fs::Permissions::from_mode(0o755)).unwrap();
    }

    tauri_build::build().expect("Tauri build failed");
}

fn download_and_extract(url: &str, bin_path: &Path, bin_name: &str) -> Result<(), Box<dyn std::error::Error>> {
    let response = reqwest::blocking::get(url)?.bytes()?;
    let cursor = Cursor::new(response);

    if url.ends_with(".zip") {
        let mut archive = zip::ZipArchive::new(cursor)?;
        for i in 0..archive.len() {
            let mut file = archive.by_index(i)?;
            if file.name().ends_with(bin_name) {
                let mut outfile = File::create(bin_path)?;
                io::copy(&mut file, &mut outfile)?;
                break;
            }
        }
    } else if url.ends_with(".tar.xz") {
        let tar = xz2::read::XzDecoder::new(cursor);
        let mut archive = tar::Archive::new(tar);
        for entry in archive.entries()? {
            let mut entry = entry?;
            if entry.path()?.file_name().unwrap_or_default() == bin_name {
                entry.unpack(bin_path)?;
                break;
            }
        }
    } else {
        return Err("Unsupported archive format".into());
    }

    Ok(())
}
