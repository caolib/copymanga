// 下载模块的公共类型和结构
pub mod types;
pub mod manga;
pub mod cartoon;
pub mod utils;

// 重新导出所有类型和函数
#[allow(unused_imports)]
pub use types::*;
pub use manga::*;
pub use cartoon::*;
#[allow(unused_imports)]
pub use utils::*;
