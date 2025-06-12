use axum::{
    body::Body,
    extract::{Request, State},
    http::{HeaderMap, Method, StatusCode},
    response::Response,
};
use reqwest::Client;
use std::sync::Arc;

pub async fn proxy_handler(
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
    let query = uri.query().unwrap_or(""); // 检查是否是外部URL请求 (/proxy?url=...)
    if path.is_empty() && query.starts_with("url=") {
        let url_param = &query[4..]; // 去掉 "url=" 前缀
        let decoded_url = match urlencoding::decode(url_param) {
            Ok(decoded) => decoded.to_string(),
            Err(_) => url_param.to_string(), // 如果解码失败，使用原始字符串
        };
        return handle_external_request(&client, &decoded_url, origin).await;
    }

    // 内部代理请求
    let query_str = if query.is_empty() {
        String::new()
    } else {
        format!("?{}", query)
    };
    let target_url = format!("{}{}{}", domain, path, query_str);
    handle_internal_request(
        &client,
        method,
        headers_in.clone(),
        req,
        &target_url,
        origin,
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
        .header("Access-Control-Max-Age", "86400");

    Ok(response.body(Body::empty()).unwrap())
}

pub async fn handle_external_request(
    client: &Client,
    url_param: &str,
    origin: &str,
) -> Result<Response, StatusCode> {
    let resp = client
        .get(url_param)
        .header(
            "User-Agent",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        )
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
) -> Result<Response, StatusCode> {
    let mut builder = client.request(method.clone(), target_url);

    // 复制headers，过滤不需要的
    let mut headers = HeaderMap::new();
    for (k, v) in headers_in.iter() {
        if !["host", "origin", "content-length"].contains(&k.as_str()) {
            headers.insert(k, v.clone());
        }
    }

    // 添加浏览器不允许设置的请求头
    headers.insert("user-agent", "COPY/2.3.0".parse().unwrap());
    headers.insert("referer", "com.copymanga.app-2.3.0".parse().unwrap());
    headers.insert("host", "api.copy2000.online".parse().unwrap());

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
