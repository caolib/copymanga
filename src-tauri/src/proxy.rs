#![allow(dead_code)]

use axum::{
    body::Body,
    extract::{Request, State},
    http::{HeaderMap, HeaderName, HeaderValue, Method, StatusCode},
    response::Response,
};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::{collections::HashMap, fs, sync::Arc};
use tauri::{AppHandle, Manager};

// ============ 常量定义 ============

/// 浏览器用户代理
const BROWSER_USER_AGENT: &str = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";

/// CORS 最大缓存时间（秒）
const CORS_MAX_AGE: &str = "86400";

/// 重试次数
const MAX_RETRY_COUNT: u32 = 10;

/// 重试间隔（毫秒）
const RETRY_DELAY_MS: u64 = 1000;

/// 请求超时时间（秒）
pub const REQUEST_TIMEOUT_SECS: u64 = 120;

/// 配置文件夹名称
const CONFIG_DIR_NAME: &str = "config";

/// 服务器配置文件名
const SERVER_CONFIG_FILE: &str = "server.json";

/// 应用配置文件名
const APP_CONFIG_FILE: &str = "copymanga.json";

// ============ 数据结构 ============

/// 请求头配置结构 - 直接使用 HashMap 存储所有请求头
#[derive(Serialize, Deserialize, Debug)]
pub struct RequestHeaders(HashMap<String, String>);

/// 服务器配置结构
#[derive(Serialize, Deserialize, Debug)]
pub struct ServerConfig {
    #[serde(rename = "serverPort")]
    pub server_port: u16, // 直接使用 u16 类型
    #[serde(rename = "requestHeaders")]
    pub request_headers: Option<RequestHeaders>,
}

/// 应用配置结构
#[derive(Serialize, Deserialize, Debug)]
pub struct AppConfig {
    #[serde(rename = "apiSources")]
    pub api_sources: Vec<String>,
    #[serde(rename = "currentApiIndex")]
    pub current_api_index: i32,
}

/// 获取服务器配置（带重试机制）
pub async fn get_server_config_with_retry(
    app_handle: &AppHandle,
) -> Result<(u16, Option<RequestHeaders>), String> {
    for attempt in 1..=MAX_RETRY_COUNT {
        match get_server_config(app_handle) {
            Ok(result) => return Ok(result),
            Err(e) => {
                if attempt == MAX_RETRY_COUNT {
                    return Err(format!(
                        "尝试{}次后仍无法读取服务器配置: {}",
                        MAX_RETRY_COUNT, e
                    ));
                }
                eprintln!(
                    "读取服务器配置失败（尝试 {}/{}）: {}",
                    attempt, MAX_RETRY_COUNT, e
                );
                tokio::time::sleep(tokio::time::Duration::from_millis(RETRY_DELAY_MS)).await;
            }
        }
    }
    unreachable!()
}

/// 获取服务器配置
pub fn get_server_config(app_handle: &AppHandle) -> Result<(u16, Option<RequestHeaders>), String> {
    let config_dir = app_handle
        .path()
        .app_data_dir()
        .unwrap_or_else(|_| {
            app_handle
                .path()
                .resource_dir()
                .unwrap()
                .join(CONFIG_DIR_NAME)
        })
        .join(CONFIG_DIR_NAME);

    let server_config_path = config_dir.join(SERVER_CONFIG_FILE);

    let content = fs::read_to_string(&server_config_path).map_err(|e| {
        format!(
            "无法读取服务器配置文件 {}: {}",
            server_config_path.display(),
            e
        )
    })?;

    let config = serde_json::from_str::<ServerConfig>(&content)
        .map_err(|e| format!("解析服务器配置文件失败: {}。请检查JSON格式是否正确", e))?;

    Ok((config.server_port, config.request_headers))
}

/// 获取服务器端口（带重试机制）
#[allow(dead_code)]
pub async fn get_server_port_with_retry(app_handle: &AppHandle) -> Result<u16, String> {
    get_server_config_with_retry(app_handle)
        .await
        .map(|(port, _)| port)
}

/// 获取服务器端口
#[allow(dead_code)]
pub fn get_server_port(app_handle: &AppHandle) -> Result<u16, String> {
    get_server_config(app_handle).map(|(port, _)| port)
}

/// 获取当前API域名（带重试机制）
#[allow(dead_code)]
pub async fn get_current_api_domain_with_retry(app_handle: &AppHandle) -> Result<String, String> {
    for attempt in 1..=MAX_RETRY_COUNT {
        match get_current_api_domain(app_handle) {
            Ok(result) => return Ok(result),
            Err(e) => {
                if attempt == MAX_RETRY_COUNT {
                    return Err(format!(
                        "尝试{}次后仍无法读取API域名: {}",
                        MAX_RETRY_COUNT, e
                    ));
                }
                eprintln!(
                    "读取API域名失败（尝试 {}/{}）: {}",
                    attempt, MAX_RETRY_COUNT, e
                );
                tokio::time::sleep(tokio::time::Duration::from_millis(RETRY_DELAY_MS)).await;
            }
        }
    }
    unreachable!()
}

/// 获取当前API域名
pub fn get_current_api_domain(app_handle: &AppHandle) -> Result<String, String> {
    let config_dir = app_handle
        .path()
        .app_data_dir()
        .unwrap_or_else(|_| {
            app_handle
                .path()
                .resource_dir()
                .unwrap()
                .join(CONFIG_DIR_NAME)
        })
        .join(CONFIG_DIR_NAME);

    let app_config_path = config_dir.join(APP_CONFIG_FILE);

    let content = fs::read_to_string(&app_config_path)
        .map_err(|e| format!("无法读取应用配置文件 {}: {}", app_config_path.display(), e))?;

    let config = serde_json::from_str::<AppConfig>(&content)
        .map_err(|e| format!("解析应用配置文件失败: {}。请检查JSON格式是否正确", e))?;

    if config.api_sources.is_empty() {
        return Err(
            "配置文件中没有API源，请确保copymanga.json包含有效的apiSources数组".to_string(),
        );
    }

    let index = if config.current_api_index >= 0
        && (config.current_api_index as usize) < config.api_sources.len()
    {
        config.current_api_index as usize
    } else {
        eprintln!(
            "警告：currentApiIndex({})超出范围，使用默认索引0",
            config.current_api_index
        );
        0
    };

    let domain = config.api_sources[index].clone();
    if domain.is_empty() {
        return Err("API域名为空，请检查配置文件中的apiSources".to_string());
    }

    Ok(domain)
}

pub async fn proxy_handler(
    State((client, _domain, app_handle)): State<(Arc<Client>, String, AppHandle)>,
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
    let query = uri.query().unwrap_or("");

    // 检查是否是外部URL请求 (/proxy?url=...)
    if path.is_empty() && query.starts_with("url=") {
        let url_param = &query[4..]; // 去掉 "url=" 前缀
        let decoded_url = match urlencoding::decode(url_param) {
            Ok(decoded) => decoded.to_string(),
            Err(_) => url_param.to_string(), // 如果解码失败，使用原始字符串
        };
        return handle_external_request(&client, &decoded_url, origin).await;
    }

    // 内部代理请求 - 动态获取API域名
    let current_domain = match get_current_api_domain_with_retry(&app_handle).await {
        Ok(domain) => domain,
        Err(e) => {
            eprintln!("无法获取API域名（已重试{}次）: {}", MAX_RETRY_COUNT, e);
            return Err(StatusCode::INTERNAL_SERVER_ERROR);
        }
    };

    let query_str = if query.is_empty() {
        String::new()
    } else {
        format!("?{}", query)
    };
    let target_url = format!("{}{}{}", current_domain, path, query_str);

    handle_internal_request(
        &client,
        method,
        headers_in.clone(),
        req,
        &target_url,
        origin,
        &app_handle,
    )
    .await
}

pub fn build_cors_response(origin: &str) -> Result<Response, StatusCode> {
    let mut response = Response::builder().status(StatusCode::OK);

    if !origin.is_empty() {
        response = response
            .header("Access-Control-Allow-Origin", origin)
            .header("Access-Control-Allow-Credentials", "true");
    } else {
        response = response.header("Access-Control-Allow-Origin", "*");
    }
    response = response
        .header(
            "Access-Control-Allow-Methods",
            "GET,POST,PUT,DELETE,OPTIONS",
        )
        .header(
            "Access-Control-Allow-Headers",
            "authorization,content-type,accept,origin,referer,user-agent,platform,source,deviceinfo,webp,dt,version,region,device,host,umstring",
        )
        .header("Access-Control-Max-Age", CORS_MAX_AGE);

    Ok(response.body(Body::empty()).unwrap())
}

pub async fn handle_external_request(
    client: &Client,
    url_param: &str,
    origin: &str,
) -> Result<Response, StatusCode> {
    let resp = client
        .get(url_param)
        .send()
        .await
        .map_err(|_| StatusCode::BAD_GATEWAY)?;

    build_response(resp, origin).await
}

pub async fn handle_internal_request(
    client: &Client,
    method: Method,
    headers_in: HeaderMap,
    req: Request,
    target_url: &str,
    origin: &str,
    app_handle: &AppHandle,
) -> Result<Response, StatusCode> {
    let mut builder = client.request(method.clone(), target_url);

    // 从配置文件读取请求头（带重试机制）
    let request_headers = match get_server_config_with_retry(app_handle).await {
        Ok((_, headers)) => headers,
        Err(e) => {
            eprintln!("无法读取服务器配置（已重试{}次）: {}", MAX_RETRY_COUNT, e);
            return Err(StatusCode::INTERNAL_SERVER_ERROR);
        }
    };

    // 复制原始headers，过滤不需要的
    let mut headers = HeaderMap::new();
    for (k, v) in headers_in.iter() {
        if !["host", "origin", "content-length"].contains(&k.as_str()) {
            headers.insert(k, v.clone());
        }
    } // 添加配置文件中的请求头（必须从配置读取，没有默认值）
    if let Some(config_headers) = request_headers {
        // 直接遍历配置中的所有请求头并添加到headers中
        for (key, value) in &config_headers.0 {
            if let Ok(header_value) = value.parse::<HeaderValue>() {
                if let Ok(header_name) = key.parse::<HeaderName>() {
                    headers.insert(header_name, header_value);
                }
            }
        }
    } else {
        eprintln!("警告：配置文件中未找到请求头配置，请检查server.json中的requestHeaders字段");
    }

    builder = builder.headers(headers);

    // 复制body
    let bytes = axum::body::to_bytes(req.into_body(), usize::MAX)
        .await
        .unwrap_or_default();
    if method != Method::GET && !bytes.is_empty() {
        builder = builder.body(bytes);
    }

    let resp = builder.send().await.map_err(|_| StatusCode::BAD_GATEWAY)?;
    build_response(resp, origin).await
}

pub async fn build_response(resp: reqwest::Response, origin: &str) -> Result<Response, StatusCode> {
    let mut response = Response::builder().status(resp.status());

    // 复制响应头，过滤CORS相关的
    for (k, v) in resp.headers().iter() {
        if ![
            "content-length",
            "transfer-encoding",
            "connection",
            "access-control-allow-origin",
            "access-control-allow-credentials",
        ]
        .contains(&k.as_str())
        {
            response = response.header(k, v);
        }
    }

    // 设置CORS头
    if !origin.is_empty() {
        response = response
            .header("Access-Control-Allow-Origin", origin)
            .header("Access-Control-Allow-Credentials", "true");
    } else {
        response = response.header("Access-Control-Allow-Origin", "*");
    }

    let body = resp.bytes().await.unwrap_or_default();
    Ok(response.body(Body::from(body)).unwrap())
}
