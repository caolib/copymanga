// 下载模块的公共类型和结构
pub mod cartoon;
pub mod manga;
pub mod types;
pub mod utils;

// 重新导出所有类型和函数
pub use cartoon::*;
pub use manga::*;
#[allow(unused_imports)]
pub use types::*;
#[allow(unused_imports)]
pub use utils::*;
