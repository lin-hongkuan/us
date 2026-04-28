import { MAX_IMAGE_SIZE_BYTES, MAX_IMAGE_SIZE_MB, MAX_MEMORY_IMAGES } from '../config/constants';

export interface ImageValidationIssue {
  fileName: string;
  reason: string;
}

export interface ImageValidationResult {
  acceptedFiles: File[];
  issues: ImageValidationIssue[];
  remainingSlots: number;
}

const IMAGE_EXTENSION_PATTERN = /\.(png|jpe?g|gif|webp|avif|bmp|heic|heif)$/i;

const isImageFile = (file: File): boolean => {
  if (file.type) return file.type.startsWith('image/');
  return IMAGE_EXTENSION_PATTERN.test(file.name);
};

export const validateImageFiles = (files: File[], existingImageCount = 0): ImageValidationResult => {
  const acceptedFiles: File[] = [];
  const issues: ImageValidationIssue[] = [];
  const initialRemainingSlots = Math.max(MAX_MEMORY_IMAGES - existingImageCount, 0);

  for (const file of files) {
    if (!isImageFile(file)) {
      issues.push({
        fileName: file.name || '未命名文件',
        reason: '只支持图片文件',
      });
      continue;
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      issues.push({
        fileName: file.name || '未命名图片',
        reason: `单张图片不能超过 ${MAX_IMAGE_SIZE_MB}MB`,
      });
      continue;
    }

    if (acceptedFiles.length >= initialRemainingSlots) {
      issues.push({
        fileName: file.name || '未命名图片',
        reason: `每条回忆最多只能放 ${MAX_MEMORY_IMAGES} 张图片`,
      });
      continue;
    }

    acceptedFiles.push(file);
  }

  return {
    acceptedFiles,
    issues,
    remainingSlots: Math.max(initialRemainingSlots - acceptedFiles.length, 0),
  };
};

export const formatImageValidationIssues = (issues: ImageValidationIssue[]): string => {
  if (issues.length === 0) return '';

  const visibleIssues = issues.slice(0, 3).map(issue => `${issue.fileName}：${issue.reason}`);
  const hiddenCount = issues.length - visibleIssues.length;

  return hiddenCount > 0
    ? `${visibleIssues.join('\n')}\n还有 ${hiddenCount} 个文件未添加`
    : visibleIssues.join('\n');
};
