
import { CanvasObject, Viewport } from '../types/canvas';

interface ImportResult {
  viewport: Viewport | null;
  objects: CanvasObject[];
}

export const parseLargeHtmlFile = async (file: File): Promise<ImportResult> => {
  const objects: CanvasObject[] = [];
  let viewport: Viewport | null = null;
  
  const stream = file.stream();
  const reader = stream.getReader();
  const decoder = new TextDecoder('utf-8');
  
  let buffer = '';
  
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      
      // Process lines
      let newlineIndex = buffer.indexOf('\n');
      while (newlineIndex !== -1) {
        const line = buffer.slice(0, newlineIndex);
        buffer = buffer.slice(newlineIndex + 1);
        
        processLine(line);
        newlineIndex = buffer.indexOf('\n');
      }
    }
    
    // Process remaining buffer
    if (buffer.length > 0) {
      processLine(buffer);
    }
  } finally {
    reader.releaseLock();
  }
  
  function processLine(line: string) {
    // Check for Viewport
    if (!viewport) {
      // <script id="datapureref-viewport" type="application/json">...</script>
      const viewportMatch = line.match(/<script id="datapureref-viewport" type="application\/json">(.*?)<\/script>/);
      if (viewportMatch && viewportMatch[1]) {
        try {
          viewport = JSON.parse(viewportMatch[1]);
        } catch (e) {
          console.error('Failed to parse viewport JSON', e);
        }
        return;
      }
      
      // Legacy Format Viewport (Regex fallback for streaming?)
      // The legacy format puts everything in one line or scattered. 
      // We focus on the NEW format here.
    }
    
    // Check for Object
    // <script type="application/json" data-datapureref-object="1">...</script>
    const objectMatch = line.match(/<script type="application\/json" data-datapureref-object="1">(.*?)<\/script>/);
    if (objectMatch && objectMatch[1]) {
      try {
        const obj = JSON.parse(objectMatch[1]);
        if (obj) objects.push(obj);
      } catch (e) {
        console.error('Failed to parse object JSON', e);
      }
    }
  }
  
  return { viewport, objects };
};
