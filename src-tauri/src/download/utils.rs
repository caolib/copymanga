use std::path::PathBuf;
use tauri::{AppHandle, Manager};

/// 获取下载根目录路径
pub async fn get_downloads_path(app_handle: &AppHandle) -> Result<PathBuf, String> {
    let resource_dir = app_handle
        .path()
        .resource_dir()
        .map_err(|e| format!("获取资源目录失败: {}", e))?;

    Ok(resource_dir.join("downloads"))
}

/// 获取漫画下载目录路径
pub async fn get_manga_downloads_path(app_handle: &AppHandle) -> Result<PathBuf, String> {
    Ok(get_downloads_path(app_handle).await?.join("manga"))
}

/// 获取动画下载目录路径
pub async fn get_cartoon_downloads_path(app_handle: &AppHandle) -> Result<PathBuf, String> {
    Ok(get_downloads_path(app_handle).await?.join("cartoons"))
}
