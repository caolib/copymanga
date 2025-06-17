use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tauri::{AppHandle, Manager};
use tokio::fs;
use tokio::io::AsyncWriteExt;

#[derive(Debug, Serialize, Deserialize)]
pub struct ImageInfo {
    pub url: String,
    pub index: usize,
    pub filename: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DownloadInfo {
    pub manga_uuid: String,
    pub manga_name: String,
    pub group_path_word: String,
    pub chapter_uuid: String,
    pub chapter_name: String,
    pub images: Vec<ImageInfo>,
    pub manga_detail: Option<MangaDetail>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct MangaDetail {
    pub uuid: String,
    pub name: String,
    pub cover: String,
    pub author: Vec<String>,
    pub theme: Vec<String>,
    pub status: Option<String>,
    pub popular: Option<i32>,
    pub brief: Option<String>,
    pub datetime_updated: Option<String>,
    pub path_word: Option<String>, // 添加path_word字段
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ChapterInfo {
    pub manga_uuid: String,
    pub manga_name: String,
    pub group_path_word: String,
    pub chapter_uuid: String,
    pub chapter_name: String,
    pub total_images: usize,
    pub download_time: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DownloadProgress {
    pub completed: usize,
    pub total: usize,
    pub percent: f64,
    pub current_image: String,
    pub status: String, // "downloading", "success", "error", "skip"
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DownloadResult {
    pub success: bool,
    pub chapter_path: String,
    pub message: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CheckDownloadedResult {
    pub is_downloaded: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ChapterInfoResult {
    pub chapter_info: Option<ChapterInfo>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct LocalChapterImages {
    pub images: Vec<String>, // 本地图片的绝对路径列表
    pub total_count: usize,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DeleteChapterResult {
    pub success: bool,
    pub message: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DownloadedMangaInfo {
    pub uuid: String,
    pub name: String,
    pub pathWord: String,  // 匹配JavaScript中的pathWord
    pub author: Vec<String>,
    pub theme: Vec<String>,
    pub status: Option<String>,
    pub popular: Option<i32>,
    pub brief: Option<String>,
    pub datetime_updated: Option<String>,
    pub coverPath: Option<String>, // 匹配JavaScript中的coverPath
    pub chapterCount: usize,       // 匹配JavaScript中的chapterCount
    pub latestDownloadTime: String, // 匹配JavaScript中的latestDownloadTime
}

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
    
    // 获取应用资源目录
    let resource_dir = app_handle
        .path()
        .resource_dir()
        .map_err(|e| format!("获取资源目录失败: {}", e))?;
    
    // 创建漫画目录
    let manga_path = resource_dir
        .join("downloads")
        .join("manga")
        .join(&download_info.manga_uuid);
    
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
        total_images: download_info.images.len(),
        download_time: chrono::Utc::now().to_rfc3339(),
    };
    
    let info_path = chapter_path.join("info.json");
    let info_content = serde_json::to_string_pretty(&chapter_info)
        .map_err(|e| format!("序列化章节信息失败: {}", e))?;
    
    if let Err(e) = fs::write(&info_path, info_content).await {
        return Err(format!("写入章节信息失败: {}", e));
    }
    
    // 创建 HTTP 客户端
    let client = reqwest::Client::builder()
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
        .timeout(std::time::Duration::from_secs(30))
        .build()
        .map_err(|e| format!("创建HTTP客户端失败: {}", e))?;
    
    let total_images = download_info.images.len();
    let mut completed_images = 0;
    
    // 下载所有图片
    for image_info in &download_info.images {
        let image_path = chapter_path.join(&image_info.filename);
        
        // 检查文件是否已存在
        if image_path.exists() {
            println!("图片已存在，跳过: {}", image_info.filename);
            completed_images += 1;
            
            // 发送进度更新（可选，如果需要实时进度）
            let _progress = DownloadProgress {
                completed: completed_images,
                total: total_images,
                percent: (completed_images as f64 / total_images as f64) * 100.0,
                current_image: image_info.filename.clone(),
                status: "skip".to_string(),
            };
            
            // 这里可以发送事件到前端，但目前先跳过
            continue;
        }
        
        // 下载图片
        match download_image(&client, &image_info.url, &image_path).await {
            Ok(_) => {
                completed_images += 1;
                println!("下载成功: {}", image_info.filename);
                
                let _progress = DownloadProgress {
                    completed: completed_images,
                    total: total_images,
                    percent: (completed_images as f64 / total_images as f64) * 100.0,
                    current_image: image_info.filename.clone(),
                    status: "success".to_string(),
                };
                
                // 发送进度更新事件（可选）
            }
            Err(e) => {
                completed_images += 1;
                println!("下载失败: {} - {}", image_info.filename, e);
                
                let _progress = DownloadProgress {
                    completed: completed_images,
                    total: total_images,
                    percent: (completed_images as f64 / total_images as f64) * 100.0,
                    current_image: image_info.filename.clone(),
                    status: "error".to_string(),
                };
                
                // 继续下载其他图片，不中断整个过程
            }
        }
    }
    
    Ok(DownloadResult {
        success: true,
        chapter_path: chapter_path.to_string_lossy().to_string(),
        message: format!("章节 \"{}\" 下载完成", download_info.chapter_name),
    })
}

async fn download_image(
    client: &reqwest::Client,
    url: &str,
    save_path: &PathBuf,
) -> Result<(), String> {
    let response = client.get(url).send().await
        .map_err(|e| format!("请求失败: {}", e))?;
    
    if !response.status().is_success() {
        return Err(format!("HTTP错误: {}", response.status()));
    }
    
    let bytes = response.bytes().await
        .map_err(|e| format!("读取响应失败: {}", e))?;
    
    let mut file = fs::File::create(save_path).await
        .map_err(|e| format!("创建文件失败: {}", e))?;
    
    file.write_all(&bytes).await
        .map_err(|e| format!("写入文件失败: {}", e))?;
    
    file.flush().await
        .map_err(|e| format!("刷新文件失败: {}", e))?;
    
    Ok(())
}

/// 从URL中提取文件名
fn get_filename_from_url(url: &str) -> String {
    url.split('/').last().unwrap_or("unknown").to_string()
}

/// 从文件名中提取扩展名，默认为jpg
fn get_extension_from_filename(filename: &str) -> String {
    if let Some(dot_pos) = filename.rfind('.') {
        let ext = &filename[dot_pos + 1..];
        // 检查是否为有效的图片扩展名
        match ext.to_lowercase().as_str() {
            "jpg" | "jpeg" | "png" | "webp" | "gif" => ext.to_string(),
            _ => "jpg".to_string(), // 默认使用jpg
        }
    } else {
        "jpg".to_string() // 默认使用jpg
    }
}

#[tauri::command]
pub async fn check_chapter_downloaded(
    manga_uuid: String,
    group_path_word: String,
    chapter_uuid: String,
    app_handle: AppHandle,
) -> Result<CheckDownloadedResult, String> {
    // 获取应用资源目录
    let resource_dir = app_handle
        .path()
        .resource_dir()
        .map_err(|e| format!("获取资源目录失败: {}", e))?;
    
    let chapter_path = resource_dir
        .join("downloads")
        .join("manga")
        .join(&manga_uuid)
        .join(&group_path_word)
        .join(&chapter_uuid);
    
    let info_path = chapter_path.join("info.json");
    let is_downloaded = info_path.exists();
    
    Ok(CheckDownloadedResult { is_downloaded })
}

#[tauri::command]
pub async fn get_downloaded_chapter_info(
    manga_uuid: String,
    group_path_word: String,
    chapter_uuid: String,
    app_handle: AppHandle,
) -> Result<ChapterInfoResult, String> {
    // 获取应用资源目录
    let resource_dir = app_handle
        .path()
        .resource_dir()
        .map_err(|e| format!("获取资源目录失败: {}", e))?;
    
    let chapter_path = resource_dir
        .join("downloads")
        .join("manga")
        .join(&manga_uuid)
        .join(&group_path_word)
        .join(&chapter_uuid);
    
    let info_path = chapter_path.join("info.json");
    
    if !info_path.exists() {
        return Ok(ChapterInfoResult { chapter_info: None });
    }
    
    let content = fs::read_to_string(&info_path).await
        .map_err(|e| format!("读取文件失败: {}", e))?;
    
    let chapter_info: ChapterInfo = serde_json::from_str(&content)
        .map_err(|e| format!("解析JSON失败: {}", e))?;
    
    Ok(ChapterInfoResult {
        chapter_info: Some(chapter_info),
    })
}

#[tauri::command]
pub async fn get_local_chapter_images(
    manga_uuid: String,
    group_path_word: String,
    chapter_uuid: String,
    app_handle: AppHandle,
) -> Result<LocalChapterImages, String> {
    // 获取应用资源目录
    let resource_dir = app_handle
        .path()
        .resource_dir()
        .map_err(|e| format!("获取资源目录失败: {}", e))?;
    
    let chapter_path = resource_dir
        .join("downloads")
        .join("manga")
        .join(&manga_uuid)
        .join(&group_path_word)
        .join(&chapter_uuid);
    
    // 检查章节目录是否存在
    if !chapter_path.exists() {
        println!("章节目录不存在: {}", chapter_path.display());
        return Ok(LocalChapterImages {
            images: Vec::new(),
            total_count: 0,
        });
    }
    
    // 读取目录中的所有图片文件
    let mut image_paths = Vec::new();
    
    let mut entries = fs::read_dir(&chapter_path).await
        .map_err(|e| format!("读取目录失败: {}", e))?;
    
    while let Some(entry) = entries.next_entry().await
        .map_err(|e| format!("读取目录项失败: {}", e))? {
        
        let path = entry.path();
        
        // 只处理图片文件，跳过 info.json
        if let Some(extension) = path.extension() {
            let ext = extension.to_string_lossy().to_lowercase();
            if matches!(ext.as_str(), "jpg" | "jpeg" | "png" | "gif" | "webp" | "bmp") {
                if let Some(path_str) = path.to_str() {
                    image_paths.push(path_str.to_string());
                }
            }
        }
    }
    
    // 按文件名排序（通常图片文件名包含索引）
    image_paths.sort();
    
    let total_count = image_paths.len();
    println!("找到本地图片文件 {} 张:", total_count);
    for (i, path) in image_paths.iter().enumerate() {
        println!("  图片 {}: {}", i + 1, path);
    }
    
    Ok(LocalChapterImages {
        images: image_paths,
        total_count,
    })
}

#[tauri::command]
pub async fn delete_downloaded_chapter(
    manga_uuid: String,
    group_path_word: String,
    chapter_uuid: String,
    app_handle: AppHandle,
) -> Result<DeleteChapterResult, String> {
    println!("开始删除章节: {}/{}/{}", manga_uuid, group_path_word, chapter_uuid);
    
    // 获取应用资源目录
    let resource_dir = app_handle
        .path()
        .resource_dir()
        .map_err(|e| format!("获取资源目录失败: {}", e))?;
    
    let chapter_path = resource_dir
        .join("downloads")
        .join("manga")
        .join(&manga_uuid)
        .join(&group_path_word)
        .join(&chapter_uuid);
    
    // 检查章节目录是否存在
    if !chapter_path.exists() {
        return Ok(DeleteChapterResult {
            success: false,
            message: "章节文件夹不存在".to_string(),
        });
    }
    
    // 递归删除整个章节目录
    match fs::remove_dir_all(&chapter_path).await {
        Ok(_) => {
            println!("成功删除章节目录: {}", chapter_path.display());
            Ok(DeleteChapterResult {
                success: true,
                message: "章节删除成功".to_string(),
            })
        }
        Err(e) => {
            let error_msg = format!("删除章节目录失败: {}", e);
            println!("{}", error_msg);
            Err(error_msg)
        }
    }
}

#[tauri::command]
pub async fn get_downloaded_manga_list(
    app_handle: AppHandle,
) -> Result<Vec<DownloadedMangaInfo>, String> {
    println!("开始获取已下载的漫画列表");
    
    // 获取应用资源目录
    let resource_dir = app_handle
        .path()
        .resource_dir()
        .map_err(|e| format!("获取资源目录失败: {}", e))?;
    
    let download_dir = resource_dir.join("downloads").join("manga");
    
    // 检查下载目录是否存在
    if !download_dir.exists() {
        println!("下载目录不存在: {}", download_dir.display());
        return Ok(Vec::new());
    }
    
    let mut manga_list = Vec::new();
    
    // 读取下载目录中的所有漫画文件夹
    let mut entries = fs::read_dir(&download_dir).await
        .map_err(|e| format!("读取下载目录失败: {}", e))?;
    
    while let Some(entry) = entries.next_entry().await
        .map_err(|e| format!("读取目录项失败: {}", e))? {
        
        let manga_path = entry.path();
        if !manga_path.is_dir() {
            continue;
        }
        
        let manga_uuid = manga_path.file_name()
            .and_then(|name| name.to_str())
            .unwrap_or("")
            .to_string();
        
        if manga_uuid.is_empty() {
            continue;
        }
        
        // 读取漫画详情文件
        let detail_file = manga_path.join("manga_detail.json");
        if !detail_file.exists() {
            continue;
        }
        
        match fs::read_to_string(&detail_file).await {
            Ok(content) => {
                match serde_json::from_str::<MangaDetail>(&content) {
                    Ok(detail) => {
                        // 统计已下载的章节数量
                        let chapter_count = count_downloaded_chapters(&manga_path).await;
                        
                        // 获取最新下载时间
                        let latest_download_time = get_latest_download_time(&manga_path).await;
                        
                        // 检查封面文件
                        let cover_path = find_cover_file(&manga_path).await;
                        
                        // 生成path_word（优先使用保存的path_word）
                        let path_word = detail.path_word.clone()
                            .unwrap_or_else(|| generate_path_word_from_uuid(&manga_uuid));
                        
                        let manga_info = DownloadedMangaInfo {
                            uuid: detail.uuid,
                            name: detail.name,
                            pathWord: path_word,
                            author: detail.author,
                            theme: detail.theme,
                            status: detail.status,
                            popular: detail.popular,
                            brief: detail.brief,
                            datetime_updated: detail.datetime_updated,
                            coverPath: cover_path,
                            chapterCount: chapter_count,
                            latestDownloadTime: latest_download_time,
                        };
                        
                        manga_list.push(manga_info);
                    }
                    Err(e) => {
                        println!("解析漫画详情失败 {}: {}", detail_file.display(), e);
                    }
                }
            }
            Err(e) => {
                println!("读取漫画详情文件失败 {}: {}", detail_file.display(), e);
            }
        }
    }
    
    // 按最新下载时间排序
    manga_list.sort_by(|a, b| b.latestDownloadTime.cmp(&a.latestDownloadTime));
    
    println!("找到 {} 个已下载的漫画", manga_list.len());
    Ok(manga_list)
}

// 辅助函数：统计已下载的章节数量
async fn count_downloaded_chapters(manga_path: &PathBuf) -> usize {
    let mut count = 0;
    
    if let Ok(mut entries) = fs::read_dir(manga_path).await {
        while let Ok(Some(entry)) = entries.next_entry().await {
            let group_path = entry.path();
            if group_path.is_dir() && group_path.file_name().unwrap_or_default() != "manga_detail.json" {
                if let Ok(mut group_entries) = fs::read_dir(&group_path).await {
                    while let Ok(Some(chapter_entry)) = group_entries.next_entry().await {
                        let chapter_path = chapter_entry.path();
                        if chapter_path.is_dir() {
                            // 检查是否有info.json文件
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

// 辅助函数：获取最新下载时间
async fn get_latest_download_time(manga_path: &PathBuf) -> String {
    let mut latest_time = String::new();
    
    if let Ok(mut entries) = fs::read_dir(manga_path).await {
        while let Ok(Some(entry)) = entries.next_entry().await {
            let group_path = entry.path();
            if group_path.is_dir() {
                if let Ok(mut group_entries) = fs::read_dir(&group_path).await {
                    while let Ok(Some(chapter_entry)) = group_entries.next_entry().await {
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
    
    if latest_time.is_empty() {
        chrono::Utc::now().to_rfc3339()
    } else {
        latest_time
    }
}

// 辅助函数：查找封面文件
async fn find_cover_file(manga_path: &PathBuf) -> Option<String> {
    let cover_extensions = ["jpg", "jpeg", "png", "webp", "gif"];
    
    for ext in &cover_extensions {
        let cover_file = manga_path.join(format!("cover.{}", ext));
        if cover_file.exists() {
            return cover_file.to_string_lossy().to_string().into();
        }
    }
    
    None
}

// 辅助函数：从UUID生成path_word（简化版）
fn generate_path_word_from_uuid(uuid: &str) -> String {
    // 这里是一个简化的实现，实际可能需要更复杂的逻辑
    // 或者可以在漫画详情中保存path_word
    uuid.replace("-", "").chars().take(12).collect()
}

// 辅助函数：统计章节并获取最新下载时间
async fn count_chapters_and_latest_time(manga_path: &PathBuf) -> (usize, String) {
    let chapter_count = count_downloaded_chapters(manga_path).await;
    let latest_time = get_latest_download_time(manga_path).await;
    (chapter_count, latest_time)
}

#[tauri::command]
pub async fn get_local_manga_detail(
    manga_uuid: String,
    app_handle: AppHandle,
) -> Result<serde_json::Value, String> {
    // 获取应用资源目录
    let resource_dir = app_handle
        .path()
        .resource_dir()
        .map_err(|e| format!("获取资源目录失败: {}", e))?;
    
    let manga_path = resource_dir
        .join("downloads")
        .join("manga")
        .join(&manga_uuid);
    
    // 检查漫画目录是否存在
    if !manga_path.exists() {
        return Err("漫画不存在".to_string());
    }
    
    // 读取漫画详情文件
    let detail_path = manga_path.join("manga_detail.json");
    if !detail_path.exists() {
        return Err("漫画详情文件不存在".to_string());
    }
    
    let detail_content = fs::read_to_string(&detail_path).await
        .map_err(|e| format!("读取漫画详情文件失败: {}", e))?;
    
    let manga_detail: MangaDetail = serde_json::from_str(&detail_content)
        .map_err(|e| format!("解析漫画详情失败: {}", e))?;
    
    // 查找封面图片
    let cover_path = find_cover_file(&manga_path).await;
    
    // 统计章节信息
    let (chapter_count, latest_download_time) = count_chapters_and_latest_time(&manga_path).await;
    
    let result = serde_json::json!({
        "manga_detail": manga_detail,
        "cover_path": cover_path,
        "chapter_count": chapter_count,
        "latest_download_time": latest_download_time
    });
    
    Ok(result)
}

#[tauri::command]
pub async fn get_local_manga_chapters(
    manga_uuid: String,
    app_handle: AppHandle,
) -> Result<Vec<serde_json::Value>, String> {
    // 获取应用资源目录
    let resource_dir = app_handle
        .path()
        .resource_dir()
        .map_err(|e| format!("获取资源目录失败: {}", e))?;
    
    let manga_path = resource_dir
        .join("downloads")
        .join("manga")
        .join(&manga_uuid);
    
    // 检查漫画目录是否存在
    if !manga_path.exists() {
        return Ok(Vec::new());
    }
    
    let mut chapters = Vec::new();
    
    // 遍历分组目录
    if let Ok(entries) = fs::read_dir(&manga_path).await {
        let mut entries = entries;
        while let Some(entry) = entries.next_entry().await.unwrap_or(None) {
            let path = entry.path();
            if path.is_dir() {
                let group_name = path.file_name()
                    .and_then(|n| n.to_str())
                    .unwrap_or("unknown");
                
                // 跳过非章节目录
                if group_name == "manga_detail.json" || group_name.starts_with("cover.") {
                    continue;
                }
                
                // 遍历章节目录
                if let Ok(chapter_entries) = fs::read_dir(&path).await {
                    let mut chapter_entries = chapter_entries;
                    while let Some(chapter_entry) = chapter_entries.next_entry().await.unwrap_or(None) {
                        let chapter_path = chapter_entry.path();
                        if chapter_path.is_dir() {
                            // 读取章节信息
                            let info_path = chapter_path.join("info.json");
                            if info_path.exists() {
                                if let Ok(info_content) = fs::read_to_string(&info_path).await {
                                    if let Ok(chapter_info) = serde_json::from_str::<ChapterInfo>(&info_content) {
                                        // 统计图片数量
                                        let image_count = count_images_in_directory(&chapter_path).await;
                                        
                                        let chapter = serde_json::json!({
                                            "uuid": chapter_info.chapter_uuid,
                                            "name": chapter_info.chapter_name,
                                            "group": group_name,
                                            "imageCount": image_count,
                                            "downloadTime": chapter_info.download_time
                                        });
                                        
                                        chapters.push(chapter);
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    
    // 按下载时间排序
    chapters.sort_by(|a, b| {
        let time_a = a.get("downloadTime").and_then(|v| v.as_str()).unwrap_or("");
        let time_b = b.get("downloadTime").and_then(|v| v.as_str()).unwrap_or("");
        time_b.cmp(time_a)
    });
    
    Ok(chapters)
}

// 统计目录中的图片数量
async fn count_images_in_directory(dir_path: &std::path::Path) -> usize {
    let mut count = 0;
    if let Ok(entries) = fs::read_dir(dir_path).await {
        let mut entries = entries;
        while let Some(entry) = entries.next_entry().await.unwrap_or(None) {
            let path = entry.path();
            if path.is_file() {
                if let Some(extension) = path.extension().and_then(|ext| ext.to_str()) {
                    match extension.to_lowercase().as_str() {
                        "jpg" | "jpeg" | "png" | "webp" | "gif" => count += 1,
                        _ => {}
                    }
                }
            }
        }
    }
    count
}
