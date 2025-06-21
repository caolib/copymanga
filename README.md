<h1 align="center">
<img src=".\src-tauri\icons\128x128.png"/>
</h1>
<p align="center">
  <img src="https://skillicons.dev/icons?i=tauri,vue,js,rust,pinia,scss,vite,pnpm"/>
</p>



<p align="center">
  <img src="https://img.shields.io/github/downloads/caolib/doki/total?labelColor=grey&color=blue" alt="Downloads"/>
  <img src="https://img.shields.io/github/v/release/caolib/doki?labelColor=grey&color=red" alt="Release"/>
  <img src="https://img.shields.io/github/license/caolib/doki" alt="License"/>
  <img src="https://img.shields.io/github/stars/caolib/doki" alt="Stars"/>
<!--   <img src="https://img.shields.io/github/issues/caolib/doki?label=Issues" alt="Issues"/> -->
  <img src="https://github.com/caolib/doki/actions/workflows/ci.yml/badge.svg" alt="release"/>
  <img src="https://img.shields.io/github/downloads/caolib/doki/latest/total" alt="Latest Downloads"/>
</p>


## 1 介绍

doki是一个集漫画、轻小说、动画于一体的桌面应用，提供简洁快速的漫画阅读体验，这是[deepwiki生成的简介](https://deepwiki.com/search/_8131da19-74a1-4016-96ec-65580a05c158)，有更多问题也可以问它，目前支持win、mac、linux，只有windows简单测试过，移动端可以下载[官方app](https://www.copy20.com/download)使用



### 1.漫画

<table>
<tr>
<td><img src="https://s2.loli.net/2025/06/21/eGMfoDwXhdm9q2z.png" alt="首页" /></td>
<td><img src="https://s2.loli.net/2025/06/21/U5CsVo9R42beQGA.png" alt="搜索" /></td>
</tr>
<tr>
<td><img src="https://s2.loli.net/2025/06/21/UryZHueIz8N4ng6.png" alt="阅读" /></td>
<td><img src="https://s2.loli.net/2025/05/29/rwYCb5BLvfHKn7X.png" alt="搜索" /></td>
</tr>
<tr>
<td><img src="https://s2.loli.net/2025/05/29/aopKubEDILBzkY7.png" alt="书架" /></td>
<td><img src="https://s2.loli.net/2025/06/13/5qZMzt1ivDNge92.png" alt="设置" /></td>
</tr>
<tr>
<td><img src="https://s2.loli.net/2025/06/13/Mpd9Tz7j3kWr6hL.png" alt="章节" /></td>
<td><img src="https://s2.loli.net/2025/06/11/Wc8G129xh43SzbZ.png" alt="主题" /></td>
</tr>
</table>

### 2.轻小说

<table>
<tr>
<td><img src="https://s2.loli.net/2025/06/02/D5jpQv89Idc4wsm.png" alt="首页" /></td>
<td><img src="https://s2.loli.net/2025/06/11/xbjEPk4Yt26UuBZ.png" alt="阅读" /></td>
</tr>
<tr>
<td><img src="https://s2.loli.net/2025/06/02/MtHREhCqiTZK9pN.png" alt="详情" /></td>
<td></td>
</tr>
</table>

### 3.动画

<table>
<tr>
<td><img src="https://s2.loli.net/2025/06/13/udFeXIhRViKJblW.png" alt="首页" /></td>
<td><img src="https://s2.loli.net/2025/06/13/4eGRoafHv371l86.png" alt="播放" /></td>
</tr>
</table>

### 4.写真

> 这部分自己探索

## 2 开发

### 2.1 环境

开发之前，确保你已经安装了rust、nodejs等环境，这有一篇[rust安装教程](https://clb.pages.dev/2025/02/16/rust%E4%BD%BF%E7%94%A8MSVC%E6%9C%80%E5%B0%8F%E5%AE%89%E8%A3%85/)

### 2.1 克隆仓库

在一个合适位置克隆该仓库，最好有25GB左右的存储空间（时间长了就会占用很多空间，建议只在本地开发而不构建，可以用github actions构建发布）

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

> [!caution]
>
> - 本应用为非官方第三方客户端，仅供学习和技术交流使用,可能会导致账号出现封禁风险，请谨慎使用
> - 本应用不拥有任何漫画作品的版权，所有内容均来源于第三方API
> - 用户在使用本应用时应遵守当地法律法规，不得用于商业用途
> - 用户应支持正版漫画，购买官方授权的漫画作品

### 法律声明
> [!warning]
>
> - 本应用开发者不对应用中展示的任何内容承担法律责任
> - 用户因使用本应用而产生的任何纠纷或损失，开发者概不负责

### 内容风险提醒

> [!warning]
>
> - 本应用通过第三方API获取内容，无法保证所有内容的合法性和适宜性
> - 应用中可能包含不适合未成年人浏览的内容
> - 建议用户在监护人陪同下使用，并自行判断内容的适宜性

✅**继续使用本应用即表示您已阅读、理解并同意上述所有条款。**
