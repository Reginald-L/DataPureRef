import { CanvasObject, Viewport } from '../types/canvas';
import { getFile } from './storage';

type ExportCanvasObject = CanvasObject & {
  exportMediaId?: string;
  exportThumbnailMediaId?: string;
};

const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to convert blob to base64'));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

const escapeJsonForHtmlScriptTag = (json: string): string => {
  return json
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
};

export const generateExportHtml = async (objects: CanvasObject[], viewport: Viewport): Promise<Blob> => {
  const parts: string[] = [];
  const mediaParts: string[] = [];
  const objectParts: string[] = [];
  const embeddedMedia = new Map<string, string>();
  let nextMediaId = 0;

  const ensureEmbeddedMedia = async (fileId?: string): Promise<string | undefined> => {
    if (!fileId) return undefined;

    const existingId = embeddedMedia.get(fileId);
    if (existingId) {
      return existingId;
    }

    const blob = await getFile(fileId);
    if (!blob) return undefined;

    const mediaId = `media_${nextMediaId++}`;
    const base64 = await blobToBase64(blob);
    embeddedMedia.set(fileId, mediaId);
    mediaParts.push(
      `<script type="text/plain" data-datapureref-media="1" data-media-id="${mediaId}">${escapeJsonForHtmlScriptTag(base64)}</script>\n`
    );
    return mediaId;
  };

  parts.push(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Infinite Canvas Export</title>
    <style>
        body {
            margin: 0;
            overflow: hidden;
            background-color: #050c16;
            color: white;
            font-family: system-ui, -apple-system, sans-serif;
            user-select: none;
        }
        #container {
            width: 100vw;
            height: 100vh;
            position: relative;
            overflow: hidden;
            touch-action: none;
        }
        #canvas {
            position: absolute;
            top: 0;
            left: 0;
            transform-origin: 0 0;
            will-change: transform;
        }
        .grid-background {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: -1;
        }
        .obj {
            position: absolute;
            box-sizing: border-box;
        }
        .obj-text {
            white-space: pre-wrap;
            word-break: break-word;
            padding: 8px;
            background-color: rgba(0, 0, 0, 0.3);
            border-radius: 4px;
        }
        .obj-image img, .obj-video img, .obj-video video {
            width: 100%;
            height: 100%;
            object-fit: contain;
            display: block;
        }
        .obj-image img {
            pointer-events: none;
        }
        .video-shell {
            width: 100%;
            height: 100%;
            position: relative;
            background: #000;
            cursor: pointer;
            overflow: hidden;
        }
        .video-placeholder {
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: rgba(255,255,255,0.8);
            background: linear-gradient(135deg, #111, #222);
            font-size: 14px;
        }
        .video-play {
            position: absolute;
            left: 50%;
            top: 50%;
            transform: translate(-50%, -50%);
            width: 56px;
            height: 56px;
            border-radius: 9999px;
            border: 0;
            background: rgba(0, 0, 0, 0.45);
            color: #fff;
            cursor: pointer;
            font-size: 22px;
        }
        .grid-pattern {
            width: 100%;
            height: 100%;
            background-color: #050c16;
            background-image:
                radial-gradient(circle, rgba(148, 163, 184, 0.12) 0.7px, transparent 1px),
                radial-gradient(circle, rgba(96, 165, 250, 0.16) 1px, transparent 1.35px),
                linear-gradient(to right, rgba(59, 130, 246, 0.08) 1px, transparent 1px),
                linear-gradient(to bottom, rgba(59, 130, 246, 0.08) 1px, transparent 1px),
                radial-gradient(circle at 18% 12%, rgba(56, 189, 248, 0.12), transparent 28%),
                radial-gradient(circle at 82% 4%, rgba(37, 99, 235, 0.18), transparent 34%);
            background-size: 14px 14px, 28px 28px, 144px 144px, 144px 144px, 100% 100%, 100% 100%;
        }
    </style>
</head>
<body>
    <div id="container">
        <div id="grid" class="grid-background">
            <div class="grid-pattern"></div>
        </div>
        <div id="canvas"></div>
    </div>
    <div id="loading" style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); color: white; background: rgba(0,0,0,0.8); padding: 20px; border-radius: 8px; z-index: 9999;">
        Loading...
    </div>
`);

  parts.push(
    `<script id="datapureref-viewport" type="application/json">${escapeJsonForHtmlScriptTag(JSON.stringify(viewport))}</script>\n`
  );

  let processedCount = 0;
  for (const obj of objects) {
    processedCount++;
    if (processedCount % 2 === 0) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    const exportObject: ExportCanvasObject = JSON.parse(JSON.stringify(obj));

    if (exportObject.type === 'image' && exportObject.fileId) {
      try {
        const mediaId = await ensureEmbeddedMedia(exportObject.fileId);
        if (mediaId) {
          exportObject.exportMediaId = mediaId;
          exportObject.src = '';
        }
      } catch (err) {
        console.error(`Failed to embed image for object ${exportObject.id}`, err);
      }
    }

    if (exportObject.type === 'video') {
      try {
        if (exportObject.fileId) {
          const mediaId = await ensureEmbeddedMedia(exportObject.fileId);
          if (mediaId) {
            exportObject.exportMediaId = mediaId;
            exportObject.src = '';
          }
        }

        if (exportObject.thumbnailFileId) {
          const thumbnailMediaId = await ensureEmbeddedMedia(exportObject.thumbnailFileId);
          if (thumbnailMediaId) {
            exportObject.exportThumbnailMediaId = thumbnailMediaId;
            delete exportObject.thumbnail;
          }
        }
      } catch (err) {
        console.error(`Failed to embed video for object ${exportObject.id}`, err);
      }
    }

    objectParts.push(
      `<script type="application/json" data-datapureref-object="1">${escapeJsonForHtmlScriptTag(JSON.stringify(exportObject))}</script>\n`
    );
  }

  parts.push(...mediaParts);
  parts.push(...objectParts);

  parts.push(`
    <script>
        try {
            const viewport = JSON.parse(document.getElementById('datapureref-viewport')?.textContent || '{"x":0,"y":0,"zoom":1}');
            const objectScripts = document.querySelectorAll('script[data-datapureref-object="1"]');
            const mediaScripts = new Map(
                Array.from(document.querySelectorAll('script[data-datapureref-media="1"]')).map((el) => [el.dataset.mediaId, el])
            );

            const container = document.getElementById('container');
            const canvas = document.getElementById('canvas');
            const grid = document.getElementById('grid');
            const gridPattern = grid.querySelector('.grid-pattern');
            const loading = document.getElementById('loading');

            function resolveMediaData(mediaId, consume) {
                if (!mediaId) return '';
                const scriptEl = mediaScripts.get(mediaId);
                if (!scriptEl) return '';
                const value = scriptEl.textContent || '';
                if (consume) {
                    mediaScripts.delete(mediaId);
                    scriptEl.remove();
                }
                return value;
            }

            const observer = new IntersectionObserver((entries) => {
                entries.forEach((entry) => {
                    if (!entry.isIntersecting) return;
                    const el = entry.target;
                    const mediaId = el.getAttribute('data-media-id');
                    const fallbackSrc = el.getAttribute('data-fallback-src') || '';
                    const src = fallbackSrc || resolveMediaData(mediaId, false);
                    if (src) {
                        el.setAttribute('src', src);
                        el.removeAttribute('data-fallback-src');
                    }
                    observer.unobserve(el);
                });
            }, { root: container, rootMargin: '500px' });

            let scriptIndex = 0;
            const CHUNK_SIZE = 50;

            function processChunk() {
                const limit = Math.min(scriptIndex + CHUNK_SIZE, objectScripts.length);
                for (let i = scriptIndex; i < limit; i++) {
                    try {
                        const el = objectScripts[i];
                        const obj = JSON.parse(el.textContent || 'null');
                        if (obj) {
                            renderObject(obj);
                        }
                    } catch (e) {
                        console.warn('Failed to parse object', e);
                    }
                }
                scriptIndex = limit;

                if (scriptIndex < objectScripts.length) {
                    loading.textContent = \`Loading \${Math.round((scriptIndex / objectScripts.length) * 100)}%...\`;
                    requestAnimationFrame(processChunk);
                } else {
                    loading.style.display = 'none';
                    updateTransform();
                }
            }

            function renderObject(obj) {
                const el = document.createElement('div');
                el.className = 'obj';
                el.style.left = obj.position.x + 'px';
                el.style.top = obj.position.y + 'px';
                el.style.width = obj.size.width + 'px';
                el.style.height = obj.size.height + 'px';
                el.style.zIndex = obj.zIndex;

                if (obj.type === 'text') {
                    el.classList.add('obj-text');
                    el.textContent = obj.content;
                    el.style.fontSize = obj.fontSize + 'px';
                    el.style.fontWeight = obj.fontWeight;
                    el.style.fontStyle = obj.fontStyle;
                    el.style.color = obj.color;
                } else if (obj.type === 'image') {
                    el.classList.add('obj-image');
                    const img = document.createElement('img');
                    const fallbackSrc = obj.src || '';
                    if (obj.exportMediaId) {
                        img.setAttribute('data-media-id', obj.exportMediaId);
                    }
                    if (fallbackSrc) {
                        img.setAttribute('data-fallback-src', fallbackSrc);
                    }
                    observer.observe(img);
                    el.appendChild(img);

                    el.addEventListener('dblclick', (e) => {
                        e.stopPropagation();
                        const newImg = new Image();
                        newImg.src = img.currentSrc || img.getAttribute('src') || obj.src || resolveMediaData(obj.exportMediaId, false);
                        newImg.onload = () => {
                            obj.size.width = newImg.width;
                            obj.size.height = newImg.height;
                            el.style.width = newImg.width + 'px';
                            el.style.height = newImg.height + 'px';
                        };
                    });
                } else if (obj.type === 'video') {
                    el.classList.add('obj-video');
                    const shell = document.createElement('div');
                    shell.className = 'video-shell';

                    let hasThumbnail = false;
                    if (obj.exportThumbnailMediaId || obj.thumbnail) {
                        const thumb = document.createElement('img');
                        if (obj.exportThumbnailMediaId) {
                            thumb.setAttribute('data-media-id', obj.exportThumbnailMediaId);
                        }
                        if (obj.thumbnail) {
                            thumb.setAttribute('data-fallback-src', obj.thumbnail);
                        }
                        observer.observe(thumb);
                        shell.appendChild(thumb);
                        hasThumbnail = true;
                    }

                    if (!hasThumbnail) {
                        const placeholder = document.createElement('div');
                        placeholder.className = 'video-placeholder';
                        placeholder.textContent = 'Click to load video';
                        shell.appendChild(placeholder);
                    }

                    const playButton = document.createElement('button');
                    playButton.className = 'video-play';
                    playButton.type = 'button';
                    playButton.textContent = '▶';

                    const activateVideo = () => {
                        const videoSrc = obj.src || resolveMediaData(obj.exportMediaId, true);
                        if (!videoSrc) return;

                        const video = document.createElement('video');
                        video.controls = true;
                        video.autoplay = true;
                        video.preload = 'none';
                        video.src = videoSrc;

                        shell.innerHTML = '';
                        shell.appendChild(video);
                    };

                    playButton.addEventListener('click', (e) => {
                        e.stopPropagation();
                        activateVideo();
                    });
                    shell.addEventListener('dblclick', (e) => {
                        e.stopPropagation();
                        activateVideo();
                    });

                    shell.appendChild(playButton);
                    el.appendChild(shell);
                }

                canvas.appendChild(el);
            }

            function updateTransform() {
                canvas.style.transform = \`translate(\${viewport.x}px, \${viewport.y}px) scale(\${viewport.zoom})\`;

                const microDotSize = 14 * viewport.zoom;
                const dotGridSize = 28 * viewport.zoom;
                const majorGridSize = 144 * viewport.zoom;

                gridPattern.style.backgroundSize = \`\${microDotSize}px \${microDotSize}px, \${dotGridSize}px \${dotGridSize}px, \${majorGridSize}px \${majorGridSize}px, \${majorGridSize}px \${majorGridSize}px, 100% 100%, 100% 100%\`;
                gridPattern.style.backgroundPosition = [
                    \`\${viewport.x * 0.18}px \${viewport.y * 0.18}px\`,
                    \`\${viewport.x}px \${viewport.y}px\`,
                    \`\${viewport.x}px \${viewport.y}px\`,
                    \`\${viewport.x * 0.55}px \${viewport.y * 0.55}px\`,
                    'center',
                    'center'
                ].join(', ');
            }

            let isDragging = false;
            let lastMousePos = { x: 0, y: 0 };

            container.addEventListener('wheel', (e) => {
                if (e.ctrlKey) e.preventDefault();
            }, { passive: false });

            container.addEventListener('mousedown', (e) => {
                 if (e.button === 1) e.preventDefault();
            }, { passive: false });

            container.addEventListener('pointerdown', (e) => {
                if (e.button === 1) {
                    e.preventDefault();
                    isDragging = true;
                    lastMousePos = { x: e.clientX, y: e.clientY };
                    container.style.cursor = 'grabbing';
                    container.setPointerCapture(e.pointerId);
                }
            });

            container.addEventListener('pointermove', (e) => {
                if (isDragging) {
                    e.preventDefault();
                    const dx = e.clientX - lastMousePos.x;
                    const dy = e.clientY - lastMousePos.y;

                    viewport.x += dx;
                    viewport.y += dy;

                    lastMousePos = { x: e.clientX, y: e.clientY };
                    updateTransform();
                }
            });

            container.addEventListener('pointerup', (e) => {
                if (isDragging) {
                    isDragging = false;
                    container.style.cursor = 'default';
                    container.releasePointerCapture(e.pointerId);
                }
            });

            container.addEventListener('wheel', (e) => {
                if (e.ctrlKey) e.preventDefault();
                e.preventDefault();

                const zoomFactor = -e.deltaY * 0.001;
                const scale = 1 + zoomFactor;
                const newZoom = Math.max(0.1, Math.min(5, viewport.zoom * scale));

                const rect = container.getBoundingClientRect();
                const mouseX = e.clientX - rect.left;
                const mouseY = e.clientY - rect.top;

                const canvasX = (mouseX - viewport.x) / viewport.zoom;
                const canvasY = (mouseY - viewport.y) / viewport.zoom;

                viewport.zoom = newZoom;
                viewport.x = mouseX - canvasX * newZoom;
                viewport.y = mouseY - canvasY * newZoom;

                updateTransform();
            }, { passive: false });

            requestAnimationFrame(processChunk);
        } catch (err) {
            console.error(err);
            document.body.innerHTML = '<div style="color:red; padding:20px;">Failed to load export: ' + err.message + '</div>';
        }
    </script>
</body>
</html>
`);

  return new Blob(parts, { type: 'text/html;charset=utf-8' });
};
