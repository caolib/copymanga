use std::path::PathBuf;
use std::fs;
use tauri::{AppHandle, Manager};
use serde::{Deserialize, Serialize};

/// 配置文件名常量
pub struct ConfigFiles;

impl ConfigFiles {
    pub const SERVER: &'static str = "server.json";
    pub const APP: &'static str = "copymanga.json";
}

/// 路径工具类
/// 提供统一的配置文件路径管理和文件操作
pub struct PathHelper {
    app_handle: AppHandle,
}

impl PathHelper {
    /// 创建新的PathHelper实例
    pub fn new(app_handle: AppHandle) -> Self {
        Self { app_handle }
    }

    /// 获取配置目录路径
    pub fn get_config_dir_path(&self) -> Result<PathBuf, String> {
        let resource_dir = self.app_handle.path().resource_dir()
            .map_err(|e| format!("无法获取资源目录: {}", e))?;
        
        Ok(resource_dir.join("config"))
    }

    /// 获取配置文件路径
    pub fn get_config_file_path(&self, filename: &str) -> Result<PathBuf, String> {
        let config_dir = self.get_config_dir_path()?;
        Ok(config_dir.join(filename))
    }    /// 读取配置文件内容
    pub fn read_config_content(&self, filename: &str) -> Result<String, String> {
        let config_path = self.get_config_file_path(filename)?;
        
        if !config_path.exists() {
            return Err(format!("配置文件不存在: {:?}，请在前端设置中进行配置", config_path));
        }
        
        fs::read_to_string(&config_path)
            .map_err(|e| format!("无法读取配置文件 {:?}: {}", config_path, e))
    }

    /// 读取并解析JSON配置文件
    pub fn read_config<T>(&self, filename: &str) -> Result<T, String>
    where
        T: for<'de> Deserialize<'de>,
    {
        let content = self.read_config_content(filename)?;
        serde_json::from_str(&content)
            .map_err(|e| format!("配置文件格式错误: {}", e))
    }

    /// 保存配置文件
    pub fn save_config<T>(&self, filename: &str, config: &T) -> Result<(), String>
    where
        T: Serialize,
    {
        let config_path = self.get_config_file_path(filename)?;
        
        // 确保目录存在
        if let Some(parent) = config_path.parent() {
            fs::create_dir_all(parent)
                .map_err(|e| format!("无法创建配置目录: {}", e))?;
        }
        
        let content = serde_json::to_string_pretty(config)
            .map_err(|e| format!("序列化配置失败: {}", e))?;
        
        fs::write(&config_path, content)
            .map_err(|e| format!("无法写入配置文件 {:?}: {}", config_path, e))
    }
}

/// 服务器配置结构
#[derive(Serialize, Deserialize, Debug)]
pub struct ServerConfig {
    #[serde(rename = "serverPort")]
    pub server_port: String,
}

/// 应用配置结构
#[derive(Serialize, Deserialize, Debug)]
pub struct AppConfig {
    #[serde(rename = "apiSources")]
    pub api_sources: Vec<String>,
    #[serde(rename = "currentApiIndex")]
    pub current_api_index: i32,
}

/// UI配置结构
#[derive(Serialize, Deserialize, Debug)]
pub struct UiConfig {
    pub theme: ThemeConfig,
    pub reader: ReaderConfig,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct ThemeConfig {
    #[serde(rename = "isDarkMode")]
    pub is_dark_mode: bool,
    #[serde(rename = "fontFamily")]
    pub font_family: String,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct ReaderConfig {
    pub layout: String,
    #[serde(rename = "columnsPerRow")]
    pub columns_per_row: u32,
    #[serde(rename = "imageSize")]
    pub image_size: u32,
    #[serde(rename = "imageGap")]
    pub image_gap: u32,
}

/// 配置管理器 - 提供高级配置操作
pub struct ConfigManager {
    path_helper: PathHelper,
}

impl ConfigManager {
    /// 创建新的ConfigManager实例
    pub fn new(app_handle: AppHandle) -> Self {
        Self {
            path_helper: PathHelper::new(app_handle),
        }
    }

    /// 获取服务器端口
    pub fn get_server_port(&self) -> Result<u16, String> {
        let config: ServerConfig = self.path_helper.read_config(ConfigFiles::SERVER)?;
        
        let port = config.server_port.parse::<u16>()
            .map_err(|e| format!("端口号格式错误: {}", e))?;
        
        if port == 0 {
            return Err("端口号不能为0".to_string());
        }
        
        Ok(port)
    }    /// 获取当前API域名
    pub fn get_current_api_domain(&self) -> Result<String, String> {
        let mut config: AppConfig = self.path_helper.read_config(ConfigFiles::APP)?;
        
        // 检查是否有API源配置
        if config.api_sources.is_empty() {
            return Err("没有配置API源，请在前端设置中添加API源".to_string());
        }
        
        // 如果当前索引无效，自动选择第一个API源
        if config.current_api_index < 0 || config.current_api_index as usize >= config.api_sources.len() {
            println!("当前API源索引无效: {}，自动选择第一个API源", config.current_api_index);
            config.current_api_index = 0;
            
            // 保存更新后的配置
            if let Err(e) = self.save_app_config(config.api_sources.clone(), config.current_api_index) {
                println!("警告：无法保存更新后的配置: {}", e);
            }
        }
        
        let current_domain = &config.api_sources[config.current_api_index as usize];
        Ok(current_domain.clone())
    }    /// 保存应用配置
    pub fn save_app_config(&self, api_sources: Vec<String>, current_index: i32) -> Result<(), String> {
        let config = AppConfig {
            api_sources,
            current_api_index: current_index,
        };
        self.path_helper.save_config(ConfigFiles::APP, &config)
    }
}
