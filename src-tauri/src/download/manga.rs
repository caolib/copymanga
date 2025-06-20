use crate::download::types::*;
use crate::download::utils::*;
use serde_json::{json, Value};
use std::path::PathBuf;
use tauri::AppHandle;
use tokio::fs;
use tokio::io::AsyncWriteExt;

#[tauri::command]
pub async fn download_chapter(
    manga_uuid: String,
    manga_name: String,
    group_path_word: String,
    chapter_uuid: String,
    chapter_name: String,
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
            let cover_path = manga_path.join(format!("cover.{}", get_extension_from_filename(&cover_filename)));
            
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
    }
    
    // 创建章节信息文件
    let chapter_info = ChapterInfo {
        manga_uuid: download_info.manga_uuid.clone(),
        manga_name: download_info.manga_name.clone(),
        group_path_word: download_info.group_path_word.clone(),
        chapter_uuid: download_info.chapter_uuid.clone(),
        chapter_name: download_info.chapter_name.clone(),
        images: Vec::new(), // 将在下载完成后填充
        download_time: chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string(),
    };
    
    let info_path = chapter_path.join("info.json");
    let info_content = serde_json::to_string_pretty(&chapter_info)
        .map_err(|e| format!("序列化章节信息失败: {}", e))?;
    
    fs::write(&info_path, info_content).await
        .map_err(|e| format!("保存章节信息失败: {}", e))?;
    
    // 下载图片
    let client = reqwest::Client::builder()
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
        .timeout(std::time::Duration::from_secs(30))
        .build()
        .map_err(|e| format!("创建HTTP客户端失败: {}", e))?;
    
    let mut downloaded_images = Vec::new();
    
    for image_info in &download_info.images {
        let image_path = chapter_path.join(&image_info.filename);
        
        // 检查图片是否已存在
        if image_path.exists() {
            println!("图片已存在，跳过下载: {}", image_path.display());
            downloaded_images.push(image_info.filename.clone());
            continue;
        }
        
        match download_image(&client, &image_info.url, &image_path).await {
            Ok(_) => {
                println!("图片下载成功: {}", image_path.display());
                downloaded_images.push(image_info.filename.clone());
            },
            Err(e) => {
                println!("图片下载失败: {} - {}", image_info.url, e);
                // 继续下载其他图片，不中断整个下载过程
            }
        }
        
        // 添加小延迟避免请求过于频繁
        tokio::time::sleep(std::time::Duration::from_millis(100)).await;
    }
    
    // 更新章节信息文件，包含已下载的图片列表
    let updated_chapter_info = ChapterInfo {
        manga_uuid: download_info.manga_uuid.clone(),
        manga_name: download_info.manga_name.clone(),
        group_path_word: download_info.group_path_word.clone(),
        chapter_uuid: download_info.chapter_uuid.clone(),
        chapter_name: download_info.chapter_name.clone(),
        images: downloaded_images,
        download_time: chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string(),
    };
    
    let updated_info_content = serde_json::to_string_pretty(&updated_chapter_info)
        .map_err(|e| format!("序列化更新章节信息失败: {}", e))?;
    
    fs::write(&info_path, updated_info_content).await
        .map_err(|e| format!("更新章节信息失败: {}", e))?;
    
    Ok(DownloadResult {
        success: true,
        message: format!("章节下载完成: {}", chapter_name),
        chapter_path: chapter_path.to_string_lossy().to_string(),    })
}

#[tauri::command]
pub async fn get_downloaded_chapter_info(
    app_handle: AppHandle,
    manga_uuid: String,
    group_path_word: String,
    chapter_uuid: String,
) -> Result<Option<ChapterInfo>, String> {
    let manga_downloads_path = get_manga_downloads_path(&app_handle).await?;
    let chapter_path = manga_downloads_path.join(&manga_uuid).join(&group_path_word).join(&chapter_uuid);
    let info_file = chapter_path.join("info.json");

    if !info_file.exists() {
        return Ok(None);
    }

    let content = fs::read_to_string(&info_file).await
        .map_err(|e| format!("读取章节信息失败: {}", e))?;

    let chapter_info: ChapterInfo = serde_json::from_str(&content)
        .map_err(|e| format!("解析章节信息失败: {}", e))?;

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
    let chapter_path = manga_downloads_path.join(&manga_uuid).join(&group_path_word).join(&chapter_uuid);

    if !chapter_path.exists() {
        return Ok(vec![]);
    }

    let mut images = Vec::new();
    let mut entries = fs::read_dir(&chapter_path).await
        .map_err(|e| format!("读取章节目录失败: {}", e))?;

    while let Ok(Some(entry)) = entries.next_entry().await {
        let path = entry.path();
        if path.is_file() {
            let filename = path.file_name().unwrap().to_string_lossy();
            if filename.ends_with(".jpg") || filename.ends_with(".jpeg") || 
               filename.ends_with(".png") || filename.ends_with(".webp") {
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
    let chapter_path = manga_downloads_path.join(&manga_uuid).join(&group_path_word).join(&chapter_uuid);

    if !chapter_path.exists() {
        return Err("章节不存在".to_string());
    }

    // 删除整个章节目录
    fs::remove_dir_all(&chapter_path).await
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
    let mut entries = fs::read_dir(&manga_downloads_path).await
        .map_err(|e| format!("读取漫画目录失败: {}", e))?;

    while let Ok(Some(entry)) = entries.next_entry().await {
        let manga_path = entry.path();
        if manga_path.is_dir() {
            let manga_uuid = manga_path.file_name()
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
                        manga_detail["latestDownloadTime"] = json!(get_manga_latest_download_time(&manga_path).await);

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
pub async fn get_local_manga_detail(app_handle: AppHandle, manga_uuid: String) -> Result<Value, String> {
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
    
    let detail_content = fs::read_to_string(&detail_file).await
        .map_err(|e| format!("读取漫画详情失败: {}", e))?;
    
    let mut manga_detail: Value = serde_json::from_str(&detail_content)
        .map_err(|e| format!("解析漫画详情失败: {}", e))?;
    
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
pub async fn get_local_manga_chapters(app_handle: AppHandle, manga_uuid: String) -> Result<Vec<Value>, String> {
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
                                    if let Ok(chapter_info) = serde_json::from_str::<ChapterInfo>(&content) {
                                        let mut chapter_json = serde_json::to_value(&chapter_info)
                                            .map_err(|e| format!("序列化章节信息失败: {}", e))?;
                                        
                                        // 添加图片数量
                                        chapter_json["imageCount"] = json!(chapter_info.images.len());
                                        
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
    let chapter_path = manga_downloads_path.join(&manga_uuid).join(&group_path_word).join(&chapter_uuid);
    
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
            if file_path.is_file() && 
               file_path.extension().map_or(false, |ext| 
                   matches!(ext.to_str(), Some("jpg") | Some("jpeg") | Some("png") | Some("webp"))
               ) {
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
pub async fn download_image(client: &reqwest::Client, url: &str, path: &PathBuf) -> Result<(), String> {
    let response = client.get(url).send().await
        .map_err(|e| format!("请求图片失败: {}", e))?;
    
    if !response.status().is_success() {
        return Err(format!("下载图片失败: HTTP {}", response.status()));
    }
    
    let bytes = response.bytes().await
        .map_err(|e| format!("读取图片数据失败: {}", e))?;
    
    let mut file = fs::File::create(path).await
        .map_err(|e| format!("创建文件失败: {}", e))?;
    
    file.write_all(&bytes).await
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
                                    if let Ok(chapter_info) = serde_json::from_str::<ChapterInfo>(&content) {
                                        if latest_time.is_empty() || chapter_info.download_time > latest_time {
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
