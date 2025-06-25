use tauri::{AppHandle, Manager};
use std::fs;
use std::path::Path;

/// 获取 WebView 缓存目录路径
#[tauri::command]
pub fn get_webview_data_dir(app_handle: AppHandle) -> Result<String, String> {
    let app_local_data_dir = app_handle
        .path()
        .app_local_data_dir()
        .map_err(|e| format!("无法获取应用本地数据目录: {}", e))?;

    let webview_dir = app_local_data_dir.join("EBWebView");
    Ok(webview_dir.to_string_lossy().to_string())
}

/// 打开或创建自定义CSS文件
#[tauri::command]
pub fn open_or_create_custom_css(app_handle: AppHandle) -> Result<(), String> {
    let app_data_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("无法获取应用数据目录: {}", e))?;
    
    // 确保config目录存在
    let config_dir = app_data_dir.join("config");
    if !config_dir.exists() {
        fs::create_dir_all(&config_dir)
            .map_err(|e| format!("无法创建配置目录: {}", e))?;
    }
    
    // 创建自定义CSS文件路径
    let css_file_path = config_dir.join("custom.css");
    
    // 如果文件不存在，创建一个空文件
    if !css_file_path.exists() {
        fs::write(&css_file_path, "/* 在此处添加您的自定义CSS样式 */\n/* 样式将全局应用于整个应用 */\n")
            .map_err(|e| format!("无法创建自定义CSS文件: {}", e))?;
    }
    
    // 使用系统默认程序打开文件
    open_file_explorer(css_file_path.to_string_lossy().to_string())
}

/// 获取自定义CSS文件内容
#[tauri::command]
pub fn get_custom_css_content(app_handle: AppHandle) -> Result<String, String> {
    let app_data_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("无法获取应用数据目录: {}", e))?;
    
    let css_file_path = app_data_dir.join("config").join("custom.css");
    
    if !css_file_path.exists() {
        return Ok("".to_string());
    }
    
    fs::read_to_string(&css_file_path)
        .map_err(|e| format!("无法读取自定义CSS文件: {}", e))
}

/// 获取 WebView 缓存大小
#[tauri::command]
pub fn get_cache_size(app_handle: AppHandle) -> Result<u64, String> {
    let app_local_data_dir = app_handle
        .path()
        .app_local_data_dir()
        .map_err(|e| format!("无法获取应用本地数据目录: {}", e))?;

    let webview_dir = app_local_data_dir.join("EBWebView");

    if webview_dir.exists() {
        let size = calculate_dir_size(&webview_dir).unwrap_or(0);
        Ok(size)
    } else {
        Ok(0)
    }
}

/// 打开系统文件资源管理器
#[tauri::command]
pub fn open_file_explorer(path: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .arg(&path)
            .spawn()
            .map_err(|e| format!("无法打开文件资源管理器: {}", e))?;
    }

    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(&path)
            .spawn()
            .map_err(|e| format!("无法打开 Finder: {}", e))?;
    }

    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(&path)
            .spawn()
            .map_err(|e| format!("无法打开文件管理器: {}", e))?;
    }

    Ok(())
}

/// 强制清理 WebView 缓存（更安全的清理方式）
#[tauri::command]
pub async fn force_clear_webview_cache(app_handle: AppHandle) -> Result<String, String> {
    use std::thread;
    use std::time::Duration;

    let app_local_data_dir = app_handle
        .path()
        .app_local_data_dir()
        .map_err(|e| format!("无法获取应用本地数据目录: {}", e))?;

    let webview_dir = app_local_data_dir.join("EBWebView");

    if !webview_dir.exists() {
        return Ok("WebView 缓存目录不存在".to_string());
    }

    let cache_size = calculate_dir_size(&webview_dir).unwrap_or(0);
    let cache_size_mb = cache_size as f64 / 1024.0 / 1024.0;

    // 尝试更激进的清理，但不结束进程
    let max_retries = 5;
    let mut deleted_files = 0;
    let mut total_files = 0;

    for retry in 0..max_retries {
        match force_clear_directory_contents(&webview_dir, &mut deleted_files, &mut total_files) {
            Ok(_) => {
                return Ok(format!(
                    "已强制清除 {:.2} MB 的 WebView 缓存 ({}/{} 个文件)",
                    cache_size_mb, deleted_files, total_files
                ));
            }
            Err(_e) if retry < max_retries - 1 => {
                // 等待更长时间再重试
                thread::sleep(Duration::from_millis(1000));
                continue;
            }
            Err(e) => {
                if deleted_files > 0 {
                    return Ok(format!(
                        "部分强制清除成功：删除了 {}/{} 个文件 ({:.2} MB)。建议重启应用以完全清理剩余文件。",
                        deleted_files, total_files, cache_size_mb
                    ));
                } else {
                    return Err(format!(
                        "强制清除缓存失败: {}。建议关闭应用后手动删除缓存目录，或等待应用完全关闭后重试。",
                        e
                    ));
                }
            }
        }
    }

    Ok("强制缓存清理完成".to_string())
}

/// 递归计算目录大小
fn calculate_dir_size(dir: &std::path::Path) -> std::io::Result<u64> {
    let mut size = 0;
    if dir.is_dir() {
        for entry in std::fs::read_dir(dir)? {
            let entry = entry?;
            let path = entry.path();
            if path.is_dir() {
                size += calculate_dir_size(&path)?;
            } else {
                size += entry.metadata()?.len();
            }
        }
    }
    Ok(size)
}

/// 清除目录内容，处理文件被占用的情况
fn clear_directory_contents(
    dir: &std::path::Path,
    deleted_files: &mut i32,
    total_files: &mut i32,
) -> std::io::Result<()> {
    use std::fs;

    if !dir.is_dir() {
        return Ok(());
    }

    for entry in fs::read_dir(dir)? {
        let entry = entry?;
        let path = entry.path();
        *total_files += 1;

        if path.is_dir() {
            // 递归清理子目录
            match clear_directory_contents(&path, deleted_files, total_files) {
                Ok(_) => {
                    // 尝试删除空目录
                    if let Err(_) = fs::remove_dir(&path) {
                        // 目录可能不为空或被占用，忽略错误
                    } else {
                        *deleted_files += 1;
                    }
                }
                Err(e) => {
                    // 子目录清理失败，继续处理其他文件
                    eprintln!("清理子目录失败: {:?}, 错误: {}", path, e);
                }
            }
        } else {
            // 删除文件
            match fs::remove_file(&path) {
                Ok(_) => {
                    *deleted_files += 1;
                }
                Err(e) => {
                    // 文件被占用，记录但继续处理其他文件
                    eprintln!("删除文件失败: {:?}, 错误: {}", path, e);
                }
            }
        }
    }

    Ok(())
}

/// 强制清除目录内容，更激进的清理方式
fn force_clear_directory_contents(
    dir: &std::path::Path,
    deleted_files: &mut i32,
    total_files: &mut i32,
) -> std::io::Result<()> {
    use std::fs;
    use std::thread;
    use std::time::Duration;

    if !dir.is_dir() {
        return Ok(());
    }

    for entry in fs::read_dir(dir)? {
        let entry = entry?;
        let path = entry.path();
        *total_files += 1;

        if path.is_dir() {
            // 递归清理子目录
            let _ = force_clear_directory_contents(&path, deleted_files, total_files);

            // 多次尝试删除目录
            for _retry in 0..3 {
                match fs::remove_dir_all(&path) {
                    Ok(_) => {
                        *deleted_files += 1;
                        break;
                    }
                    Err(_) => {
                        thread::sleep(Duration::from_millis(200));
                        continue;
                    }
                }
            }
        } else {
            // 多次尝试删除文件
            for _retry in 0..5 {
                match fs::remove_file(&path) {
                    Ok(_) => {
                        *deleted_files += 1;
                        break;
                    }
                    Err(_) => {
                        thread::sleep(Duration::from_millis(100)); // 尝试修改文件属性（Windows）
                        #[cfg(target_os = "windows")]
                        {
                            if let Ok(metadata) = path.metadata() {
                                let mut perms = metadata.permissions();
                                perms.set_readonly(false);
                                let _ = fs::set_permissions(&path, perms);
                            }
                        }

                        continue;
                    }
                }
            }
        }
    }

    Ok(())
}
