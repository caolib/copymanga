use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};
use tokio::fs;

/// 下载任务信息
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DownloadTask {
    pub cartoon_uuid: String,
    pub cartoon_name: String,
    pub chapter_uuid: String,
    pub chapter_name: String,
    pub video_url: String,
    pub cover: String,
    pub cartoon_detail: Option<Value>,
    pub status: String, // "downloading", "paused", "completed", "error"
    pub progress: f64,
    pub start_time: String,
    pub updated_at: String,
}

/// 获取任务存储路径
async fn get_tasks_storage_path(app_handle: &AppHandle) -> Result<PathBuf, String> {
    let resource_dir = app_handle
        .path()
        .resource_dir()
        .map_err(|e| format!("获取资源目录失败: {}", e))?;

    let tasks_dir = resource_dir.join("downloads").join("tasks");

    // 确保目录存在
    if !tasks_dir.exists() {
        fs::create_dir_all(&tasks_dir)
            .await
            .map_err(|e| format!("创建任务目录失败: {}", e))?;
    }

    Ok(tasks_dir.join("cartoon_tasks.json"))
}

/// 读取所有任务
async fn read_all_tasks(app_handle: &AppHandle) -> Result<Vec<DownloadTask>, String> {
    let tasks_file = get_tasks_storage_path(app_handle).await?;

    if !tasks_file.exists() {
        return Ok(vec![]);
    }

    let content = fs::read_to_string(&tasks_file)
        .await
        .map_err(|e| format!("读取任务文件失败: {}", e))?;

    if content.trim().is_empty() {
        return Ok(vec![]);
    }

    let tasks: Vec<DownloadTask> =
        serde_json::from_str(&content).map_err(|e| format!("解析任务文件失败: {}", e))?;

    Ok(tasks)
}

/// 保存所有任务
async fn save_all_tasks(app_handle: &AppHandle, tasks: &[DownloadTask]) -> Result<(), String> {
    let tasks_file = get_tasks_storage_path(app_handle).await?;

    let content =
        serde_json::to_string_pretty(tasks).map_err(|e| format!("序列化任务失败: {}", e))?;

    fs::write(&tasks_file, content)
        .await
        .map_err(|e| format!("写入任务文件失败: {}", e))?;

    Ok(())
}

/// 获取活跃的下载任务
#[tauri::command]
pub async fn get_active_download_tasks(app_handle: AppHandle) -> Result<Vec<DownloadTask>, String> {
    let tasks = read_all_tasks(&app_handle).await?;

    // 过滤出活跃任务（下载中和暂停中的任务）
    let active_tasks: Vec<DownloadTask> = tasks
        .into_iter()
        .filter(|task| matches!(task.status.as_str(), "downloading" | "paused"))
        .collect();

    println!("获取到 {} 个活跃任务", active_tasks.len());
    Ok(active_tasks)
}

/// 保存下载任务
#[tauri::command]
pub async fn save_download_task(
    app_handle: AppHandle,
    cartoon_uuid: String,
    cartoon_name: String,
    chapter_uuid: String,
    chapter_name: String,
    video_url: String,
    cover: String,
    cartoon_detail: Value,
    status: String,
    progress: f64,
    start_time: String,
) -> Result<(), String> {
    let mut tasks = read_all_tasks(&app_handle).await?;

    let task_key = format!("{}|{}", cartoon_uuid, chapter_uuid);
    let now = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();

    // 查找是否已存在该任务
    if let Some(existing_task) = tasks
        .iter_mut()
        .find(|t| format!("{}|{}", t.cartoon_uuid, t.chapter_uuid) == task_key)
    {
        // 更新现有任务
        existing_task.status = status;
        existing_task.progress = progress;
        existing_task.updated_at = now;
    } else {
        // 创建新任务
        let new_task = DownloadTask {
            cartoon_uuid,
            cartoon_name,
            chapter_uuid,
            chapter_name,
            video_url,
            cover,
            cartoon_detail: Some(cartoon_detail),
            status,
            progress,
            start_time,
            updated_at: now,
        };
        tasks.push(new_task);
    }

    save_all_tasks(&app_handle, &tasks).await?;
    println!("已保存下载任务: {}", task_key);
    Ok(())
}

/// 更新任务状态
#[tauri::command]
pub async fn update_download_task_status(
    app_handle: AppHandle,
    cartoon_uuid: String,
    chapter_uuid: String,
    status: String,
) -> Result<(), String> {
    let mut tasks = read_all_tasks(&app_handle).await?;

    let task_key = format!("{}|{}", cartoon_uuid, chapter_uuid);
    let now = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();

    if let Some(task) = tasks
        .iter_mut()
        .find(|t| format!("{}|{}", t.cartoon_uuid, t.chapter_uuid) == task_key)
    {
        task.status = status.clone();
        task.updated_at = now;

        save_all_tasks(&app_handle, &tasks).await?;
        println!("已更新任务状态: {} -> {}", task_key, status);
    } else {
        return Err(format!("未找到任务: {}", task_key));
    }

    Ok(())
}

/// 删除任务
#[tauri::command]
pub async fn remove_download_task(
    app_handle: AppHandle,
    cartoon_uuid: String,
    chapter_uuid: String,
) -> Result<(), String> {
    let mut tasks = read_all_tasks(&app_handle).await?;

    let task_key = format!("{}|{}", cartoon_uuid, chapter_uuid);

    let original_len = tasks.len();
    tasks.retain(|task| format!("{}|{}", task.cartoon_uuid, task.chapter_uuid) != task_key);

    if tasks.len() < original_len {
        save_all_tasks(&app_handle, &tasks).await?;
        println!("已删除任务: {}", task_key);
    } else {
        return Err(format!("未找到任务: {}", task_key));
    }

    Ok(())
}

/// 取消动画下载 (用于与现有接口兼容)
#[tauri::command]
pub async fn cancel_cartoon_download(
    app_handle: AppHandle,
    cartoon_uuid: String,
    chapter_uuid: String,
) -> Result<(), String> {
    // 更新状态为取消，然后删除任务
    let _ = update_download_task_status(
        app_handle.clone(),
        cartoon_uuid.clone(),
        chapter_uuid.clone(),
        "cancelled".to_string(),
    )
    .await;
    remove_download_task(app_handle, cartoon_uuid, chapter_uuid).await
}
