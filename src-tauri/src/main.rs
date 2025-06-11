#![cfg_attr(windows, windows_subsystem = "windows")]
use axum::{routing::any, Router};
use reqwest::Client;
use std::net::SocketAddr;
use std::sync::Arc;
use tauri::AppHandle;

mod cache;
mod config;
mod proxy;
use config::ConfigManager;

#[tauri::command]
fn open_browser(url: String) {
    tauri_plugin_opener::open_url(&url, None::<&str>).unwrap();
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            open_browser,
            cache::get_webview_data_dir,
            cache::clear_webview_cache,
            cache::get_cache_size,
            cache::open_file_explorer,
            cache::force_clear_webview_cache
        ])
        .setup(|app| {
            let app_handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                start_proxy(app_handle).await;
            });
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

async fn start_proxy(app_handle: AppHandle) {
    let config_manager = ConfigManager::new(app_handle);
    let domain = config_manager.get_current_api_domain().unwrap();
    let port = config_manager.get_server_port().unwrap_or(12121);

    let client = Arc::new(
        Client::builder()
            .timeout(std::time::Duration::from_secs(120))
            .build()
            .unwrap(),
    );
    let app = Router::new()
        .route("/proxy", any(proxy::proxy_handler))
        .route("/proxy/*path", any(proxy::proxy_handler))
        .with_state((client, domain));

    let addr = SocketAddr::from(([127, 0, 0, 1], port));
    println!("Rust 代理服务器运行在 http://{}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
