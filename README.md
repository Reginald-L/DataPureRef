<h1 align="center">DataPureRef</h1>

DataPureRef 是一个基于 React 的高性能无限画布应用，旨在帮助用户以可视化的方式组织和管理多媒体数据（文本、图片、视频）。它采用本地优先（Local-First）的设计理念，支持数据的自动保存和离线导出。

[简体中文](./README.md) | [English](./README_EN.md)

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![React](https://img.shields.io/badge/react-18.x-61dafb.svg)
![TypeScript](https://img.shields.io/badge/typescript-5.x-3178c6.svg)

## ✨ 核心特性

- **♾️ 无限画布 & 导航**
  - 支持无限制的平移和缩放操作。
  - **可视化导航图 (Minimap)**：实时概览全局视图，支持拖拽视口快速定位、滚轮缩放、点击跳转，并可最小化或通过右键菜单恢复。
  - **高性能渲染**：可见区域裁剪、按需重绘与状态更新减负，让大量元素场景下的平移、缩放和导航图交互更流畅。
  - **深色设计板背景**：偏蓝深色背景结合点阵网格与轻量纹理，既保留空间感，也方便内容排布与观察。

- **📁 多媒体管理**
  - **文本**：双击画布空白处即可创建文本框，并自动进入编辑状态，方便直接输入。
  - **图片 & 视频**：支持拖拽上传、自由缩放和移动，双击媒体可快速恢复原始比例。
  - **智能导入**：支持**文件夹拖拽导入**，自动识别目录下的图片、视频和文本文件。
  - **媒体优化**：视频文件自动生成缩略图；导出页中的媒体按需加载，显著降低大项目的内存压力。

- **🎮 高效交互**
  - **框选多选**：按住 `Shift` 键拖拽即可框选多个对象，也支持 `Shift + Click` 追加选择与 `Ctrl + A` 全选。
  - **智能补位**：新增文本、拖入文件、粘贴对象时会自动吸附到整齐位置，并尽量避开现有内容，保持参考板更规整。
  - **网格布局**：通过右键菜单打开 `Layout Panel`，默认提供 `6 x 6` 排列，并支持自定义 `Cols / Rows / Gap`。
  - **自动排列**：选中多个对象后按下 `L` 键，自动按名称排序并整齐排列。
  - **右键菜单**：提供页面管理、布局操作、导出 HTML、导航图显示切换等快捷入口。

- **💾 数据安全与导出**
  - **自动保存**：基于 IndexedDB 的本地持久化存储，刷新页面不丢失任何数据（包括大型视频文件）。
  - **单文件导出**：支持将当前画布一键导出为**单文件 HTML**，直接在浏览器中打开即可查看、缩放、平移和播放内容。
  - **大画布优化导出**：导出时将对象元数据与媒体资源拆分存储，并在预览页按需恢复，降低大规模内容场景下出现 `Out of Memory` 的概率。

![example.png](assert/EXAMPLE.png)

## 🛠️ 技术栈

- **核心框架**: [React 18](https://react.dev/), [TypeScript](https://www.typescriptlang.org/)
- **构建工具**: [Vite](https://vitejs.dev/)
- **样式方案**: [Tailwind CSS](https://tailwindcss.com/)
- **状态管理**: [Zustand](https://github.com/pmndrs/zustand)
- **交互手势**: [@use-gesture/react](https://github.com/pmndrs/use-gesture)
- **本地存储**: [idb-keyval](https://github.com/jakearchibald/idb-keyval) (IndexedDB Wrapper)

## 🚀 快速开始

### 前置要求
- Node.js (推荐 v16+)
- npm 或 yarn

### 安装步骤

1. **克隆仓库**
   ```bash
   git clone https://github.com/Reginald-L/DataPureRef.git
   cd DataPureRef
   ```

2. **安装依赖**
   ```bash
   npm install
   ```

3. **启动开发服务器**
   ```bash
   npm run dev
   ```
   访问终端中显示的地址（通常是 `http://localhost:5173`）。

4. **构建生产版本**
   ```bash
   npm run build
   ```

## 📖 操作指南

| 操作 | 说明 |
|------|------|
| **平移画布** | 按住 **鼠标中键** (滚轮) 并拖动，或按住 **Space** 键 + 左键拖动 |
| **缩放画布** | 滚动 **鼠标滚轮**，或使用底部工具栏的缩放控件 |
| **导航图** | 鼠标悬停右下角导航图可操作，拖拽白框移动视图；点击右上角 **X** 隐藏，**右键菜单**可恢复显示 |
| **上传文件** | 直接将 **文件** 或 **文件夹** 拖拽到画布任意位置 |
| **多选对象** | 按住 **Shift** 键并拖拽鼠标进行框选，或 Shift + 点击逐个选择；**Ctrl + A** 全选 |
| **移动对象** | 选中后直接拖动 |
| **调整大小** | 选中对象后，拖动四周的**控制手柄** |
| **重置大小** | **双击** 图片或视频对象 |
| **自动排列** | 选中多个对象后，按 **L** 键自动对齐排列 |
| **网格布局** | 选中多个对象后，**右键单击** -> **Layout** -> **Open Layout Panel**，默认 `6 x 6`，也可自定义 `Cols / Rows / Gap` |
| **全局菜单** | 在画布空白处 **右键单击**，可进行页面管理、导出、显示导航图或打开布局面板 |
| **添加文本** | 在画布空白处 **双击**，或使用底部工具栏的 **T** 图标；新建后会自动聚焦进入输入状态 |


## 🤝 贡献

欢迎提交 Issue 或 Pull Request 来改进这个项目！

## ❤️ 致谢

本项目的设计灵感来源于 [PureRef](https://www.pureref.com/)。PureRef 是一款卓越的参考图像管理软件，为创意工作者提供了极大的便利。DataPureRef 致力于在 Web 端复刻并探索类似的流畅体验。在此向 PureRef 团队致以诚挚的谢意！

## 📄 许可证

本项目基于 MIT 许可证开源。
