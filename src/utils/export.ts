import { CanvasObject, Viewport } from '../types/canvas';
import { getFile } from './storage';

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

export const generateExportHtml = async (objects: CanvasObject[], viewport: Viewport): Promise<string> => {
  // Deep clone objects to avoid mutating the original state
  const clonedObjects = JSON.parse(JSON.stringify(objects));

  // Process objects to embed media
  for (const obj of clonedObjects) {
    if ((obj.type === 'image' || obj.type === 'video') && obj.fileId) {
      try {
        const blob = await getFile(obj.fileId);
        if (blob) {
          const base64 = await blobToBase64(blob);
          obj.src = base64;
        }
      } catch (err) {
        console.error(`Failed to embed media for object ${obj.id}`, err);
      }
    }
  }

  const state = {
    objects: clonedObjects,
    viewport
  };

  return `
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
            background-color: #1a1a1a;
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
        .obj-image img, .obj-video video {
            width: 100%;
            height: 100%;
            object-fit: contain;
            /* Allow interaction with video controls */
        }
        .obj-image img {
            pointer-events: none;
        }
        /* Grid Pattern */
        .grid-pattern {
            width: 100%;
            height: 100%;
            background-image: 
                linear-gradient(to right, #333 1px, transparent 1px),
                linear-gradient(to bottom, #333 1px, transparent 1px);
            background-size: 50px 50px;
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

    <script>
        const state = ${JSON.stringify(state)};
        let { viewport } = state;
        const container = document.getElementById('container');
        const canvas = document.getElementById('canvas');
        const grid = document.getElementById('grid');
        const gridPattern = grid.querySelector('.grid-pattern');

        // Render Objects
        function render() {
            canvas.innerHTML = '';
            state.objects.sort((a, b) => a.zIndex - b.zIndex).forEach(obj => {
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
                    img.src = obj.src;
                    el.appendChild(img);

                    // Double click to reset size
                    el.addEventListener('dblclick', (e) => {
                        e.stopPropagation();
                        const newImg = new Image();
                        newImg.src = obj.src;
                        newImg.onload = () => {
                            // Update object size in state (though specific update logic isn't fully reactive here, 
                            // we manipulate DOM directly for export view)
                            obj.size.width = newImg.width;
                            obj.size.height = newImg.height;
                            el.style.width = newImg.width + 'px';
                            el.style.height = newImg.height + 'px';
                        };
                    });
                } else if (obj.type === 'video') {
                    el.classList.add('obj-video');
                    const video = document.createElement('video');
                    video.src = obj.src;
                    video.controls = true;
                    el.appendChild(video);
                }

                canvas.appendChild(el);
            });
            updateTransform();
        }

        function updateTransform() {
            canvas.style.transform = \`translate(\${viewport.x}px, \${viewport.y}px) scale(\${viewport.zoom})\`;
            
            // Update Grid
            const gridSize = 50 * viewport.zoom;
            const backgroundSize = \`\${gridSize}px \${gridSize}px\`;
            const backgroundPosition = \`\${viewport.x}px \${viewport.y}px\`;
            
            gridPattern.style.backgroundSize = backgroundSize;
            gridPattern.style.backgroundPosition = backgroundPosition;
        }

        // Interaction State
        let isDragging = false;
        let lastMousePos = { x: 0, y: 0 };

        // Prevent default browser zoom and autoscroll
        container.addEventListener('wheel', (e) => {
            if (e.ctrlKey) e.preventDefault();
        }, { passive: false });
        
        container.addEventListener('mousedown', (e) => {
             if (e.button === 1) e.preventDefault();
        }, { passive: false });

        // Pan Logic (Pointer Events for better compatibility)
        container.addEventListener('pointerdown', (e) => {
            if (e.button === 1) { // Middle Click
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

        // Zoom Logic
        container.addEventListener('wheel', (e) => {
            if (e.ctrlKey) e.preventDefault(); // Prevent browser zoom
            e.preventDefault();

            const zoomFactor = -e.deltaY * 0.001;
            const scale = 1 + zoomFactor;
            const newZoom = Math.max(0.1, Math.min(5, viewport.zoom * scale));

            const rect = container.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            // Canvas coordinates of mouse
            const canvasX = (mouseX - viewport.x) / viewport.zoom;
            const canvasY = (mouseY - viewport.y) / viewport.zoom;

            // New viewport position
            const newX = mouseX - canvasX * newZoom;
            const newY = mouseY - canvasY * newZoom;

            viewport.zoom = newZoom;
            viewport.x = newX;
            viewport.y = newY;

            updateTransform();
        }, { passive: false });

        // Initial Render
        render();

    </script>
</body>
</html>
  `;
};
