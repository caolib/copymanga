#![cfg_attr(windows, windows_subsystem = "windows")]
use axum::{
    body::Body,
    extract::{Request, State},
    http::{HeaderMap, Method, StatusCode},
    response::Response,
    routing::any,
    Router,
};
use reqwest::Client;
use std::net::SocketAddr;
use std::sync::Arc;
use tauri::AppHandle;

mod config;
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
        .invoke_handler(tauri::generate_handler![open_browser])
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
    let config_manager = ConfigManager::new(app_handle).unwrap();
    let domain = config_manager.get_current_api_domain().unwrap();
    let port = config_manager.get_server_port().unwrap_or(12121);

    let client = Arc::new(
        Client::builder()
            .timeout(std::time::Duration::from_secs(120))
            .build()
            .unwrap(),
    );

    let app = Router::new()
        .route("/proxy/*path", any(proxy_handler))
        .with_state((client, domain));
    
    let addr = SocketAddr::from(([127, 0, 0, 1], port));
    println!("Rust 代理服务器运行在 http://{}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

async fn proxy_handler(
    State((client, domain)): State<(Arc<Client>, String)>,
    req: Request,
) -> Result<Response, StatusCode> {
    let method = req.method().clone();
    let headers_in = req.headers().clone();
    let uri = req.uri().clone();

    let origin = headers_in
        .get("origin")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("");

    // 处理 OPTIONS 请求
    if method == Method::OPTIONS {
        return build_cors_response(origin);
    }

    let path = uri.path().trim_start_matches("/proxy");
    let query = uri.query().map(|q| format!("?{}", q)).unwrap_or_default();
    
    // 检查是否是外部URL请求 (/proxy?url=...)
    if path.is_empty() && query.starts_with("?url=") {
        let url_param = &query[5..]; // 去掉 "?url=" 前缀
        let external_url = percent_decode(url_param);
        return handle_external_request(&client, &external_url, origin).await;
    }
    
    // 内部代理请求
    let target_url = format!("{}{}{}", domain, path, query);
    handle_internal_request(&client, method, headers_in, req, &target_url, origin).await
}

fn build_cors_response(origin: &str) -> Result<Response, StatusCode> {
    let mut response = Response::builder().status(StatusCode::OK);
    
    if !origin.is_empty() {
        response = response.header("Access-Control-Allow-Origin", origin);
    } else {
        response = response.header("Access-Control-Allow-Origin", "*");
    }
    
    response = response
        .header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS")
        .header("Access-Control-Allow-Headers", "authorization,content-type,accept,origin,referer,user-agent")
        .header("Access-Control-Max-Age", "86400");
    
    Ok(response.body(Body::empty()).unwrap())
}

async fn handle_external_request(
    client: &Client,
    external_url: &str,
    origin: &str,
) -> Result<Response, StatusCode> {
    let resp = client
        .get(external_url)
        .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
        .send()
        .await
        .map_err(|_| StatusCode::BAD_GATEWAY)?;

    build_response(resp, origin).await
}

async fn handle_internal_request(
    client: &Client,
    method: Method,
    headers_in: HeaderMap,
    req: Request,
    target_url: &str,
    origin: &str,
) -> Result<Response, StatusCode> {
    let mut builder = client.request(method.clone(), target_url);

    // 复制headers，过滤不需要的
    let mut headers = HeaderMap::new();
    for (k, v) in headers_in.iter() {
        if !["host", "origin", "content-length"].contains(&k.as_str()) {
            headers.insert(k, v.clone());
        }
    }
    builder = builder.headers(headers);

    // 复制body
    let bytes = axum::body::to_bytes(req.into_body(), usize::MAX).await.unwrap_or_default();
    if method != Method::GET && !bytes.is_empty() {
        builder = builder.body(bytes);
    }

    let resp = builder.send().await.map_err(|_| StatusCode::BAD_GATEWAY)?;
    build_response(resp, origin).await
}

async fn build_response(resp: reqwest::Response, origin: &str) -> Result<Response, StatusCode> {
    let mut response = Response::builder().status(resp.status());
    
    // 复制响应头，过滤CORS相关的
    for (k, v) in resp.headers().iter() {
        if !["content-length", "transfer-encoding", "connection", "access-control-allow-origin"].contains(&k.as_str()) {
            response = response.header(k, v);
        }
    }
    
    // 设置CORS头（只设置一次）
    if !origin.is_empty() {
        response = response.header("Access-Control-Allow-Origin", origin);
    } else {
        response = response.header("Access-Control-Allow-Origin", "*");
    }
    
    let body = resp.bytes().await.unwrap_or_default();
    Ok(response.body(Body::from(body)).unwrap())
}

// 简单的URL解码
fn percent_decode(input: &str) -> String {
    input
        .replace("%3A", ":")
        .replace("%2F", "/")
        .replace("%3F", "?")
        .replace("%3D", "=")
        .replace("%26", "&")
        .replace("%2E", ".")
        .replace("%2D", "-")
        .replace("%5F", "_")
        .replace("%7E", "~")
}
