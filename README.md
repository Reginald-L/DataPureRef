# DataPureRef

DataPureRef 是一个基于 React 的高性能无限画布应用，旨在帮助用户以可视化的方式组织和管理多媒体数据（文本、图片、视频）。它采用本地优先（Local-First）的设计理念，支持数据的自动保存和离线导出。

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![React](https://img.shields.io/badge/react-18.x-61dafb.svg)
![TypeScript](https://img.shields.io/badge/typescript-5.x-3178c6.svg)

## ✨ 核心特性

- **♾️ 无限画布**
  - 支持无限制的平移和缩放操作。
  - 优化的渲染性能，流畅处理大量元素。
  - 网格背景辅助对齐。

- **📁 多媒体支持**
  - **文本**: 支持富文本编辑，文本框高度根据内容自动适配。
  - **图片**: 支持拖拽上传，自由缩放和移动。
  - **视频**: 支持拖拽上传，内置播放器，支持位置移动和大小调整。

- **💾 本地持久化**
  - 基于 IndexedDB 的自动保存机制。
  - 刷新页面不丢失数据，保护您的工作进度。

- **📤 独立导出**
  - 支持将整个画布导出为**单个 HTML 文件**。
  - 导出的文件包含所有媒体资源和交互逻辑（平移、缩放、播放），可完全离线查看和分享。

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
| **平移画布** | 按住 **鼠标中键** (滚轮) 并拖动 |
| **缩放画布** | 滚动 **鼠标滚轮** |
| **上传文件** | 直接将 **图片** 或 **视频** 文件拖拽到画布任意位置 |
| **添加文本** | 点击底部工具栏的 **"Add Text"** 按钮 |
| **移动对象** | 鼠标左键按住对象头部或内容区域拖动 |
| **调整大小** | 拖动对象右下角的调整手柄 |
| **导出数据** | 点击底部工具栏的 **"Export HTML"** 按钮 |

## 🤝 贡献

欢迎提交 Issue 或 Pull Request 来改进这个项目！

## 📄 许可证

本项目基于 MIT 许可证开源。
