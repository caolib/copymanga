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
use serde::{Deserialize, Serialize};
use std::fs;
use std::net::SocketAddr;
use std::sync::Arc;
use tauri::{AppHandle, Manager};

#[tauri::command]
fn open_browser(url: String) {
    tauri_plugin_opener::open_url(&url, None::<&str>).unwrap();
}

#[derive(Serialize, Deserialize)]
struct ServerConfig {
    #[serde(rename = "serverPort")]
    server_port: String,
}

#[derive(Serialize, Deserialize)]
struct AppConfig {
    #[serde(rename = "apiDomain")]
    api_domain: String,
}

fn get_config_port(app_handle: &AppHandle) -> Result<u16, String> {
    // 使用 Tauri 的 app_config_dir 获取应用配置目录
    let app_config_dir = app_handle.path().app_config_dir()
        .map_err(|e| format!("无法获取应用配置目录: {}", e))?;
    
    let config_file = app_config_dir.join("server.json");
    
    // 如果配置文件不存在，创建默认配置
    if !config_file.exists() {
        // 确保配置目录存在
        if let Err(e) = std::fs::create_dir_all(&app_config_dir) {
            return Err(format!("无法创建配置目录: {}", e));
        }
        
        // 创建默认配置
        let default_config = ServerConfig {
            server_port: "5001".to_string(),
        };
        
        let default_content = serde_json::to_string_pretty(&default_config)
            .map_err(|e| format!("无法序列化默认配置: {}", e))?;
        
        if let Err(e) = std::fs::write(&config_file, default_content) {
            return Err(format!("无法创建默认配置文件: {}", e));
        }
        
        println!("已创建默认配置文件: {:?}", config_file);
        return Ok(5001);
    }
    
    let content = fs::read_to_string(&config_file)
        .map_err(|e| format!("无法读取配置文件 {:?}: {}", config_file, e))?;
    
    let config: ServerConfig = serde_json::from_str(&content)
        .map_err(|e| format!("配置文件格式错误: {}", e))?;
    
    let port = config.server_port.parse::<u16>()
        .map_err(|e| format!("端口号格式错误: {}", e))?;
    
    if port == 0 {
        return Err("端口号不能为0".to_string());
    }
    
    Ok(port)
}

fn get_config_domain(app_handle: &AppHandle) -> Result<String, String> {
    // 使用 Tauri 的 app_config_dir 获取应用配置目录
    let app_config_dir = app_handle.path().app_config_dir()
        .map_err(|e| format!("无法获取应用配置目录: {}", e))?;
    
    let config_file = app_config_dir.join("copymanga.json");
    
    // 如果配置文件不存在，创建默认配置
    if !config_file.exists() {
        // 确保配置目录存在
        if let Err(e) = std::fs::create_dir_all(&app_config_dir) {
            return Err(format!("无法创建配置目录: {}", e));
        }
        
        // 创建默认配置
        let default_config = AppConfig {
            api_domain: "https://copy20.com".to_string(),
        };
        
        let default_content = serde_json::to_string_pretty(&default_config)
            .map_err(|e| format!("无法序列化默认配置: {}", e))?;
        
        if let Err(e) = std::fs::write(&config_file, default_content) {
            return Err(format!("无法创建默认配置文件: {}", e));
        }
        
        println!("已创建默认应用配置文件: {:?}", config_file);
        return Ok("https://copy20.com".to_string());
    }
    
    let content = fs::read_to_string(&config_file)
        .map_err(|e| format!("无法读取配置文件 {:?}: {}", config_file, e))?;
    
    let config: AppConfig = serde_json::from_str(&content)
        .map_err(|e| format!("配置文件格式错误: {}", e))?;
    
    Ok(config.api_domain)
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![open_browser])
        .setup(|app| {
            let app_handle = app.handle().clone();
            // 启动代理服务（tokio后台任务）
            tauri::async_runtime::spawn(async move {
                start_proxy(app_handle).await;
            });
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

// 代理服务逻辑单独封装
async fn start_proxy(app_handle: AppHandle) {
    let client = Arc::new(Client::builder().cookie_store(true).build().unwrap());
    
    // 从配置文件读取端口，必须存在
    let port = match get_config_port(&app_handle) {
        Ok(port) => port,
        Err(e) => {
            eprintln!("配置读取失败: {}", e);
            eprintln!("请在设置中配置服务器端口");
            panic!("无法启动代理服务器: {}", e);
        }
    };

    // 从配置文件读取域名，必须存在
    let domain = match get_config_domain(&app_handle) {
        Ok(domain) => domain,
        Err(e) => {
            eprintln!("域名配置读取失败: {}", e);
            eprintln!("请在设置中配置 API 域名");
            panic!("无法启动代理服务器: {}", e);
        }
    };

    println!("使用 API 域名: {}", domain);
    
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
    // 提前获取 method、headers、uri
    let method = req.method().clone();
    let headers_in = req.headers().clone();
    let uri = req.uri().clone();

    // 获取 Origin 和相关 CORS 信息
    let origin = headers_in.get("origin").and_then(|v| v.to_str().ok()).unwrap_or("");
    let allow_headers = headers_in.get("access-control-request-headers")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("authorization,content-type,accept,origin,referer,user-agent");

    // 处理 OPTIONS preflight 请求
    if method == Method::OPTIONS {
        let mut response = Response::builder().status(StatusCode::OK);
        
        // 设置 CORS 头
        if !origin.is_empty() {
            response = response
                .header("Access-Control-Allow-Origin", origin)
                .header("Access-Control-Allow-Credentials", "true");
        } else {
            response = response.header("Access-Control-Allow-Origin", "*");
        }
        response = response
            .header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS")
            .header("Access-Control-Allow-Headers", allow_headers)
            .header("Access-Control-Max-Age", "86400"); // 缓存 preflight 结果 24 小时
        
        return Ok(response.body(Body::empty()).unwrap());
    }

    // 构造目标 URL
    let path = uri.path().trim_start_matches("/proxy");
    let query = uri.query().map(|q| format!("?{}", q)).unwrap_or_default();
    let target_url = format!("{}{}{}", domain, path, query);

    // 构造请求
    let mut builder = client.request(method.clone(), &target_url);

    // 复制 headers
    let mut headers = HeaderMap::new();
    for (k, v) in headers_in.iter() {
        if k != "host" && k != "origin" && k != "content-length" {
            headers.insert(k, v.clone());
        }
    }
    headers.insert("Referer", format!("{}/", domain).parse().unwrap());
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
    
    // 设置 CORS 头
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