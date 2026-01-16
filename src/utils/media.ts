
export const generateVideoThumbnail = async (file: File | Blob): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    
    const url = URL.createObjectURL(file);
    video.src = url;

    video.onloadeddata = () => {
      // Seek to 10% or 1s to capture a meaningful frame
      video.currentTime = Math.min(1, video.duration / 10);
    };

    video.onseeked = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        // Limit thumbnail size (e.g. max 720p) to save memory
        const MAX_DIM = 720;
        if (canvas.width > MAX_DIM || canvas.height > MAX_DIM) {
            const scale = Math.min(MAX_DIM / canvas.width, MAX_DIM / canvas.height);
            canvas.width *= scale;
            canvas.height *= scale;
        }

        const ctx = canvas.getContext('2d');
        if (!ctx) {
            reject(new Error('Failed to get canvas context'));
            return;
        }

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to generate thumbnail blob'));
          }
          // Cleanup
          URL.revokeObjectURL(url);
          video.remove();
        }, 'image/jpeg', 0.7);
      } catch (err) {
        reject(err);
      }
    };

    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Video load failed'));
    };
  });
};
