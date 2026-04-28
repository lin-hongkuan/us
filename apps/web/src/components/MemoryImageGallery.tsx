import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Download, Loader2, Maximize2, Trash, X } from 'lucide-react';
import { LazyImage, getResizedUrl } from './LazyImage';
import { type DisplayImage } from '../hooks/useMemoryCardEditor';

interface MemoryImageGalleryProps {
  images: DisplayImage[];
  memoryId: string;
  isEditing: boolean;
  isHer: boolean;
  onRemoveImage: (image: DisplayImage) => void;
}

const SWIPE_THRESHOLD = 48;

export const MemoryImageGallery: React.FC<MemoryImageGalleryProps> = React.memo(({
  images,
  memoryId,
  isEditing,
  isHer,
  onRemoveImage,
}) => {
  const [expandedImageIndex, setExpandedImageIndex] = useState<number | null>(null);
  const [previewImageIndex, setPreviewImageIndex] = useState<number | null>(null);
  const [isImageExpanded, setIsImageExpanded] = useState(false);
  const [fullscreenLoaded, setFullscreenLoaded] = useState(false);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const mainPreviewIndex = previewImageIndex !== null && previewImageIndex < images.length ? previewImageIndex : 0;

  const closeFullscreen = useCallback(() => {
    setExpandedImageIndex(null);
    setFullscreenLoaded(false);
    touchStartRef.current = null;
  }, []);

  const navigateFullscreen = useCallback((direction: -1 | 1) => {
    if (images.length <= 1) return;

    setFullscreenLoaded(false);
    setExpandedImageIndex((prev) => {
      const nextIndex = prev !== null ? (prev + direction + images.length) % images.length : 0;
      setPreviewImageIndex(nextIndex);
      return nextIndex;
    });
  }, [images.length]);

  const openFullscreen = useCallback((index: number) => {
    setFullscreenLoaded(false);
    setExpandedImageIndex(index);
    setPreviewImageIndex(index);
  }, []);

  useEffect(() => {
    if (expandedImageIndex === null) return;
    setFullscreenLoaded(false);

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeFullscreen();
        return;
      }

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        navigateFullscreen(-1);
        return;
      }

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        navigateFullscreen(1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [expandedImageIndex, closeFullscreen, navigateFullscreen]);

  useEffect(() => {
    if (expandedImageIndex === null) return;
    if (images.length === 0) {
      closeFullscreen();
      return;
    }
    if (expandedImageIndex >= images.length) {
      setExpandedImageIndex(images.length - 1);
      setPreviewImageIndex(images.length - 1);
    }
  }, [expandedImageIndex, images.length, closeFullscreen]);

  if (images.length === 0) return null;

  const currentImage = images[mainPreviewIndex];
  const expandedImage = expandedImageIndex !== null ? images[expandedImageIndex] : null;

  const handleRemoveCurrentImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRemoveImage(currentImage);
    if (mainPreviewIndex >= images.length - 1) {
      setPreviewImageIndex(Math.max(0, images.length - 2));
    }
  };

  const handleFullscreenTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (!touch) return;
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleFullscreenTouchEnd = (e: React.TouchEvent) => {
    const touchStart = touchStartRef.current;
    const touch = e.changedTouches[0];
    touchStartRef.current = null;
    if (!touchStart || !touch || images.length <= 1) return;

    const deltaX = touch.clientX - touchStart.x;
    const deltaY = touch.clientY - touchStart.y;
    const isHorizontalSwipe = Math.abs(deltaX) > SWIPE_THRESHOLD && Math.abs(deltaX) > Math.abs(deltaY) * 1.2;

    if (!isHorizontalSwipe) return;
    navigateFullscreen(deltaX < 0 ? 1 : -1);
  };

  return (
    <div className="mb-4">
      <div className="relative rounded-xl overflow-hidden group/image mb-2 shadow-sm">
        <LazyImage
          src={currentImage.url}
          alt="Memory Main"
          className={`w-full transition-all duration-300 cursor-pointer ${isImageExpanded ? 'max-h-[75vh]' : 'max-h-64'}`}
          onClick={(e) => {
            e.stopPropagation();
            if (!isEditing) {
              setIsImageExpanded(!isImageExpanded);
            }
          }}
        />

        {!isEditing && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              openFullscreen(mainPreviewIndex);
            }}
            className="absolute top-2 right-2 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white opacity-100 md:opacity-0 md:group-hover/image:opacity-100 transition-all duration-300 transform hover:scale-110"
            title="全屏查看"
            aria-label="全屏查看照片"
          >
            <Maximize2 size={16} />
          </button>
        )}

        {isEditing && (
          <div className="absolute top-2 right-2 flex gap-2 opacity-100 md:opacity-0 md:group-hover/image:opacity-100 transition-all duration-300">
            <button
              type="button"
              onClick={handleRemoveCurrentImage}
              className="p-2 bg-black/50 hover:bg-red-500/70 rounded-full text-white"
              title="删除图片"
              aria-label="删除当前图片"
            >
              <Trash size={16} />
            </button>
          </div>
        )}

        {!isEditing && (
          <div className="absolute bottom-2 right-2 flex gap-2 opacity-100 md:opacity-0 md:group-hover/image:opacity-100 transition-all duration-300">
            <a
              href={currentImage.url}
              download={`memory-${memoryId}-${mainPreviewIndex}.jpg`}
              onClick={(e) => e.stopPropagation()}
              className="p-2 bg-black/50 hover:bg-black/70 rounded-full text-white"
              title="下载图片"
              aria-label="下载当前图片"
            >
              <Download size={16} />
            </a>
          </div>
        )}

        {images.length > 1 && (
          <div className="absolute left-2 bottom-2 rounded-full bg-black/45 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-md opacity-100 md:opacity-0 md:group-hover/image:opacity-100 transition-opacity">
            {mainPreviewIndex + 1} / {images.length}
          </div>
        )}
      </div>

      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar snap-x snap-mandatory">
          {images.map((img, index) => (
            <button
              key={`${img.url}-${index}`}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setPreviewImageIndex(index);
                setIsImageExpanded(false);
              }}
              className={`relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all duration-200 snap-start ${
                mainPreviewIndex === index
                  ? (isHer ? 'border-rose-400 ring-2 ring-rose-200 dark:ring-rose-900/60' : 'border-sky-400 ring-2 ring-sky-200 dark:ring-sky-900/60')
                  : 'border-transparent opacity-70 hover:opacity-100'
              }`}
              aria-label={`查看第 ${index + 1} 张照片`}
            >
              <LazyImage
                src={getResizedUrl(img.url, 128, 128)}
                fallbackSrc={img.url}
                alt={`Thumbnail ${index + 1}`}
                className="w-full h-full"
              />
            </button>
          ))}
        </div>
      )}

      {expandedImageIndex !== null && expandedImage && createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm animate-in fade-in duration-300 select-none"
          role="dialog"
          aria-modal="true"
          aria-label="全屏查看回忆照片"
          onClick={(e) => {
            e.stopPropagation();
            closeFullscreen();
          }}
          onTouchStart={handleFullscreenTouchStart}
          onTouchEnd={handleFullscreenTouchEnd}
        >
          <div className="absolute top-4 left-4 right-4 z-[110] flex items-center justify-between gap-3 md:top-6 md:left-6 md:right-6">
            <a
              href={expandedImage.url}
              download={`memory-${memoryId}-${expandedImageIndex}.jpg`}
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-xs font-medium text-white backdrop-blur-md transition-colors hover:bg-white/20"
              aria-label="下载当前全屏图片"
            >
              <Download size={16} />
              <span className="hidden sm:inline">保存</span>
            </a>

            {images.length > 1 && (
              <div className="rounded-full bg-black/45 px-4 py-2 text-sm font-medium text-white backdrop-blur-md">
                {expandedImageIndex + 1} / {images.length}
              </div>
            )}

            <button
              type="button"
              className="p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                closeFullscreen();
              }}
              aria-label="关闭全屏查看"
            >
              <X size={24} />
            </button>
          </div>

          {images.length > 1 && (
            <>
              <button
                type="button"
                className="absolute left-3 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors z-[110] md:left-4"
                onClick={(e) => {
                  e.stopPropagation();
                  navigateFullscreen(-1);
                }}
                aria-label="上一张照片"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
              </button>
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors z-[110] md:right-4"
                onClick={(e) => {
                  e.stopPropagation();
                  navigateFullscreen(1);
                }}
                aria-label="下一张照片"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
              </button>
            </>
          )}

          <div className="relative flex items-center justify-center px-4" onClick={(e) => e.stopPropagation()}>
            {!fullscreenLoaded && (
              <Loader2 className="absolute w-8 h-8 text-white/70 animate-spin" />
            )}
            <img
              src={expandedImage.url}
              alt="Full screen memory"
              className={`w-auto h-auto max-w-[92vw] max-h-[78vh] object-contain rounded-lg shadow-2xl transition-opacity duration-300 ${fullscreenLoaded ? 'opacity-100' : 'opacity-0'}`}
              onLoad={() => setFullscreenLoaded(true)}
              draggable={false}
            />
          </div>

          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-4 py-2 text-center text-xs font-medium text-white/85 backdrop-blur-md md:bottom-6">
            {images.length > 1 ? '左右滑动或按 ← → 切换 · Esc 关闭' : '点击空白处或按 Esc 关闭'}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
});

MemoryImageGallery.displayName = 'MemoryImageGallery';
