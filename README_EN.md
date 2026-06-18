<h1 align="center">DataPureRef</h1>

DataPureRef is a high-performance infinite canvas application based on React, designed to help users visually organize and manage multimedia data (text, images, videos). It adopts a Local-First design philosophy, supporting automatic data saving and offline export.

[简体中文](./README.md) | [English](./README_EN.md)

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![React](https://img.shields.io/badge/react-18.x-61dafb.svg)
![TypeScript](https://img.shields.io/badge/typescript-5.x-3178c6.svg)

## ✨ Core Features

- **♾️ Infinite Canvas & Navigation**
  - Supports unlimited panning and zooming.
  - **Visual Minimap**: Real-time overview of the full canvas with drag-to-navigate, wheel zoom, click-to-jump, hide/show controls, and restore from the context menu.
  - **Performance-Oriented Rendering**: Viewport culling, reduced state churn, and on-demand redraws keep panning, zooming, and minimap interaction smooth even with many elements.
  - **Blueprint-Style Background**: A dark blue board with dot-grid texture and subtle atmosphere helps content stand out without feeling flat.

- **📁 Multimedia Management**
  - **Text**: Double-click any empty canvas area to create a text box and start typing immediately.
  - **Images & Videos**: Supports drag-and-drop upload and free resize/move; images can be double-clicked to toggle between thumbnail and full size with automatic bring-to-front behavior, while videos support quick double-click reset to their original aspect ratio.
  - **Smart Import**: Supports **folder drag-and-drop import**, automatically identifying image, video, and text files in a directory.
  - **Media Optimization**: Automatically generates video thumbnails, and exported pages load heavy media lazily to reduce memory pressure.

- **🎮 Efficient Interaction**
  - **Multi-Selection**: Hold `Shift` and drag to box-select multiple objects, use `Shift + Click` to add to selection, or `Ctrl + A` to select all.
  - **Smart Placement**: Newly created or imported items snap into cleaner positions and try to avoid overlapping existing content.
  - **Grid Layout Panel**: Open `Layout Panel` from the context menu to apply the default `6 x 6` layout or customize `Cols / Rows / Gap`.
  - **Auto Arrange**: Select multiple objects and press `L` to sort by name and arrange them neatly.
  - **Context Menu**: Provides quick access to page management, layout actions, HTML export, and minimap visibility.

- **💾 Data Security & Export**
  - **Auto Save**: Local persistent storage powered by IndexedDB prevents data loss after refresh, including large video assets.
  - **Single-File Export**: Export the current canvas as a standalone **HTML file** that opens directly in the browser with pan, zoom, and playback support.
  - **Large-Canvas Export Optimization**: Exported files separate metadata from media payloads and restore heavy content on demand, reducing the chance of `Out of Memory` on large boards.

![example.png](assert/EXAMPLE.png)

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
| **Image Preview Toggle** | **Double Click** an image to switch between thumbnail and full size; expanded images are automatically brought to the front |
| **Restore Thumbnail** | Select an expanded image and press **Esc** to quickly return it to thumbnail size |
| **Video Reset Size** | **Double Click** a video object to restore its original aspect ratio quickly |
| **Auto Arrange** | Select multiple objects, press **L** key to align and arrange automatically |
| **Grid Layout** | Select multiple objects, **Right Click** -> **Layout** -> **Open Layout Panel**; default is `6 x 6`, and `Cols / Rows / Gap` can be customized |
| **Global Menu** | **Right Click** on empty canvas area to manage pages, export, show/hide minimap, or open the layout panel |
| **Add Text** | **Double Click** an empty area on the canvas, or click the **T** icon in the bottom toolbar; the new text box is focused immediately |


## 🤝 Contribution

Welcome to submit Issues or Pull Requests to improve this project!

## ❤️ Acknowledgements

This project is inspired by [PureRef](https://www.pureref.com/). PureRef is an excellent reference image management software that provides great convenience for creative workers. DataPureRef aims to replicate and explore a similar smooth experience on the Web. Sincere thanks to the PureRef team!

## 📄 License

This project is licensed under the MIT License.
