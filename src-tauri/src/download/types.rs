use serde::{Deserialize, Serialize};

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

#[derive(Debug, Serialize, Deserialize)]
pub struct ChapterInfo {
    pub manga_uuid: String,
    pub manga_name: String,
    pub group_path_word: String,
    pub chapter_uuid: String,
    pub chapter_name: String,
    pub images: Vec<String>,
    pub download_time: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DownloadProgress {
    pub completed: usize,
    pub total: usize,
    pub percent: f64,
    pub current_image: String,
    pub status: String,
}

// 动画下载进度跟踪结构体
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CartoonProgressTracker {
    pub current_segment: usize,
    pub total_segments: usize,
    pub downloaded_bytes: u64,
    pub total_bytes: u64,
    pub percent: f64,
    pub status: String, // "downloading", "merging", "completed", "error"
    pub current_file: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DownloadResult {
    pub success: bool,
    pub message: String,
    pub chapter_path: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct MangaDetail {
    pub uuid: String,
    pub name: String,
    pub path_word: String,
    pub cover: String,
    pub author: Vec<String>,
    pub theme: Vec<String>,
    pub status: String,
    pub popular: Option<i32>,
    pub brief: Option<String>,
}

// 动画相关类型
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CartoonDetail {
    pub uuid: String,
    pub name: String,
    pub path_word: String,
    pub cover: String,
    pub company: Option<String>,
    pub theme: Vec<String>,
    pub cartoon_type: Option<String>,
    pub category: Option<String>,
    pub grade: Option<String>,
    pub popular: Option<i32>,
    pub brief: Option<String>,
    pub years: Option<String>,
    pub datetime_updated: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CartoonDownloadInfo {
    pub cartoon_uuid: String,
    pub cartoon_name: String,
    pub chapter_uuid: String,
    pub chapter_name: String,
    pub video_url: String,
    pub cover: String,
    pub cartoon_detail: Option<CartoonDetail>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CartoonChapterInfo {
    pub cartoon_uuid: String,
    pub cartoon_name: String,
    pub chapter_uuid: String,
    pub chapter_name: String,
    pub video_file: String,
    pub file_size: u64,
    pub download_time: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CartoonDownloadProgress {
    pub downloaded_size: u64,
    pub total_size: u64,
    pub percent: f64,
    pub completed: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CartoonDownloadResult {
    pub success: bool,
    pub message: String,
    pub file_path: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DeleteChapterResult {
    pub success: bool,
    pub message: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DownloadedCartoonInfo {
    pub uuid: String,
    pub name: String,
    pub pathWord: String,
    pub company: Option<String>,
    pub theme: Vec<String>,
    pub cartoon_type: Option<String>,
    pub category: Option<String>,
    pub grade: Option<String>,
    pub popular: Option<i32>,
    pub brief: Option<String>,
    pub years: Option<String>,
    pub datetime_updated: Option<String>,
    pub coverPath: Option<String>,
    pub chapterCount: usize,
    pub latestDownloadTime: String,
}
