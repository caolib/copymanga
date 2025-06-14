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

#[tauri::command]
pub async fn download_chapter(
    manga_uuid: String,
    manga_name: String,
    group_path_word: String,
    chapter_uuid: String,
    chapter_name: String,
    images: Vec<ImageInfo>,
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
    };
    
    // 获取应用资源目录
    let resource_dir = app_handle
        .path()
        .resource_dir()
        .map_err(|e| format!("获取资源目录失败: {}", e))?;
    
    // 创建章节目录
    let chapter_path = resource_dir
        .join("downloads")
        .join("manga")
        .join(&download_info.manga_uuid)
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
    
    Ok(LocalChapterImages {
        total_count: image_paths.len(),
        images: image_paths,
    })
}
