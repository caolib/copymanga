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

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .setup(|_app| {
            // 启动代理服务（tokio后台任务）
            tauri::async_runtime::spawn(async {
                start_proxy().await;
            });
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

// 代理服务逻辑单独封装
async fn start_proxy() {
    let client = Arc::new(Client::builder().cookie_store(true).build().unwrap());
    let app = Router::new()
        .route("/proxy/*path", any(proxy_handler))
        .with_state(client);

    // 端口可自定义，建议 5001，避免冲突
    let addr = SocketAddr::from(([127, 0, 0, 1], 5001));
    println!("Rust 代理服务器运行在 http://{}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

async fn proxy_handler(
    State(client): State<Arc<Client>>,
    req: Request,
) -> Result<Response, StatusCode> {
    // 提前获取 method、headers、uri
    let method = req.method().clone();
    let headers_in = req.headers().clone();
    let uri = req.uri().clone();

    // 构造目标 URL
    let path = uri.path().trim_start_matches("/proxy");
    let query = uri.query().map(|q| format!("?{}", q)).unwrap_or_default();
    let target_url = format!("https://copy20.com{}{}", path, query);

    // 构造请求
    let mut builder = client.request(method.clone(), &target_url);

    // 复制 headers
    let mut headers = HeaderMap::new();
    for (k, v) in headers_in.iter() {
        if k != "host" && k != "origin" && k != "content-length" {
            headers.insert(k, v.clone());
        }
    }
    headers.insert("Referer", "https://copy20.com/".parse().unwrap());
    headers.insert("Cache-Control", "no-cache".parse().unwrap());
    headers.insert("Pragma", "no-cache".parse().unwrap());
    builder = builder.headers(headers);

    // 复制 body（最后才 into_body）
    let bytes = axum::body::to_bytes(req.into_body(), usize::MAX).await.unwrap_or_default();
    if method != Method::GET {
        builder = builder.body(bytes);
    }

    // 发起请求
    let resp = builder.send().await.map_err(|_| StatusCode::BAD_GATEWAY)?;

    // 获取 Origin
    let origin = headers_in.get("origin").and_then(|v| v.to_str().ok()).unwrap_or("");
    // 获取 Access-Control-Request-Headers
    let allow_headers = headers_in.get("access-control-request-headers")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("authorization,content-type,accept,origin,referer,user-agent");

    // 构造响应
    let mut response = Response::builder().status(resp.status());
    for (k, v) in resp.headers().iter() {
        if !["content-length", "transfer-encoding", "connection", "set-cookie"].contains(&k.as_str()) {
            response = response.header(k, v);
        }
    }
    // set-cookie 单独处理
    if let Some(set_cookie) = resp.headers().get_all("set-cookie").iter().next() {
        response = response.header("set-cookie", set_cookie);
    }
    // CORS 头：带 credentials 时不能用 *，要返回 Origin
    if !origin.is_empty() {
        response = response
            .header("Access-Control-Allow-Origin", origin)
            .header("Access-Control-Allow-Credentials", "true");
    } else {
        response = response.header("Access-Control-Allow-Origin", "*");
    }
    response = response
        .header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS")
        .header("Access-Control-Allow-Headers", allow_headers);
    let body = resp.bytes().await.unwrap_or_default();
    Ok(response.body(Body::from(body)).unwrap())
}