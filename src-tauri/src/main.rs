#![cfg_attr(windows, windows_subsystem = "windows")]
use axum::{routing::any, Router};
use reqwest::Client;
use std::net::SocketAddr;
use std::sync::{Arc, Mutex};
use tauri::AppHandle;

mod cache;
mod proxy;
mod download;

// 全局状态跟踪服务器是否已启动
static SERVER_STARTED: Mutex<bool> = Mutex::new(false);

#[tauri::command]
fn open_browser(url: String) {
    tauri_plugin_opener::open_url(&url, None::<&str>).unwrap();
}

#[tauri::command]
async fn start_proxy_server(app_handle: AppHandle) -> Result<String, String> {
    // 检查服务器是否已经启动
    {
        let mut started = SERVER_STARTED.lock().unwrap();
        if *started {
            return Ok("代理服务器已经在运行".to_string());
        }
        *started = true;
    }
    
    match start_proxy(app_handle).await {
        Ok(_) => Ok("代理服务器启动成功".to_string()),
        Err(e) => {
            // 重置状态，允许重新启动
            *SERVER_STARTED.lock().unwrap() = false;
            Err(e)
        }
    }
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            open_browser,
            start_proxy_server,
            cache::get_webview_data_dir,
            cache::clear_webview_cache,
            cache::get_cache_size,
            cache::open_file_explorer,
            cache::force_clear_webview_cache,
            download::download_chapter,
            download::check_chapter_downloaded,
            download::get_downloaded_chapter_info,
            download::get_local_chapter_images,
            download::delete_downloaded_chapter
        ])
        .setup(|_app| {
            println!("Tauri 应用已启动，等待前端初始化配置文件...");
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

async fn start_proxy(app_handle: AppHandle) -> Result<(), String> {
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
            if let Err(e) = axum::serve(listener, app).await {
                eprintln!("代理服务器运行出错: {}", e);
                return Err(format!("代理服务器运行出错: {}", e));
            }
            Ok(())
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
