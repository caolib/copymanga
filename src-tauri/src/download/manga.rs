use crate::download::types::*;
use crate::download::utils::*;
use serde_json::{json, Value};
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use tauri::AppHandle;
use tokio::fs;
use tokio::io::AsyncWriteExt;

// 全局暂停标志管理 - 使用原子布尔值替代HashMap以提高性能和可靠性
lazy_static::lazy_static! {
    static ref PAUSE_FLAGS: Arc<Mutex<HashMap<String, Arc<AtomicBool>>>> = Arc::new(Mutex::new(HashMap::new()));
}

#[tauri::command]
pub async fn download_chapter(
    manga_uuid: String,
    manga_name: String,
    group_path_word: String,
    chapter_uuid: String,
    chapter_name: String,
    total_images: usize, // 添加总图片数量参数
    images: Vec<ImageInfo>,
    manga_detail: Option<MangaDetail>,
    app_handle: AppHandle,
) -> Result<DownloadResult, String> {
    println!("开始下载章节: {}", chapter_name);

    let download_info = DownloadInfo {
        manga_uuid: manga_uuid.clone(),
        manga_name: manga_name.clone(),
        group_path_word: group_path_word.clone(),
        chapter_uuid: chapter_uuid.clone(),
        chapter_name: chapter_name.clone(),
        images,
        manga_detail: manga_detail.clone(),
    };

    // 获取漫画下载目录
    let manga_downloads_path = get_manga_downloads_path(&app_handle).await?;
    let manga_path = manga_downloads_path.join(&download_info.manga_uuid);

    // 确保漫画目录存在
    if let Err(e) = fs::create_dir_all(&manga_path).await {
        return Err(format!("创建漫画目录失败: {}", e));
    }

    // 保存漫画详情JSON文件和下载封面图片（如果提供了manga_detail）
    if let Some(ref detail) = manga_detail {
        // 保存漫画详情JSON文件
        let manga_detail_path = manga_path.join("manga_detail.json");
        let detail_content = serde_json::to_string_pretty(detail)
            .map_err(|e| format!("序列化漫画详情失败: {}", e))?;

        if let Err(e) = fs::write(&manga_detail_path, detail_content).await {
            return Err(format!("写入漫画详情失败: {}", e));
        }

        // 下载封面图片
        if !detail.cover.is_empty() {
            let cover_filename = get_filename_from_url(&detail.cover);
            let cover_path = manga_path.join(format!(
                "cover.{}",
                get_extension_from_filename(&cover_filename)
            ));

            // 检查封面是否已存在
            if !cover_path.exists() {
                let client = reqwest::Client::builder()
                    .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
                    .timeout(std::time::Duration::from_secs(30))
                    .build()
                    .map_err(|e| format!("创建HTTP客户端失败: {}", e))?;

                match download_image(&client, &detail.cover, &cover_path).await {
                    Ok(_) => println!("封面下载成功: {}", cover_path.display()),
                    Err(e) => println!("封面下载失败: {} - {}", detail.cover, e),
                }
            } else {
                println!("封面已存在，跳过下载: {}", cover_path.display());
            }
        }
    }

    // 创建章节目录
    let chapter_path = manga_path
        .join(&download_info.group_path_word)
        .join(&download_info.chapter_uuid);

    println!("下载路径: {}", chapter_path.display());

    // 确保目录存在
    if let Err(e) = fs::create_dir_all(&chapter_path).await {
        return Err(format!("创建目录失败: {}", e));
    } // 创建章节信息文件
    let chapter_info = ChapterInfo {
        manga_uuid: download_info.manga_uuid.clone(),
        manga_name: download_info.manga_name.clone(),
        group_path_word: download_info.group_path_word.clone(),
        chapter_uuid: download_info.chapter_uuid.clone(),
        chapter_name: download_info.chapter_name.clone(),
        total_images,       // 保存总图片数量
        images: Vec::new(), // 将在下载完成后填充
        download_time: chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string(),
    };

    let info_path = chapter_path.join("info.json");
    let info_content = serde_json::to_string_pretty(&chapter_info)
        .map_err(|e| format!("序列化章节信息失败: {}", e))?;

    fs::write(&info_path, info_content)
        .await
        .map_err(|e| format!("保存章节信息失败: {}", e))?;

    // 下载图片
    let client = reqwest::Client::builder()
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
        .timeout(std::time::Duration::from_secs(30))
        .build()
        .map_err(|e| format!("创建HTTP客户端失败: {}", e))?;
    let mut downloaded_images = Vec::new();
    let chapter_key = format!("{}|{}|{}", manga_uuid, group_path_word, chapter_uuid);
    eprintln!("🚀🚀🚀 开始下载章节，章节密钥: {} 🚀🚀🚀", chapter_key);

    // 确保暂停标志初始状态是false
    set_pause_flag(&chapter_key, false);
    eprintln!("🔄 初始化暂停标志为 false: {}", chapter_key);
    for (index, image_info) in download_info.images.iter().enumerate() {
        // 检查是否被暂停 - 在每张图片开始前检查
        if is_paused(&chapter_key) {
            // 使用 eprintln! 确保日志能被看到
            eprintln!(
                "❌ 下载已暂停，停止在第 {} 张图片: {}",
                index + 1,
                chapter_key
            );
            break;
        }

        let image_path = chapter_path.join(&image_info.filename);

        // 检查图片是否已存在
        if image_path.exists() {
            eprintln!("⏭️ 图片已存在，跳过下载: {}", image_path.display());
            downloaded_images.push(image_info.filename.clone());
            continue;
        }

        eprintln!(
            "⬇️ 开始下载图片 {}/{}: {} (章节: {})",
            index + 1,
            download_info.images.len(),
            image_info.filename,
            chapter_key
        );

        // 再次检查暂停状态 - 在真正开始下载前
        if is_paused(&chapter_key) {
            eprintln!("❌ 下载在开始下载图片前暂停: {}", chapter_key);
            break;
        }

        match download_image(&client, &image_info.url, &image_path).await {
            Ok(_) => {
                eprintln!("✅ 图片下载成功: {}", image_path.display());
                downloaded_images.push(image_info.filename.clone());

                // 在下载完成后立即检查暂停状态
                if is_paused(&chapter_key) {
                    eprintln!("❌ 下载在图片完成后暂停: {}", chapter_key);
                    break;
                }
            }
            Err(e) => {
                eprintln!("❌ 图片下载失败: {} - {}", image_info.url, e);
                // 即使下载失败也要检查暂停状态
                if is_paused(&chapter_key) {
                    eprintln!("❌ 下载在图片失败后暂停: {}", chapter_key);
                    break;
                }
            }
        }

        // 添加小延迟避免请求过于频繁，同时提供更多暂停机会
        tokio::time::sleep(std::time::Duration::from_millis(200)).await;

        // 延迟后再次检查暂停状态
        if is_paused(&chapter_key) {
            eprintln!("❌ 下载在延迟后暂停: {}", chapter_key);
            break;
        }
    }

    // 清理暂停标志
    clear_pause_flag(&chapter_key); // 更新章节信息文件，包含已下载的图片列表
    let updated_chapter_info = ChapterInfo {
        manga_uuid: download_info.manga_uuid.clone(),
        manga_name: download_info.manga_name.clone(),
        group_path_word: download_info.group_path_word.clone(),
        chapter_uuid: download_info.chapter_uuid.clone(),
        chapter_name: download_info.chapter_name.clone(),
        total_images, // 保持总图片数量
        images: downloaded_images,
        download_time: chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string(),
    };

    let updated_info_content = serde_json::to_string_pretty(&updated_chapter_info)
        .map_err(|e| format!("序列化更新章节信息失败: {}", e))?;

    fs::write(&info_path, updated_info_content)
        .await
        .map_err(|e| format!("更新章节信息失败: {}", e))?;

    Ok(DownloadResult {
        success: true,
        message: format!("章节下载完成: {}", chapter_name),
        chapter_path: chapter_path.to_string_lossy().to_string(),
    })
}

#[tauri::command]
pub async fn get_downloaded_chapter_info(
    app_handle: AppHandle,
    manga_uuid: String,
    group_path_word: String,
    chapter_uuid: String,
) -> Result<Option<ChapterInfo>, String> {
    let manga_downloads_path = get_manga_downloads_path(&app_handle).await?;
    let chapter_path = manga_downloads_path
        .join(&manga_uuid)
        .join(&group_path_word)
        .join(&chapter_uuid);
    let info_file = chapter_path.join("info.json");

    if !info_file.exists() {
        return Ok(None);
    }

    let content = fs::read_to_string(&info_file)
        .await
        .map_err(|e| format!("读取章节信息失败: {}", e))?;

    let chapter_info: ChapterInfo =
        serde_json::from_str(&content).map_err(|e| format!("解析章节信息失败: {}", e))?;

    Ok(Some(chapter_info))
}

#[tauri::command]
pub async fn get_local_chapter_images(
    app_handle: AppHandle,
    manga_uuid: String,
    group_path_word: String,
    chapter_uuid: String,
) -> Result<Vec<String>, String> {
    let manga_downloads_path = get_manga_downloads_path(&app_handle).await?;
    let chapter_path = manga_downloads_path
        .join(&manga_uuid)
        .join(&group_path_word)
        .join(&chapter_uuid);

    if !chapter_path.exists() {
        return Ok(vec![]);
    }

    let mut images = Vec::new();
    let mut entries = fs::read_dir(&chapter_path)
        .await
        .map_err(|e| format!("读取章节目录失败: {}", e))?;

    while let Ok(Some(entry)) = entries.next_entry().await {
        let path = entry.path();
        if path.is_file() {
            let filename = path.file_name().unwrap().to_string_lossy();
            if filename.ends_with(".jpg")
                || filename.ends_with(".jpeg")
                || filename.ends_with(".png")
                || filename.ends_with(".webp")
            {
                // 返回相对于章节目录的文件路径
                images.push(path.to_string_lossy().to_string());
            }
        }
    }

    // 按文件名排序
    images.sort();
    Ok(images)
}

#[tauri::command]
pub async fn delete_downloaded_chapter(
    app_handle: AppHandle,
    manga_uuid: String,
    group_path_word: String,
    chapter_uuid: String,
) -> Result<Value, String> {
    let manga_downloads_path = get_manga_downloads_path(&app_handle).await?;
    let chapter_path = manga_downloads_path
        .join(&manga_uuid)
        .join(&group_path_word)
        .join(&chapter_uuid);

    if !chapter_path.exists() {
        return Err("章节不存在".to_string());
    }

    // 删除整个章节目录
    fs::remove_dir_all(&chapter_path)
        .await
        .map_err(|e| format!("删除章节失败: {}", e))?;

    Ok(json!({
        "success": true,
        "message": "章节删除成功"
    }))
}

#[tauri::command]
pub async fn get_downloaded_manga_list(app_handle: AppHandle) -> Result<Vec<Value>, String> {
    let manga_downloads_path = get_manga_downloads_path(&app_handle).await?;

    if !manga_downloads_path.exists() {
        return Ok(vec![]);
    }

    let mut mangas = Vec::new();
    let mut entries = fs::read_dir(&manga_downloads_path)
        .await
        .map_err(|e| format!("读取漫画目录失败: {}", e))?;

    while let Ok(Some(entry)) = entries.next_entry().await {
        let manga_path = entry.path();
        if manga_path.is_dir() {
            let manga_uuid = manga_path
                .file_name()
                .unwrap_or_default()
                .to_string_lossy()
                .to_string();

            // 读取漫画详情
            let detail_file = manga_path.join("manga_detail.json");
            if detail_file.exists() {
                if let Ok(content) = fs::read_to_string(&detail_file).await {
                    if let Ok(mut manga_detail) = serde_json::from_str::<Value>(&content) {
                        // 添加 UUID 和其他本地信息
                        manga_detail["uuid"] = json!(manga_uuid);
                        manga_detail["latestDownloadTime"] =
                            json!(get_manga_latest_download_time(&manga_path).await);

                        // 添加封面路径
                        if let Some(cover_path) = find_manga_cover_file(&manga_path).await {
                            manga_detail["coverPath"] = json!(cover_path);
                        }

                        // 统计下载的章节数量
                        let chapter_count = count_downloaded_manga_chapters(&manga_path).await;
                        manga_detail["chapterCount"] = json!(chapter_count);

                        mangas.push(manga_detail);
                    }
                }
            }
        }
    }

    // 按最新下载时间排序
    mangas.sort_by(|a, b| {
        let a_time = a["latestDownloadTime"].as_str().unwrap_or("");
        let b_time = b["latestDownloadTime"].as_str().unwrap_or("");
        b_time.cmp(a_time)
    });

    Ok(mangas)
}

#[tauri::command]
pub async fn get_local_manga_detail(
    app_handle: AppHandle,
    manga_uuid: String,
) -> Result<Value, String> {
    let manga_downloads_path = get_manga_downloads_path(&app_handle).await?;
    let manga_path = manga_downloads_path.join(&manga_uuid);

    if !manga_path.exists() {
        return Err("本地漫画不存在".to_string());
    }

    // 读取漫画详情文件
    let detail_file = manga_path.join("manga_detail.json");
    if !detail_file.exists() {
        return Err("漫画详情文件不存在".to_string());
    }

    let detail_content = fs::read_to_string(&detail_file)
        .await
        .map_err(|e| format!("读取漫画详情失败: {}", e))?;

    let mut manga_detail: Value =
        serde_json::from_str(&detail_content).map_err(|e| format!("解析漫画详情失败: {}", e))?;

    // 添加本地信息
    manga_detail["uuid"] = json!(manga_uuid);
    manga_detail["latestDownloadTime"] = json!(get_manga_latest_download_time(&manga_path).await);

    // 添加封面路径
    if let Some(cover_path) = find_manga_cover_file(&manga_path).await {
        manga_detail["coverPath"] = json!(cover_path);
    }

    Ok(manga_detail)
}

#[tauri::command]
pub async fn get_local_manga_chapters(
    app_handle: AppHandle,
    manga_uuid: String,
) -> Result<Vec<Value>, String> {
    let manga_downloads_path = get_manga_downloads_path(&app_handle).await?;
    let manga_path = manga_downloads_path.join(&manga_uuid);

    if !manga_path.exists() {
        return Ok(vec![]);
    }

    let mut chapters = Vec::new();

    // 遍历所有组目录
    if let Ok(mut group_entries) = fs::read_dir(&manga_path).await {
        while let Ok(Some(group_entry)) = group_entries.next_entry().await {
            let group_path = group_entry.path();
            if group_path.is_dir() {
                let group_name = group_path.file_name().unwrap_or_default().to_string_lossy();

                // 跳过非章节目录
                if group_name == "manga_detail.json" || group_name.starts_with("cover.") {
                    continue;
                }

                // 遍历章节目录
                if let Ok(mut chapter_entries) = fs::read_dir(&group_path).await {
                    while let Ok(Some(chapter_entry)) = chapter_entries.next_entry().await {
                        let chapter_path = chapter_entry.path();
                        if chapter_path.is_dir() {
                            let info_file = chapter_path.join("info.json");
                            if info_file.exists() {
                                if let Ok(content) = fs::read_to_string(&info_file).await {
                                    if let Ok(chapter_info) =
                                        serde_json::from_str::<ChapterInfo>(&content)
                                    {
                                        let mut chapter_json = serde_json::to_value(&chapter_info)
                                            .map_err(|e| format!("序列化章节信息失败: {}", e))?;

                                        // 添加图片数量
                                        chapter_json["imageCount"] =
                                            json!(chapter_info.images.len());

                                        chapters.push(chapter_json);
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    // 按章节名排序
    chapters.sort_by(|a, b| {
        let a_name = a["chapter_name"].as_str().unwrap_or("");
        let b_name = b["chapter_name"].as_str().unwrap_or("");
        a_name.cmp(b_name)
    });

    Ok(chapters)
}

#[tauri::command]
pub async fn get_download_progress(
    app_handle: AppHandle,
    manga_uuid: String,
    group_path_word: String,
    chapter_uuid: String,
    expected_image_count: usize,
) -> Result<DownloadProgress, String> {
    let manga_downloads_path = get_manga_downloads_path(&app_handle).await?;
    let chapter_path = manga_downloads_path
        .join(&manga_uuid)
        .join(&group_path_word)
        .join(&chapter_uuid);

    // 如果章节目录不存在，返回0进度
    if !chapter_path.exists() {
        return Ok(DownloadProgress {
            completed: 0,
            total: expected_image_count,
            percent: 0.0,
            current_image: "准备下载...".to_string(),
            status: "pending".to_string(),
        });
    }

    // 统计已下载的图片数量
    let mut completed = 0;
    if let Ok(mut entries) = fs::read_dir(&chapter_path).await {
        while let Ok(Some(entry)) = entries.next_entry().await {
            let file_path = entry.path();
            if file_path.is_file()
                && file_path.extension().map_or(false, |ext| {
                    matches!(
                        ext.to_str(),
                        Some("jpg") | Some("jpeg") | Some("png") | Some("webp")
                    )
                })
            {
                completed += 1;
            }
        }
    }

    let percent = if expected_image_count > 0 {
        (completed as f64 / expected_image_count as f64) * 100.0
    } else {
        0.0
    };

    let status = if completed >= expected_image_count {
        "completed".to_string()
    } else if completed > 0 {
        "downloading".to_string()
    } else {
        "pending".to_string()
    };

    Ok(DownloadProgress {
        completed,
        total: expected_image_count,
        percent,
        current_image: format!("正在下载 {}/{}", completed, expected_image_count),
        status,
    })
}

// 辅助函数
pub async fn download_image(
    client: &reqwest::Client,
    url: &str,
    path: &PathBuf,
) -> Result<(), String> {
    let response = client
        .get(url)
        .send()
        .await
        .map_err(|e| format!("请求图片失败: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("下载图片失败: HTTP {}", response.status()));
    }

    let bytes = response
        .bytes()
        .await
        .map_err(|e| format!("读取图片数据失败: {}", e))?;

    let mut file = fs::File::create(path)
        .await
        .map_err(|e| format!("创建文件失败: {}", e))?;

    file.write_all(&bytes)
        .await
        .map_err(|e| format!("写入文件失败: {}", e))?;

    Ok(())
}

pub fn get_filename_from_url(url: &str) -> String {
    url.split('/').last().unwrap_or("image").to_string()
}

pub fn get_extension_from_filename(filename: &str) -> String {
    filename.split('.').last().unwrap_or("jpg").to_string()
}

async fn get_manga_latest_download_time(manga_path: &PathBuf) -> String {
    let mut latest_time = String::new();

    if let Ok(mut group_entries) = fs::read_dir(manga_path).await {
        while let Ok(Some(group_entry)) = group_entries.next_entry().await {
            let group_path = group_entry.path();
            if group_path.is_dir() {
                if let Ok(mut chapter_entries) = fs::read_dir(&group_path).await {
                    while let Ok(Some(chapter_entry)) = chapter_entries.next_entry().await {
                        let chapter_path = chapter_entry.path();
                        if chapter_path.is_dir() {
                            let info_file = chapter_path.join("info.json");
                            if info_file.exists() {
                                if let Ok(content) = fs::read_to_string(&info_file).await {
                                    if let Ok(chapter_info) =
                                        serde_json::from_str::<ChapterInfo>(&content)
                                    {
                                        if latest_time.is_empty()
                                            || chapter_info.download_time > latest_time
                                        {
                                            latest_time = chapter_info.download_time;
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    latest_time
}

async fn find_manga_cover_file(manga_path: &PathBuf) -> Option<String> {
    let cover_extensions = ["jpg", "jpeg", "png", "webp"];

    for ext in &cover_extensions {
        let cover_path = manga_path.join(format!("cover.{}", ext));
        if cover_path.exists() {
            return Some(cover_path.to_string_lossy().to_string());
        }
    }

    None
}

async fn count_downloaded_manga_chapters(manga_path: &PathBuf) -> usize {
    let mut count = 0;

    if let Ok(mut group_entries) = fs::read_dir(manga_path).await {
        while let Ok(Some(group_entry)) = group_entries.next_entry().await {
            let group_path = group_entry.path();
            if group_path.is_dir() {
                let group_name = group_path.file_name().unwrap_or_default().to_string_lossy();

                // 跳过非章节目录
                if group_name == "manga_detail.json" || group_name.starts_with("cover.") {
                    continue;
                }

                if let Ok(mut chapter_entries) = fs::read_dir(&group_path).await {
                    while let Ok(Some(chapter_entry)) = chapter_entries.next_entry().await {
                        let chapter_path = chapter_entry.path();
                        if chapter_path.is_dir() {
                            let info_file = chapter_path.join("info.json");
                            if info_file.exists() {
                                count += 1;
                            }
                        }
                    }
                }
            }
        }
    }

    count
}

// 设置暂停标志
fn set_pause_flag(chapter_key: &str, paused: bool) {
    let mut flags = PAUSE_FLAGS.lock().unwrap();
    if paused {
        // 如果设置为暂停，创建或获取原子布尔值并设置为true
        let pause_flag = flags
            .entry(chapter_key.to_string())
            .or_insert_with(|| Arc::new(AtomicBool::new(false)));
        pause_flag.store(true, Ordering::Relaxed);
    } else {
        // 如果设置为不暂停，直接移除或设置为false
        if let Some(flag) = flags.get(chapter_key) {
            flag.store(false, Ordering::Relaxed);
        }
    }
}

// 检查是否暂停
fn is_paused(chapter_key: &str) -> bool {
    let flags = PAUSE_FLAGS.lock().unwrap();
    if let Some(flag) = flags.get(chapter_key) {
        flag.load(Ordering::Relaxed)
    } else {
        false
    }
}

// 清除暂停标志
fn clear_pause_flag(chapter_key: &str) {
    let mut flags = PAUSE_FLAGS.lock().unwrap();
    flags.remove(chapter_key);
}

#[tauri::command]
pub async fn pause_chapter_download(
    manga_uuid: String,
    group_path_word: String,
    chapter_uuid: String,
) -> Result<bool, String> {
    let chapter_key = format!("{}|{}|{}", manga_uuid, group_path_word, chapter_uuid);
    eprintln!("🔶 收到暂停请求 - 章节密钥: {}", chapter_key);

    // 检查暂停标志是否已设置
    let was_paused = is_paused(&chapter_key);
    eprintln!(
        "🔍 暂停前状态: {}",
        if was_paused { "已暂停" } else { "运行中" }
    );

    set_pause_flag(&chapter_key, true);

    // 验证暂停标志是否设置成功
    let is_now_paused = is_paused(&chapter_key);
    eprintln!("✅ 暂停标志设置完成: {}", is_now_paused);
    let is_now_paused = is_paused(&chapter_key);
    println!(
        "暂停后状态: {}",
        if is_now_paused {
            "已暂停"
        } else {
            "设置失败"
        }
    );

    println!("暂停漫画下载成功: {}", chapter_key);
    Ok(true)
}

#[tauri::command]
pub async fn resume_chapter_download(
    manga_uuid: String,
    group_path_word: String,
    chapter_uuid: String,
) -> Result<bool, String> {
    let chapter_key = format!("{}|{}|{}", manga_uuid, group_path_word, chapter_uuid);
    set_pause_flag(&chapter_key, false);
    println!("恢复漫画下载: {}", chapter_key);
    Ok(true)
}

#[tauri::command]
pub async fn check_incomplete_download(
    manga_uuid: String,
    group_path_word: String,
    chapter_uuid: String,
    app_handle: AppHandle,
) -> Result<IncompleteDownloadResult, String> {
    let manga_downloads_path = get_manga_downloads_path(&app_handle).await?;
    let chapter_path = manga_downloads_path
        .join(&manga_uuid)
        .join(&group_path_word)
        .join(&chapter_uuid);

    if !chapter_path.exists() {
        return Ok(IncompleteDownloadResult {
            has_incomplete: false,
            completed: None,
            total: None,
            percent: None,
        });
    }

    let info_file = chapter_path.join("info.json");
    if !info_file.exists() {
        // 有目录但没有info.json，可能是未完成下载
        let image_files = std::fs::read_dir(&chapter_path)
            .map_err(|e| format!("读取章节目录失败: {}", e))?
            .filter_map(|entry| entry.ok())
            .filter(|entry| {
                if let Some(ext) = entry.path().extension() {
                    matches!(
                        ext.to_str(),
                        Some("jpg") | Some("jpeg") | Some("png") | Some("webp")
                    )
                } else {
                    false
                }
            })
            .count();

        if image_files > 0 {
            return Ok(IncompleteDownloadResult {
                has_incomplete: true,
                completed: Some(image_files),
                total: None,
                percent: None,
            });
        }
    }

    Ok(IncompleteDownloadResult {
        has_incomplete: false,
        completed: None,
        total: None,
        percent: None,
    })
}

#[tauri::command]
pub async fn check_chapter_download_detail(
    app_handle: AppHandle,
    manga_uuid: String,
    group_path_word: String,
    chapter_uuid: String,
) -> Result<ChapterDownloadDetail, String> {
    let manga_downloads_path = get_manga_downloads_path(&app_handle).await?;
    let chapter_path = manga_downloads_path
        .join(&manga_uuid)
        .join(&group_path_word)
        .join(&chapter_uuid);
    let info_file = chapter_path.join("info.json");

    // 检查是否存在 info.json
    if !info_file.exists() {
        return Ok(ChapterDownloadDetail {
            status: "not_downloaded".to_string(),
            total_images: 0,
            downloaded_images: 0,
            progress: 0.0,
        });
    }

    // 读取章节信息
    let content = fs::read_to_string(&info_file)
        .await
        .map_err(|e| format!("读取章节信息失败: {}", e))?;
    let chapter_info: ChapterInfo =
        serde_json::from_str(&content).map_err(|e| format!("解析章节信息失败: {}", e))?;

    let total_images = chapter_info.total_images; // 使用保存的总图片数量
                                                  // 统计已下载的图片数量
    let mut downloaded_count = 0;
    for image_url in &chapter_info.images {
        let filename = get_filename_from_url(image_url);
        let image_path = chapter_path.join(&filename);

        // 检查文件是否存在且有内容
        if image_path.exists() {
            if let Ok(metadata) = fs::metadata(&image_path).await {
                if metadata.len() > 0 {
                    downloaded_count += 1;
                }
            }
        }
    }

    let progress = if total_images > 0 {
        (downloaded_count as f64 / total_images as f64) * 100.0
    } else {
        0.0
    };

    let status = if downloaded_count == 0 {
        "not_downloaded".to_string()
    } else if downloaded_count == total_images {
        "downloaded".to_string()
    } else {
        "partial".to_string()
    };

    Ok(ChapterDownloadDetail {
        status,
        total_images,
        downloaded_images: downloaded_count,
        progress,
    })
}
