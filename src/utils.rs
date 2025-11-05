use regex::Regex;
use std::borrow::Cow;
use std::path::{Path, PathBuf};

/// Sanitize filename to be safe for file systems
pub fn sanitize_filename(filename: &str) -> String {
    // Remove any potentially dangerous characters
    let re = Regex::new(r"[^a-zA-Z0-9\-_.]+").expect("BUG: Invalid regex for sanitization");
    let sanitized = re.replace_all(filename, "-").to_string();
    if sanitized.is_empty() {
        return "file.txt".to_string();
    }
    sanitized
}

pub fn rewrite_image_paths(
    input: &str, 
    base_dir: &Path,
    app_handle: &tauri::AppHandle,
) -> String {
    
    let assets_root = app_handle.path_resolver().resolve_resource("assets");

    fn is_external(p: &str) -> bool {
        let lower = p.to_ascii_lowercase();
        lower.starts_with("http://") 
            || lower.starts_with("https://") 
            || lower.starts_with("data:") 
            || lower.starts_with("file:")
    }

    fn absolute_norm<'a>( 
        base: &'a Path, 
        raw: &'a str, 
        assets_root: Option<&'a PathBuf>, 
        wrap_for_markdown: bool
    ) -> Cow<'a, str> {
        if is_external(raw) {
            return Cow::Borrowed(raw);
        }

        let trimmed = raw.trim();
        let (unwrapped, had_angle) = if trimmed.starts_with('<') && trimmed.ends_with('>') {
            (&trimmed[1..trimmed.len() - 1], true)
        } else { 
            (trimmed, false) 
        };

        let normalized_unwrapped = unwrapped.replace('\\', "/");

        if normalized_unwrapped.starts_with("assets/") || normalized_unwrapped == "assets" {
            let mut root_rel = format!("/{}", normalized_unwrapped.trim_start_matches('/'));
            if wrap_for_markdown && (had_angle || root_rel.contains(' ') || root_rel.contains('(') || root_rel.contains(')')) {
                root_rel = format!("<{}>", root_rel);
            }
            return Cow::Owned(root_rel);
        }

        let content_root_opt: Option<PathBuf> = assets_root.and_then(|p| p.parent().map(|p| p.to_path_buf()));

        let is_abs = Path::new(unwrapped).is_absolute() || unwrapped.chars().nth(1) == Some(':');

        let joined = if is_abs { 
            PathBuf::from(&normalized_unwrapped) 
        } else { 
            base.join(&normalized_unwrapped) 
        };

        let abs = joined.canonicalize().unwrap_or(joined);

        let mut path_str = abs.to_string_lossy().replace('\\', "/");
        if path_str.starts_with("//?/") { 
            path_str = path_str.trim_start_matches("//?/").to_string(); 
        }

        if let Some(content_root) = content_root_opt {
            let mut content_root_str = content_root.to_string_lossy().replace('\\', "/");
            if content_root_str.ends_with('/') { 
                content_root_str.pop(); 
            }
            
            if path_str.starts_with(&content_root_str) {
                let mut rel = path_str[content_root_str.len()..].to_string();
                if !rel.starts_with('/') { 
                    rel = format!("/{}", rel);
                }
                if wrap_for_markdown && (had_angle || rel.contains(' ') || rel.contains('(') || rel.contains(')')) {
                    rel = format!("<{}>", rel);
                }
                return Cow::Owned(rel);
            }
        }

        if let Some(assets_dir) = assets_root {
            if let Some(fname_os) = abs.file_name() {
                let sanitized = sanitize_filename(&fname_os.to_string_lossy());
                
                let path_obj = std::path::Path::new(&sanitized);
                let stem = path_obj.file_stem().and_then(|s| s.to_str()).unwrap_or("file");
                let ext = path_obj.extension().and_then(|e| e.to_str()).unwrap_or("");
                
                let truncated_stem = if stem.len() > 100 { &stem[0..100] } else { stem };
                
                let mut fname = if ext.is_empty() {
                    truncated_stem.to_string()
                } else {
                    format!("{}.{}", truncated_stem, ext)
                };
                
                let mut dest = assets_dir.join(&fname);
                
                if dest.exists() {
                    use std::collections::hash_map::DefaultHasher;
                    use std::hash::{Hash, Hasher};
                    
                    let mut hasher = DefaultHasher::new();
                    abs.hash(&mut hasher);
                    let hash = hasher.finish();
                    let hash_str = format!("{:x}", hash);
                    let hash_short = &hash_str[0..8.min(hash_str.len())];
                    
                    fname = if ext.is_empty() {
                        format!("{}-{}", truncated_stem, hash_short)
                    } else {
                        format!("{}-{}.{}", truncated_stem, hash_short, ext)
                    };
                    
                    dest = assets_dir.join(&fname);
                }
                
                if std::fs::copy(&abs, &dest).is_ok() {
                    let mut rel = format!("/assets/{}", fname);
                    if wrap_for_markdown && (had_angle || rel.contains(' ') || rel.contains('(') || rel.contains(')')) {
                        rel = format!("<{}>", rel);
                    }
                    return Cow::Owned(rel);
                }
            }
        }

        if wrap_for_markdown {
            if had_angle || path_str.contains(' ') || path_str.contains('(') || path_str.contains(')') {
                path_str = format!("<{}>", path_str);
            }
        }
        
        Cow::Owned(path_str)
    }

    let re_md_img = Regex::new(r"!\[([^\]]*)\]\(([^)]+)\)").expect("BUG: Invalid regex for markdown images");
    let result = re_md_img.replace_all(input, |caps: &regex::Captures| {
        let alt_text = caps.get(1).map(|m| m.as_str()).unwrap_or("");
        let inside = caps.get(2).map(|m| m.as_str()).unwrap_or("").trim();
        
        let mut path_part = inside;
        let mut title_part: Option<&str> = None;
        let mut in_quotes = false;
        let mut split_idx: Option<usize> = None;
        
        for (i, ch) in inside.char_indices() {
            match ch {
                '"' => in_quotes = !in_quotes,
                ' ' | '\t' if !in_quotes => { 
                    split_idx = Some(i); 
                    break; 
                }
                _ => {}
            }
        }
        
        if let Some(idx) = split_idx {
            path_part = inside[..idx].trim();
            title_part = Some(inside[idx..].trim());
        }

        let assets_root_ref = assets_root.as_ref();
        let abs = absolute_norm(base_dir, path_part, assets_root_ref, true);

        if let Some(title) = title_part {
            format!("![{}]({} {})", alt_text, abs, title)
        } else {
            format!("![{}]({})", alt_text, abs)
        }
    });

    let re_html_img = Regex::new(r"<img([^>]*?)\s+src=([\"'])([^\"']+)([\"'])([^>]*)>").expect("BUG: Invalid regex for HTML images");
    let result = re_html_img.replace_all(&result, |caps: &regex::Captures| {
        let before = caps.get(1).map(|m| m.as_str()).unwrap_or("");
        let quote = caps.get(2).map(|m| m.as_str()).unwrap_or("\"");
        let src = caps.get(3).map(|m| m.as_str()).unwrap_or("");
        let after_quote = caps.get(4).map(|m| m.as_str()).unwrap_or("\"");
        let after = caps.get(5).map(|m| m.as_str()).unwrap_or("");
        
        let assets_root_ref = assets_root.as_ref();
        let abs = absolute_norm(base_dir, src, assets_root_ref, false);
        
        format!("<img{} src={}{}{}{}>", before, quote, abs, after_quote, after)
    });

    let re_raw_typst = Regex::new(r"#(fig|image)\(\s*([\"'])([^\"']+)([\"'])").expect("BUG: Invalid regex for raw Typst calls");
    let result = re_raw_typst.replace_all(&result, |caps: &regex::Captures| {
        let func = caps.get(1).map(|m| m.as_str()).unwrap_or("fig");
        let quote = caps.get(2).map(|m| m.as_str()).unwrap_or("\"");
        let path = caps.get(3).map(|m| m.as_str()).unwrap_or("");
        let assets_root_ref = assets_root.as_ref();
        let abs = absolute_norm(base_dir, path, assets_root_ref, false);
        format!("#{}({}{}{}", func, quote, abs, quote)
    });

    result.into_owned()
}
