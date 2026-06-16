import { deleteImageKey, uploadImageFile } from './cloudflareClient';

const COMPRESSIBLE_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MIN_COMPRESSION_SIZE_BYTES = 300 * 1024;

export const extractStoragePathFromUrl = (imageUrl: string): string | null => {
  if (!imageUrl || imageUrl.startsWith('data:') || imageUrl.startsWith('blob:')) return null;

  try {
    const url = new URL(imageUrl, window.location.origin);
    const marker = '/images/';
    const idx = url.pathname.indexOf(marker);
    if (idx === -1) return null;
    return decodeURIComponent(url.pathname.slice(idx + marker.length));
  } catch {
    return null;
  }
};

export const compressImageToBlob = (file: File, maxWidth: number = 1200, quality: number = 0.8): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;

        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Cannot get canvas context'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to create blob'));
            }
          },
          'image/jpeg',
          quality,
        );
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
};

export const compressImage = (file: File, maxWidth: number = 1200, quality: number = 0.8): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;

        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Cannot get canvas context'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
};

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
};

export const prepareImageForUpload = async (file: File): Promise<File> => {
  if (!COMPRESSIBLE_IMAGE_TYPES.has(file.type) || file.size < MIN_COMPRESSION_SIZE_BYTES) {
    return file;
  }

  try {
    const blob = await compressImageToBlob(file);
    return new File([blob], file.name, {
      type: blob.type || 'image/jpeg',
      lastModified: file.lastModified,
    });
  } catch (e) {
    console.warn('Image compression failed; uploading original file:', e);
    return file;
  }
};

export const uploadImage = async (file: File): Promise<string | null> => {
  const uploadFile = await prepareImageForUpload(file);

  try {
    return await uploadImageFile(uploadFile);
  } catch (e) {
    console.error('Image upload failed:', e);
    try {
      return await fileToBase64(uploadFile);
    } catch {
      return null;
    }
  }
};

export const uploadImages = async (files: File[]): Promise<string[]> => {
  const uploadedUrls: string[] = [];

  for (const file of files) {
    const url = await uploadImage(file);
    if (!url) {
      throw new Error(`Image upload failed: ${file.name}`);
    }
    uploadedUrls.push(url);
  }

  return uploadedUrls;
};

export const deleteImage = async (imageUrl: string): Promise<boolean> => {
  if (!imageUrl || imageUrl.startsWith('data:') || imageUrl.startsWith('blob:')) return true;

  try {
    const key = extractStoragePathFromUrl(imageUrl) || imageUrl;
    await deleteImageKey(key);
    return true;
  } catch (e) {
    console.error('Image deletion failed:', e);
    return false;
  }
};
