use std::path::PathBuf;
use std::collections::HashMap;
use std::sync::Arc;
use tauri::{AppHandle, Manager};
use tokio::fs;
use tokio::io::AsyncWriteExt;
use tokio::sync::Mutex;
use serde_json::{json, Value};
use crate::download::types::*;
use crate::download::manga::{get_filename_from_url, get_extension_from_filename, download_image};

// 全局进度跟踪器
use std::sync::OnceLock;
static DOWNLOAD_PROGRESS: OnceLock<Arc<Mutex<HashMap<String, CartoonProgressTracker>>>> = OnceLock::new();

fn get_progress_tracker() -> &'static Arc<Mutex<HashMap<String, CartoonProgressTracker>>> {
    DOWNLOAD_PROGRESS.get_or_init(|| Arc::new(Mutex::new(HashMap::new())))
}

// ========== 动画下载相关代码 ==========

#[tauri::command]
pub async fn download_cartoon_chapter(
    cartoon_uuid: String,
    cartoon_name: String,
    chapter_uuid: String,
    chapter_name: String,
    video_url: String,
    cover: String,
    cartoon_detail: Option<CartoonDetail>,
    app_handle: AppHandle,
) -> Result<CartoonDownloadResult, String> {
    println!("开始下载动画章节: {}", chapter_name);

    let download_info = CartoonDownloadInfo {
        cartoon_uuid: cartoon_uuid.clone(),
        cartoon_name: cartoon_name.clone(),
        chapter_uuid: chapter_uuid.clone(),
        chapter_name: chapter_name.clone(),
        video_url,
        cover: cover.clone(),
        cartoon_detail: cartoon_detail.clone(),
    };

    // 获取应用资源目录
    let resource_dir = app_handle
        .path()
        .resource_dir()
        .map_err(|e| format!("获取资源目录失败: {}", e))?;

    // 创建动画目录 - 使用 cartoons 而不是 anime
    let cartoon_path = resource_dir
        .join("downloads")
        .join("cartoons")
        .join(&download_info.cartoon_uuid);

    // 确保动画目录存在
    if let Err(e) = fs::create_dir_all(&cartoon_path).await {
        return Err(format!("创建动画目录失败: {}", e));
    }

    // 保存动画详情JSON文件和下载封面图片（如果提供了cartoon_detail）
    if let Some(ref detail) = cartoon_detail {
        // 保存动画详情JSON文件
        let cartoon_detail_path = cartoon_path.join("cartoon_detail.json");
        let detail_content = serde_json::to_string_pretty(detail)
            .map_err(|e| format!("序列化动画详情失败: {}", e))?;

        if let Err(e) = fs::write(&cartoon_detail_path, detail_content).await {
            return Err(format!("写入动画详情失败: {}", e));
        }

        // 下载封面图片
        if !detail.cover.is_empty() {
            let cover_filename = get_filename_from_url(&detail.cover);
            let cover_path = cartoon_path.join(format!("cover.{}", get_extension_from_filename(&cover_filename)));    

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
    let chapter_path = cartoon_path.join(&download_info.chapter_uuid);

    println!("下载路径: {}", chapter_path.display());

    // 确保目录存在
    if let Err(e) = fs::create_dir_all(&chapter_path).await {
        return Err(format!("创建目录失败: {}", e));
    }

    // 下载视频文件
    let video_filename = format!("{}.mp4", &download_info.chapter_name);
    let video_path = chapter_path.join(&video_filename);

    // 检查视频文件是否已存在
    if video_path.exists() {
        println!("视频文件已存在，跳过下载: {}", video_path.display());

        // 创建章节信息文件
        let chapter_info = CartoonChapterInfo {
            cartoon_uuid: download_info.cartoon_uuid.clone(),
            cartoon_name: download_info.cartoon_name.clone(),
            chapter_uuid: download_info.chapter_uuid.clone(),
            chapter_name: download_info.chapter_name.clone(),
            video_file: video_filename.clone(),
            file_size: 0, // 已存在文件，暂不获取大小
            download_time: chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string(),
        };

        let info_content = serde_json::to_string_pretty(&chapter_info)
            .map_err(|e| format!("序列化章节信息失败: {}", e))?;

        let info_path = chapter_path.join("info.json");
        if let Err(e) = fs::write(&info_path, info_content).await {
            return Err(format!("写入章节信息失败: {}", e));
        }

        return Ok(CartoonDownloadResult {
            success: true,
            message: format!("章节 \"{}\" 已存在", download_info.chapter_name),
            file_path: video_path.to_string_lossy().to_string(),
        });
    }    // 创建HTTP客户端
    let client = reqwest::Client::builder()
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
        .timeout(std::time::Duration::from_secs(300)) // 5分钟超时
        .build()
        .map_err(|e| format!("创建HTTP客户端失败: {}", e))?;

    // 初始化下载进度跟踪
    let progress_key = format!("{}_{}", cartoon_uuid, chapter_uuid);
    {
        let tracker = get_progress_tracker();
        let mut progress_map = tracker.lock().await;
        progress_map.insert(progress_key.clone(), CartoonProgressTracker {
            current_segment: 0,
            total_segments: 0,
            downloaded_bytes: 0,
            total_bytes: 0,
            percent: 0.0,
            status: "starting".to_string(),
            current_file: "准备下载...".to_string(),
        });
    }

    // 下载视频文件
    println!("开始下载视频: {}", download_info.video_url);
    match download_video(&client, &download_info.video_url, &video_path, &progress_key).await {
        Ok(file_size) => {
            println!("视频下载成功: {} ({}MB)", video_path.display(), file_size / 1024 / 1024);

            // 创建章节信息文件
            let chapter_info = CartoonChapterInfo {
                cartoon_uuid: download_info.cartoon_uuid.clone(),
                cartoon_name: download_info.cartoon_name.clone(),
                chapter_uuid: download_info.chapter_uuid.clone(),
                chapter_name: download_info.chapter_name.clone(),
                video_file: video_filename,
                file_size,
                download_time: chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string(),
            };

            let info_content = serde_json::to_string_pretty(&chapter_info)
                .map_err(|e| format!("序列化章节信息失败: {}", e))?;            let info_path = chapter_path.join("info.json");
            if let Err(e) = fs::write(&info_path, info_content).await {
                return Err(format!("写入章节信息失败: {}", e));
            }

            // 清理进度跟踪器
            {
                let tracker = get_progress_tracker();
                let mut progress_map = tracker.lock().await;
                progress_map.remove(&progress_key);
            }

            Ok(CartoonDownloadResult {
                success: true,
                message: format!("章节 \"{}\" 下载完成", download_info.chapter_name),
                file_path: video_path.to_string_lossy().to_string(),
            })
        }
        Err(e) => {
            println!("视频下载失败: {} - {}", download_info.video_url, e);
            
            // 清理进度跟踪器
            {
                let tracker = get_progress_tracker();
                let mut progress_map = tracker.lock().await;
                progress_map.remove(&progress_key);
            }
            
            Err(format!("视频下载失败: {}", e))
        }
    }
}

// 下载视频文件
async fn download_video(
    client: &reqwest::Client,
    url: &str,
    save_path: &PathBuf,
    progress_key: &str,
) -> Result<u64, String> {
    // 检查是否是HLS流（m3u8文件）
    if url.ends_with(".m3u8") {
        return download_hls_stream(client, url, save_path, progress_key).await;
    }

    // 普通视频文件下载
    let response = client
        .get(url)
        .send()
        .await
        .map_err(|e| format!("请求失败: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("HTTP状态错误: {}", response.status()));
    }

    let mut file = fs::File::create(save_path)
        .await
        .map_err(|e| format!("创建文件失败: {}", e))?;

    // 直接读取所有字节数据
    let bytes = response.bytes().await.map_err(|e| format!("读取响应数据失败: {}", e))?;

    file.write_all(&bytes)
        .await
        .map_err(|e| format!("写入文件失败: {}", e))?;

    let downloaded = bytes.len() as u64;

    file.flush().await.map_err(|e| format!("刷新文件失败: {}", e))?;

    Ok(downloaded)
}

// 下载HLS流
async fn download_hls_stream(
    client: &reqwest::Client,
    m3u8_url: &str,
    save_path: &PathBuf,
    progress_key: &str,
) -> Result<u64, String> {
    println!("检测到HLS流，开始解析m3u8文件: {}", m3u8_url);

    // 获取m3u8文件内容
    let response = client
        .get(m3u8_url)
        .send()
        .await
        .map_err(|e| format!("请求m3u8文件失败: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("HTTP状态错误: {}", response.status()));
    }

    let m3u8_content = response
        .text()
        .await
        .map_err(|e| format!("读取m3u8内容失败: {}", e))?;

    // 解析m3u8文件，获取视频片段URL列表
    let base_url = get_base_url(m3u8_url);
    let segment_urls = parse_m3u8_segments(&m3u8_content, &base_url)?;

    if segment_urls.is_empty() {
        return Err("未找到视频片段".to_string());
    }

    println!("找到 {} 个视频片段", segment_urls.len());

    // 创建临时目录存储片段
    let temp_dir = save_path.parent().unwrap().join("temp_segments");
    if let Err(e) = fs::create_dir_all(&temp_dir).await {
        return Err(format!("创建临时目录失败: {}", e));
    }

    let mut total_downloaded = 0u64;
    let mut segment_files = Vec::new();    // 下载所有片段
    for (index, url) in segment_urls.iter().enumerate() {
        let segment_path = temp_dir.join(format!("segment_{:04}.ts", index));

        // 更新进度
        {
            let tracker = get_progress_tracker();
            let mut progress_map = tracker.lock().await;
            if let Some(progress) = progress_map.get_mut(progress_key) {
                progress.current_segment = index + 1;
                progress.total_segments = segment_urls.len();
                progress.percent = (index as f64 / segment_urls.len() as f64) * 80.0; // 80%用于下载，20%用于合并
                progress.status = "downloading".to_string();
                progress.current_file = format!("下载片段 {}/{}", index + 1, segment_urls.len());
            }
        }

        println!("下载片段 {}/{}: {}", index + 1, segment_urls.len(), url);

        let segment_response = client
            .get(url)
            .send()
            .await
            .map_err(|e| format!("下载片段{}失败: {}", index, e))?;

        if !segment_response.status().is_success() {
            return Err(format!("片段{}下载失败，HTTP状态: {}", index, segment_response.status()));
        }

        let segment_data = segment_response
            .bytes()
            .await
            .map_err(|e| format!("读取片段{}数据失败: {}", index, e))?;

        fs::write(&segment_path, &segment_data)
            .await
            .map_err(|e| format!("写入片段{}失败: {}", index, e))?;

        total_downloaded += segment_data.len() as u64;
        segment_files.push(segment_path);

        // 更新下载字节数
        {
            let tracker = get_progress_tracker();
            let mut progress_map = tracker.lock().await;
            if let Some(progress) = progress_map.get_mut(progress_key) {
                progress.downloaded_bytes = total_downloaded;
            }
        }
    }    // 合并所有片段为单个视频文件
    println!("合并视频片段...");
    
    // 更新进度为合并阶段
    {
        let tracker = get_progress_tracker();
        let mut progress_map = tracker.lock().await;
        if let Some(progress) = progress_map.get_mut(progress_key) {
            progress.percent = 80.0;
            progress.status = "merging".to_string();
            progress.current_file = "正在合并视频片段...".to_string();
        }
    }

    let mut output_file = fs::File::create(save_path)
        .await
        .map_err(|e| format!("创建输出文件失败: {}", e))?;

    for (index, segment_file) in segment_files.iter().enumerate() {
        let segment_data = fs::read(segment_file)
            .await
            .map_err(|e| format!("读取片段文件失败: {}", e))?;

        output_file.write_all(&segment_data)
            .await
            .map_err(|e| format!("写入合并文件失败: {}", e))?;

        // 更新合并进度
        {
            let tracker = get_progress_tracker();
            let mut progress_map = tracker.lock().await;
            if let Some(progress) = progress_map.get_mut(progress_key) {
                let merge_progress = (index as f64 / segment_files.len() as f64) * 20.0;
                progress.percent = 80.0 + merge_progress;
                progress.current_file = format!("合并片段 {}/{}", index + 1, segment_files.len());
            }
        }
    }

    output_file.flush().await.map_err(|e| format!("刷新输出文件失败: {}", e))?;

    // 更新为完成状态
    {
        let tracker = get_progress_tracker();
        let mut progress_map = tracker.lock().await;
        if let Some(progress) = progress_map.get_mut(progress_key) {
            progress.percent = 100.0;
            progress.status = "completed".to_string();
            progress.current_file = "下载完成".to_string();
            progress.total_bytes = total_downloaded;
        }
    }

    // 清理临时文件
    for segment_file in segment_files {
        let _ = fs::remove_file(segment_file).await;
    }
    let _ = fs::remove_dir(temp_dir).await;

    println!("视频合并完成，总大小: {}MB", total_downloaded / 1024 / 1024);
    Ok(total_downloaded)
}

// 获取基础URL
fn get_base_url(url: &str) -> String {
    if let Some(last_slash) = url.rfind('/') {
        url[..last_slash + 1].to_string()
    } else {
        String::new()
    }
}

// 解析m3u8文件，提取视频片段URL
fn parse_m3u8_segments(content: &str, base_url: &str) -> Result<Vec<String>, String> {
    let mut segments = Vec::new();

    for line in content.lines() {
        let line = line.trim();

        // 跳过注释行和空行
        if line.starts_with('#') || line.is_empty() {
            continue;
        }

        // 检查是否是相对URL还是绝对URL
        let segment_url = if line.starts_with("http") {
            line.to_string()
        } else {
            format!("{}{}", base_url, line)
        };

        segments.push(segment_url);
    }    Ok(segments)
}

#[tauri::command]
pub async fn get_cartoon_download_progress(
    cartoon_uuid: String,
    chapter_uuid: String,
    app_handle: AppHandle,
) -> Result<CartoonDownloadProgress, String> {
    // 先检查进度跟踪器中是否有实时进度
    let progress_key = format!("{}_{}", cartoon_uuid, chapter_uuid);
    {
        let tracker = get_progress_tracker();
        let progress_map = tracker.lock().await;
        if let Some(progress) = progress_map.get(&progress_key) {
            return Ok(CartoonDownloadProgress {
                downloaded_size: progress.downloaded_bytes,
                total_size: progress.total_bytes,
                percent: progress.percent,
                completed: progress.status == "completed",
            });
        }
    }

    // 如果进度跟踪器中没有，检查是否已完成下载
    let resource_dir = app_handle
        .path()
        .resource_dir()
        .map_err(|e| format!("获取资源目录失败: {}", e))?;

    // 检查两个可能的路径：新的 cartoons 和旧的 anime（向后兼容）
    let possible_paths = vec![
        resource_dir.join("downloads").join("cartoons").join(&cartoon_uuid).join(&chapter_uuid),
        resource_dir.join("downloads").join("anime").join(&cartoon_uuid).join(&chapter_uuid),
    ];

    for chapter_path in possible_paths {
        let info_path = chapter_path.join("info.json");
        if info_path.exists() {
            if let Ok(content) = fs::read_to_string(&info_path).await {
                if let Ok(chapter_info) = serde_json::from_str::<CartoonChapterInfo>(&content) {
                    return Ok(CartoonDownloadProgress {
                        downloaded_size: chapter_info.file_size,
                        total_size: chapter_info.file_size,
                        percent: 100.0,
                        completed: true,
                    });
                }
            }
        }
    }

    // 如果都没有，返回未开始状态
    Ok(CartoonDownloadProgress {
        downloaded_size: 0,
        total_size: 0,
        percent: 0.0,
        completed: false,
    })
}

#[tauri::command]
pub async fn delete_downloaded_cartoon_chapter(
    cartoon_uuid: String,
    chapter_uuid: String,
    app_handle: AppHandle,
) -> Result<DeleteChapterResult, String> {
    // 获取应用资源目录
    let resource_dir = app_handle
        .path()
        .resource_dir()
        .map_err(|e| format!("获取资源目录失败: {}", e))?;

    // 检查两个可能的路径：新的 cartoons 和旧的 anime（向后兼容）
    let possible_paths = vec![
        resource_dir.join("downloads").join("cartoons").join(&cartoon_uuid).join(&chapter_uuid),
        resource_dir.join("downloads").join("anime").join(&cartoon_uuid).join(&chapter_uuid),
    ];

    for chapter_path in possible_paths {
        if chapter_path.exists() {
            // 删除整个章节目录
            fs::remove_dir_all(&chapter_path)
                .await
                .map_err(|e| format!("删除章节目录失败: {}", e))?;

            return Ok(DeleteChapterResult {
                success: true,
                message: "章节删除成功".to_string(),
            });
        }
    }

    Err("章节不存在".to_string())
}

#[tauri::command]
pub async fn get_downloaded_cartoon_list(
    app_handle: AppHandle,
) -> Result<Vec<DownloadedCartoonInfo>, String> {
    println!("开始获取已下载的动画列表");

    // 获取应用资源目录
    let resource_dir = app_handle
        .path()
        .resource_dir()
        .map_err(|e| format!("获取资源目录失败: {}", e))?;

    let mut cartoon_list = Vec::new();

    // 检查两个可能的下载目录：新的 cartoons 和旧的 anime（向后兼容）
    let download_dirs = vec![
        resource_dir.join("downloads").join("cartoons"),
        resource_dir.join("downloads").join("anime"),
    ];

    for download_dir in download_dirs {
        if !download_dir.exists() {
            continue;
        }

        // 读取下载目录中的所有动画文件夹
        let mut entries = fs::read_dir(&download_dir).await
            .map_err(|e| format!("读取下载目录失败: {}", e))?;

        while let Some(entry) = entries.next_entry().await
            .map_err(|e| format!("读取目录项失败: {}", e))? {

            let cartoon_path = entry.path();
            if !cartoon_path.is_dir() {
                continue;
            }

            let cartoon_uuid = cartoon_path.file_name()
                .and_then(|name| name.to_str())
                .unwrap_or("")
                .to_string();

            if cartoon_uuid.is_empty() {
                continue;
            }

            // 避免重复添加同一个动画（如果在两个目录都存在）
            if cartoon_list.iter().any(|info: &DownloadedCartoonInfo| info.uuid == cartoon_uuid) {
                continue;
            }

            // 读取动画详情文件
            let detail_file = cartoon_path.join("cartoon_detail.json");
            if !detail_file.exists() {
                continue;
            }

            match fs::read_to_string(&detail_file).await {
                Ok(content) => {
                    match serde_json::from_str::<CartoonDetail>(&content) {
                        Ok(detail) => {
                            // 统计已下载的章节数量
                            let chapter_count = count_downloaded_cartoon_chapters(&cartoon_path).await;

                            // 获取最新下载时间
                            let latest_download_time = get_latest_cartoon_download_time(&cartoon_path).await;

                            // 检查封面文件
                            let cover_path = find_cartoon_cover_file(&cartoon_path).await;

                            let cartoon_info = DownloadedCartoonInfo {
                                uuid: detail.uuid,
                                name: detail.name,
                                pathWord: detail.path_word,
                                company: detail.company,
                                theme: detail.theme,
                                cartoon_type: detail.cartoon_type,
                                category: detail.category,
                                grade: detail.grade,
                                popular: detail.popular,
                                brief: detail.brief,
                                years: detail.years,
                                datetime_updated: detail.datetime_updated,
                                coverPath: cover_path,
                                chapterCount: chapter_count,
                                latestDownloadTime: latest_download_time,
                            };

                            cartoon_list.push(cartoon_info);
                        }
                        Err(e) => {
                            println!("解析动画详情失败 {}: {}", detail_file.display(), e);
                        }
                    }
                }
                Err(e) => {
                    println!("读取动画详情文件失败 {}: {}", detail_file.display(), e);
                }
            }
        }
    }

    // 按最新下载时间排序
    cartoon_list.sort_by(|a, b| b.latestDownloadTime.cmp(&a.latestDownloadTime));

    println!("找到 {} 个已下载的动画", cartoon_list.len());
    Ok(cartoon_list)
}

// 统计已下载的动画章节数量
async fn count_downloaded_cartoon_chapters(cartoon_path: &PathBuf) -> usize {
    let mut count = 0;

    if let Ok(mut entries) = fs::read_dir(cartoon_path).await {
        while let Ok(Some(entry)) = entries.next_entry().await {
            let chapter_path = entry.path();
            if chapter_path.is_dir() &&
               chapter_path.file_name().unwrap_or_default() != "cartoon_detail.json" {
                // 检查是否有info.json文件
                let info_file = chapter_path.join("info.json");
                if info_file.exists() {
                    count += 1;
                }
            }
        }
    }

    count
}

// 获取最新动画下载时间
async fn get_latest_cartoon_download_time(cartoon_path: &PathBuf) -> String {
    let mut latest_time = String::new();

    if let Ok(mut entries) = fs::read_dir(cartoon_path).await {
        while let Ok(Some(entry)) = entries.next_entry().await {
            let chapter_path = entry.path();
            if chapter_path.is_dir() {
                let info_file = chapter_path.join("info.json");
                if info_file.exists() {
                    if let Ok(content) = fs::read_to_string(&info_file).await {
                        if let Ok(chapter_info) = serde_json::from_str::<CartoonChapterInfo>(&content) {
                            if latest_time.is_empty() || chapter_info.download_time > latest_time {
                                latest_time = chapter_info.download_time;
                            }
                        }
                    }
                }
            }
        }
    }

    latest_time
}

// 查找动画封面文件
async fn find_cartoon_cover_file(cartoon_path: &PathBuf) -> Option<String> {
    let cover_extensions = ["jpg", "jpeg", "png", "webp"];

    for ext in &cover_extensions {
        let cover_path = cartoon_path.join(format!("cover.{}", ext));
        if cover_path.exists() {
            return Some(cover_path.to_string_lossy().to_string());
        }
    }

    None
}

// 新增本地动画管理相关函数

#[tauri::command]
pub async fn open_local_video_directory(
    app_handle: AppHandle,
    cartoon_uuid: String,
    chapter_uuid: String,
) -> Result<Value, String> {
    let resource_dir = app_handle
        .path()
        .resource_dir()
        .map_err(|e| format!("获取资源目录失败: {}", e))?;

    let chapter_path = resource_dir
        .join("downloads")
        .join("cartoons")
        .join(&cartoon_uuid)
        .join(&chapter_uuid);
    
    if !chapter_path.exists() {
        return Err("本地章节不存在".to_string());
    }
    
    // 使用系统命令打开目录
    #[cfg(target_os = "windows")]
    {
        use std::process::Command;
        let result = Command::new("explorer")
            .arg(&chapter_path)
            .status();
            
        match result {
            Ok(_) => Ok(json!({
                "success": true,
                "message": "目录打开成功"
            })),
            Err(e) => Err(format!("打开目录失败: {}", e))
        }
    }
    
    #[cfg(not(target_os = "windows"))]
    {
        Err("此功能仅支持Windows系统".to_string())
    }
}

#[tauri::command]
pub async fn get_local_cartoon_detail(
    app_handle: AppHandle,
    cartoon_uuid: String,
) -> Result<Value, String> {
    let resource_dir = app_handle
        .path()
        .resource_dir()
        .map_err(|e| format!("获取资源目录失败: {}", e))?;

    let cartoon_path = resource_dir
        .join("downloads")
        .join("cartoons")
        .join(&cartoon_uuid);

    let detail_file = cartoon_path.join("cartoon_detail.json");
    
    if !detail_file.exists() {
        return Err("动画详情文件不存在".to_string());
    }

    let content = fs::read_to_string(&detail_file).await
        .map_err(|e| format!("读取动画详情失败: {}", e))?;

    let detail: Value = serde_json::from_str(&content)
        .map_err(|e| format!("解析动画详情失败: {}", e))?;

    Ok(detail)
}

#[tauri::command]
pub async fn get_local_cartoon_chapters(
    app_handle: AppHandle,
    cartoon_uuid: String,
) -> Result<Vec<Value>, String> {
    let resource_dir = app_handle
        .path()
        .resource_dir()
        .map_err(|e| format!("获取资源目录失败: {}", e))?;

    let cartoon_path = resource_dir
        .join("downloads")
        .join("cartoons")
        .join(&cartoon_uuid);

    if !cartoon_path.exists() {
        return Ok(Vec::new());
    }

    let mut chapters = Vec::new();

    let mut entries = fs::read_dir(&cartoon_path).await
        .map_err(|e| format!("读取动画目录失败: {}", e))?;

    while let Some(entry) = entries.next_entry().await
        .map_err(|e| format!("读取目录项失败: {}", e))? {

        let chapter_path = entry.path();
        if !chapter_path.is_dir() {
            continue;
        }

        let chapter_uuid = chapter_path.file_name()
            .and_then(|name| name.to_str())
            .unwrap_or("")
            .to_string();

        if chapter_uuid == "cartoon_detail.json" || chapter_uuid.is_empty() {
            continue;
        }

        let info_file = chapter_path.join("info.json");
        if !info_file.exists() {
            continue;
        }

        match fs::read_to_string(&info_file).await {
            Ok(content) => {
                match serde_json::from_str::<Value>(&content) {
                    Ok(chapter_info) => {
                        chapters.push(chapter_info);
                    }
                    Err(e) => {
                        println!("解析章节信息失败 {}: {}", info_file.display(), e);
                    }
                }
            }
            Err(e) => {
                println!("读取章节信息失败 {}: {}", info_file.display(), e);
            }
        }
    }

    // 按章节名称排序
    chapters.sort_by(|a, b| {
        let name_a = a.get("chapter_name").and_then(|v| v.as_str()).unwrap_or("");
        let name_b = b.get("chapter_name").and_then(|v| v.as_str()).unwrap_or("");
        name_a.cmp(name_b)
    });

    Ok(chapters)
}

#[tauri::command]
pub async fn debug_find_downloaded_files(
    app_handle: AppHandle,
    cartoon_uuid: String,
) -> Result<Vec<String>, String> {
    let resource_dir = app_handle
        .path()
        .resource_dir()
        .map_err(|e| format!("获取资源目录失败: {}", e))?;

    let mut found_paths = Vec::new();

    // 递归搜索包含cartoon_uuid的目录
    fn search_recursive(dir: &PathBuf, target_uuid: &str, found: &mut Vec<String>) -> Result<(), std::io::Error> {
        if let Ok(entries) = std::fs::read_dir(dir) {
            for entry in entries {
                if let Ok(entry) = entry {
                    let path = entry.path();
                    if path.is_dir() {
                        let dir_name = path.file_name().unwrap_or_default().to_string_lossy();
                        if dir_name == target_uuid {
                            found.push(path.to_string_lossy().to_string());
                        }
                        // 递归搜索子目录
                        let _ = search_recursive(&path, target_uuid, found);
                    }
                }
            }
        }
        Ok(())
    }

    let _ = search_recursive(&resource_dir, &cartoon_uuid, &mut found_paths);

    println!("搜索动画UUID {} 的下载文件:", cartoon_uuid);
    for path in &found_paths {
        println!("  找到目录: {}", path);
    }

    Ok(found_paths)
}
