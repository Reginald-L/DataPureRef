<h1 align="center">DataPureRef</h1>

DataPureRef is a high-performance infinite canvas application based on React, designed to help users visually organize and manage multimedia data (text, images, videos). It adopts a Local-First design philosophy, supporting automatic data saving and offline export.

[简体中文](./README.md) | [English](./README_EN.md)

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![React](https://img.shields.io/badge/react-18.x-61dafb.svg)
![TypeScript](https://img.shields.io/badge/typescript-5.x-3178c6.svg)

## ✨ Core Features

- **♾️ Infinite Canvas & Navigation**
  - Supports unlimited panning and zooming.
  - **Visual Minimap**: Real-time overview of the global view, supports dragging viewport for quick positioning, wheel zooming, click to jump. Supports minimizing and restoring via context menu.
  - Optimized rendering performance for handling large numbers of elements.
  - Grid background for alignment assistance.

- **📁 Multimedia Management**
  - **Text**: Supports rich text editing, text box height automatically adapts to content.
  - **Images & Videos**: Supports drag-and-drop upload, free scaling and moving.
  - **Smart Import**: Supports **folder drag-and-drop import**, automatically identifying image, video, and text files in the directory.
  - **Performance Optimization**: Automatically generates thumbnails for video files, significantly improving rendering smoothness in scenarios with many videos.

- **🎮 Efficient Interaction**
  - **Box Selection**: Hold `Shift` key and drag to box select multiple objects.
  - **Grid Layout**: After selecting multiple objects, use "Layout Grid" in the right-click menu to quickly arrange them using a visual selector.
  - **Auto Arrange**: Select multiple objects and press `L` key to automatically sort by name and arrange neatly.
  - **Quick Reset**: Double-click image or video to quickly restore original aspect ratio/size.
  - **Context Menu**: Provides quick access to global functions (e.g., Export, Show Minimap, Layout Adjustment).

- **💾 Data Security & Export**
  - **Auto Save**: Local persistent storage based on IndexedDB, no data loss on page refresh (including large video files).
  - **Independent Export**: Supports one-click export of current canvas as a **single HTML file**. All images and videos are embedded as Base64, requiring no external dependencies, and can be interacted with (zoom, pan, play) directly in the browser.

## 🛠️ Tech Stack

- **Core Framework**: [React 18](https://react.dev/), [TypeScript](https://www.typescriptlang.org/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **State Management**: [Zustand](https://github.com/pmndrs/zustand)
- **Gestures**: [@use-gesture/react](https://github.com/pmndrs/use-gesture)
- **Local Storage**: [idb-keyval](https://github.com/jakearchibald/idb-keyval) (IndexedDB Wrapper)

## 🚀 Quick Start

### Prerequisites
- Node.js (Recommended v16+)
- npm or yarn

### Installation Steps

1. **Clone Repository**
   ```bash
   git clone https://github.com/Reginald-L/DataPureRef.git
   cd DataPureRef
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Start Development Server**
   ```bash
   npm run dev
   ```
   Visit the address shown in the terminal (usually `http://localhost:5173`).

4. **Build Production Version**
   ```bash
   npm run build
   ```

## 📖 Operation Guide

| Action | Description |
|------|------|
| **Pan Canvas** | Hold **Middle Mouse Button** (Wheel) and drag, or hold **Space** key + Left Click drag |
| **Zoom Canvas** | Scroll **Mouse Wheel**, or use zoom controls in the bottom toolbar |
| **Minimap** | Hover over bottom-right minimap to interact, drag white frame to move view; click top-right **X** to hide, **Right Click** context menu to restore |
| **Upload Files** | Drag **Files** or **Folders** directly onto the canvas |
| **Select Objects** | Hold **Shift** key and drag mouse to box select, or Shift + Click to select individually; **Ctrl + A** to select all |
| **Move Objects** | Drag directly after selection |
| **Resize** | Drag the **Control Handles** around the selected object |
| **Reset Size** | **Double Click** image or video object |
| **Auto Arrange** | Select multiple objects, press **L** key to align and arrange automatically |
| **Grid Layout** | Select multiple objects, **Right Click** -> **Layout Grid**, select rows/cols in the visual grid picker to arrange |
| **Global Menu** | **Right Click** on empty canvas area to Export, Show Minimap, or Adjust Layout |
| **Add Text** | Click **T** icon in the bottom toolbar |


## 🤝 Contribution

Welcome to submit Issues or Pull Requests to improve this project!

## ❤️ Acknowledgements

This project is inspired by [PureRef](https://www.pureref.com/). PureRef is an excellent reference image management software that provides great convenience for creative workers. DataPureRef aims to replicate and explore a similar smooth experience on the Web. Sincere thanks to the PureRef team!

## 📄 License

This project is licensed under the MIT License.
