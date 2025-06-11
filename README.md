# 拷贝漫画

<p align="center">
  <img src="https://skillicons.dev/icons?i=tauri,vue,js,rust,pinia,scss,vite,pnpm"/>
</p>

<p align="center">
  <img src="https://img.shields.io/github/downloads/caolib/copymanga/total?labelColor=grey&color=blue" alt="Downloads"/>
  <img src="https://img.shields.io/github/v/release/caolib/copymanga?labelColor=grey&color=red" alt="Release"/>
  <img src="https://img.shields.io/github/license/caolib/copymanga" alt="License"/>
  <img src="https://img.shields.io/github/stars/caolib/copymanga" alt="Stars"/>
  <img src="https://img.shields.io/github/issues/caolib/copymanga?label=Issues" alt="Issues"/>
  <img src="https://img.shields.io/github/downloads/caolib/copymanga/latest/total" alt="Latest Downloads"/>
</p>


## 1 介绍

这是一个拷贝漫画第三方桌面端应用，目前支持win、mac、linux，只有windows有简单测试过，[前往下载](https://github.com/caolib/copymanga/releases)

功能：

- [x] 漫画
- [x] 轻小说
- [x] 写真
- [ ] 动画

### 漫画

![image-20250611171235202](https://s2.loli.net/2025/06/11/3a7YcMSFtkE46VC.png)

![image-20250611171319310](https://s2.loli.net/2025/06/11/kNGwQKeCpYniDJI.png)

![image-20250611182153968](https://s2.loli.net/2025/06/11/T8jP5cmgdSziquW.png)

![image-20250529162057214](https://s2.loli.net/2025/05/29/rwYCb5BLvfHKn7X.png)

![image-20250529162210160](https://s2.loli.net/2025/05/29/aopKubEDILBzkY7.png)

![image-20250611182258241](https://s2.loli.net/2025/06/11/FeVknxADERKHybg.png)

![image-20250611182347188](https://s2.loli.net/2025/06/11/oY1IlODBPyVH7cj.png)

![image-20250611182441206](https://s2.loli.net/2025/06/11/Wc8G129xh43SzbZ.png)

![image-20250611182559524](https://s2.loli.net/2025/06/11/r3s78xnVkwjX6Mf.png)

### 轻小说

![image-20250602164731951](https://s2.loli.net/2025/06/02/D5jpQv89Idc4wsm.png)

![image-20250602193020756](https://s2.loli.net/2025/06/02/MtHREhCqiTZK9pN.png)



## 2 开发

### 2.1 环境

开发之前，确保你已经安装了rust、nodejs等环境，这有一篇[rust安装教程](https://clb.pages.dev/2025/02/16/rust%E4%BD%BF%E7%94%A8MSVC%E6%9C%80%E5%B0%8F%E5%AE%89%E8%A3%85/)

### 2.1 克隆仓库

在一个合适位置克隆该仓库，最好有30GB左右的存储空间（桌面应用是这样的）

### 2.2 Tauri，启动！

先进入项目根目录下载前端依赖

```bash
pnpm i
```

启动项目，其他脚本可以在`package.json`文件查看，第一次启动会花比较长的时间下载依赖和编译

```bash
pnpm dev:cli
```

---

## ⚠️ 免责声明

**请在使用本应用前仔细阅读以下声明：**

### 使用声明
- 本应用为非官方第三方客户端，仅供学习和技术交流使用
- 本应用不拥有任何漫画作品的版权，所有内容均来源于第三方API
- 用户在使用本应用时应遵守当地法律法规，不得用于商业用途
- 用户应支持正版漫画，购买官方授权的漫画作品

### 法律声明
- 本应用开发者不对应用中展示的任何内容承担法律责任
- 用户因使用本应用而产生的任何纠纷或损失，开发者概不负责

### 内容风险提醒
- 本应用通过第三方API获取内容，无法保证所有内容的合法性和适宜性
- 应用中可能包含不适合未成年人浏览的内容
- 建议用户在监护人陪同下使用，并自行判断内容的适宜性

**继续使用本应用即表示您已阅读、理解并同意上述所有条款。**