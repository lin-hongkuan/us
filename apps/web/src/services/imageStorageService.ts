import { supabase } from './supabaseClient';

const STORAGE_BUCKET = 'memory-images';

export const extractStoragePathFromUrl = (imageUrl: string): string | null => {
  if (!imageUrl || imageUrl.startsWith('data:')) return null;

  try {
    const url = new URL(imageUrl);
    const marker = '/storage/v1/object/public/';
    const idx = url.pathname.indexOf(marker);
    if (idx === -1) return null;

    const fullPath = decodeURIComponent(url.pathname.slice(idx + marker.length));
    const [bucket, ...segments] = fullPath.split('/');
    if (!bucket || bucket !== STORAGE_BUCKET || segments.length === 0) return null;

    return segments.join('/');
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

export const uploadImage = async (file: File): Promise<string | null> => {
  if (!supabase) {
    return fileToBase64(file);
  }

  try {
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const filename = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${ext}`;

    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(filename, file, {
        contentType: file.type,
        cacheControl: '31536000',
      });

    if (error) throw error;

    const { data: urlData } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(data.path);

    return urlData.publicUrl;
  } catch (e) {
    console.error('Image upload failed:', e);
    console.warn('Falling back to base64 storage');
    return fileToBase64(file);
  }
};

export const deleteImage = async (imageUrl: string): Promise<boolean> => {
  if (!supabase || !imageUrl) return true;

  const filePath = extractStoragePathFromUrl(imageUrl);
  if (!filePath) return true;

  try {
    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .remove([filePath]);

    if (error) {
      console.error('Failed to delete image:', error);
      return false;
    }
    return true;
  } catch (e) {
    console.error('Image deletion failed:', e);
    return false;
  }
};
