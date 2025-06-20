#![cfg_attr(windows, windows_subsystem = "windows")]
use axum::{routing::any, Router};
use reqwest::Client;
use std::net::SocketAddr;
use std::sync::{Arc, Mutex};
use tauri::AppHandle;
use tokio_util::sync::CancellationToken;

mod cache;
mod download;
mod proxy;

// 全局状态跟踪服务器是否已启动和取消令牌
static SERVER_STARTED: Mutex<bool> = Mutex::new(false);
static CANCELLATION_TOKEN: Mutex<Option<CancellationToken>> = Mutex::new(None);

#[tauri::command]
fn open_browser(url: String) {
    tauri_plugin_opener::open_url(&url, None::<&str>).unwrap();
}

#[tauri::command]
async fn start_proxy_server(app_handle: AppHandle) -> Result<String, String> {
    // 检查服务器是否已经启动
    {
        let started = SERVER_STARTED.lock().unwrap();
        if *started {
            return Ok("代理服务器已经在运行".to_string());
        }
    }

    // 创建新的取消令牌
    let token = CancellationToken::new();
    {
        let mut cancellation_token = CANCELLATION_TOKEN.lock().unwrap();
        *cancellation_token = Some(token.clone());
    }

    // 标记服务器为启动状态
    {
        let mut started = SERVER_STARTED.lock().unwrap();
        *started = true;
    }

    // 在新的任务中启动代理服务器
    let app_handle_clone = app_handle.clone();
    tokio::spawn(async move {
        match start_proxy(app_handle_clone, token).await {
            Ok(_) => {
                println!("代理服务器正常关闭");
            }
            Err(e) => {
                eprintln!("代理服务器错误: {}", e);
            }
        }

        // 重置状态
        {
            let mut started = SERVER_STARTED.lock().unwrap();
            *started = false;
        }
        {
            let mut cancellation_token = CANCELLATION_TOKEN.lock().unwrap();
            *cancellation_token = None;
        }
    });

    Ok("代理服务器启动成功".to_string())
}

#[tauri::command]
async fn stop_proxy_server() -> Result<String, String> {
    // 检查服务器是否在运行
    {
        let started = SERVER_STARTED.lock().unwrap();
        if !*started {
            return Ok("代理服务器未在运行".to_string());
        }
    }

    // 发送取消信号
    {
        let cancellation_token = CANCELLATION_TOKEN.lock().unwrap();
        if let Some(token) = cancellation_token.as_ref() {
            token.cancel();
            println!("已发送停止信号到代理服务器");
        }
    }

    // 等待一段时间让服务器优雅关闭
    tokio::time::sleep(tokio::time::Duration::from_millis(1000)).await;

    Ok("代理服务器停止信号已发送".to_string())
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
        .invoke_handler(tauri::generate_handler![
            open_browser,
            start_proxy_server,
            stop_proxy_server,
            cache::get_webview_data_dir,
            cache::clear_webview_cache,
            cache::get_cache_size,
            cache::open_file_explorer,
            cache::force_clear_webview_cache,
            download::download_chapter,
            download::pause_chapter_download,
            download::resume_chapter_download,
            download::check_incomplete_download,
            download::check_chapter_download_detail,
            download::get_download_progress,
            download::get_downloaded_chapter_info,
            download::get_local_chapter_images,
            download::delete_downloaded_chapter,
            download::get_downloaded_manga_list,
            download::get_local_manga_detail,
            download::get_local_manga_chapters,
            download::download_cartoon_chapter,
            download::pause_cartoon_download,
            download::resume_cartoon_download,
            download::check_incomplete_cartoon_download,
            download::get_cartoon_download_progress,
            download::delete_downloaded_cartoon_chapter,
            download::get_downloaded_cartoon_list,
            download::get_local_cartoon_detail,
            download::get_local_cartoon_chapters,
            download::open_local_video_directory,
            download::debug_find_downloaded_files
        ])
        .setup(|_app| {
            println!("Tauri 应用已启动，等待前端初始化配置文件...");
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

async fn start_proxy(
    app_handle: AppHandle,
    cancellation_token: CancellationToken,
) -> Result<(), String> {
    println!("正在启动Rust代理服务器...");

    let domain = match proxy::get_current_api_domain_with_retry(&app_handle).await {
        Ok(domain) => {
            println!("成功获取API域名: {}", domain);
            domain
        }
        Err(e) => {
            eprintln!("获取API域名失败: {}", e);
            return Err(format!("获取API域名失败: {}", e));
        }
    };

    let port = match proxy::get_server_port_with_retry(&app_handle).await {
        Ok(port) => {
            println!("成功获取服务器端口: {}", port);
            port
        }
        Err(e) => {
            eprintln!("获取服务器端口失败: {}", e);
            return Err(format!("获取服务器端口失败: {}", e));
        }
    };

    let client = Arc::new(
        Client::builder()
            .timeout(std::time::Duration::from_secs(proxy::REQUEST_TIMEOUT_SECS))
            .build()
            .unwrap(),
    );
    let app = Router::new()
        .route("/proxy", any(proxy::proxy_handler))
        .route("/proxy/*path", any(proxy::proxy_handler))
        .with_state((client, domain, app_handle.clone()));

    let addr = SocketAddr::from(([127, 0, 0, 1], port));
    println!("Rust 代理服务器运行在 http://{}", addr);

    match tokio::net::TcpListener::bind(addr).await {
        Ok(listener) => {
            println!("代理服务器成功绑定到端口 {}", port);

            // 使用 with_graceful_shutdown 来支持优雅关闭
            match axum::serve(listener, app)
                .with_graceful_shutdown(async move {
                    cancellation_token.cancelled().await;
                    println!("收到停止信号，正在优雅关闭代理服务器...");
                })
                .await
            {
                Ok(_) => {
                    println!("代理服务器已优雅关闭");
                    Ok(())
                }
                Err(e) => {
                    eprintln!("代理服务器运行出错: {}", e);
                    Err(format!("代理服务器运行出错: {}", e))
                }
            }
        }
        Err(e) => {
            if e.kind() == std::io::ErrorKind::AddrInUse {
                let msg = format!("端口 {} 已被占用，可能服务器已在运行", port);
                println!("{}", msg);
                return Err(msg);
            } else {
                let msg = format!("无法绑定到端口 {}: {}", port, e);
                eprintln!("{}", msg);
                return Err(msg);
            }
        }
    }
}
