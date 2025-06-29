#![cfg_attr(windows, windows_subsystem = "windows")]

mod cache;
mod download;

#[tauri::command]
fn open_browser(url: String) {
    tauri_plugin_opener::open_url(&url, None::<&str>).unwrap();
}

fn main() {
    tauri::Builder::default()
        .plugin(
            tauri_plugin_log::Builder::new()
                .level(log::LevelFilter::Debug)
                .target(tauri_plugin_log::Target::new(
                    tauri_plugin_log::TargetKind::Stdout,
                ))
                .build(),
        )
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .plugin(tauri_plugin_http::init())
        .invoke_handler(tauri::generate_handler![
            open_browser,
            cache::get_webview_data_dir,
            cache::get_cache_size,
            cache::open_file_explorer,
            cache::force_clear_webview_cache,
            cache::open_or_create_custom_css,
            cache::get_custom_css_content,
            download::download_chapter,
            download::pause_chapter_download,
            download::resume_chapter_download,
            download::check_incomplete_download,
            download::check_chapter_download_detail,
            download::get_download_progress,
            download::get_local_chapter_images,
            download::delete_downloaded_chapter,
            download::delete_local_manga,
            download::get_downloaded_manga_list,
            download::get_local_manga_detail,
            download::get_local_manga_chapters,
            download::download_cartoon_chapter,
            download::get_cartoon_download_progress,
            download::pause_cartoon_download,
            download::resume_cartoon_download,
            download::cancel_cartoon_download,
            download::get_downloaded_cartoon_list,
            download::get_local_cartoon_detail,
            download::get_local_cartoon_chapters,
            download::delete_downloaded_cartoon_chapter,
            download::delete_local_cartoon,
            download::open_local_video_directory,
            download::debug_find_downloaded_files,
            download::get_active_download_tasks,
            download::save_download_task,
            download::update_download_task_status,
            download::remove_download_task,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}


