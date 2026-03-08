/**
 * EXIF-Stripping & Image Resize Utility
 * 
 * Removes EXIF metadata (including GPS coordinates) from images
 * by re-drawing them on a canvas before upload.
 */

export async function stripExifAndResize(
  file: File,
  maxWidth: number = 1920,
  quality: number = 0.85
): Promise<File> {
  // Only process image files
  if (!file.type.startsWith('image/')) return file;
  
  // Skip SVGs (no EXIF)
  if (file.type === 'image/svg+xml') return file;

  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return resolve(file);

    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      const ratio = Math.min(1, maxWidth / img.width);
      canvas.width = img.width * ratio;
      canvas.height = img.height * ratio;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);

      canvas.toBlob(
        (blob) => {
          if (!blob) return resolve(file);
          const ext = file.type === 'image/png' ? '.png' : '.jpg';
          const outputType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
          resolve(
            new File([blob], file.name.replace(/\.[^.]+$/, ext), {
              type: outputType,
            })
          );
        },
        file.type === 'image/png' ? 'image/png' : 'image/jpeg',
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };

    img.src = url;
  });
}
