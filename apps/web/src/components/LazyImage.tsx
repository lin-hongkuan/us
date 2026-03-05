/**
 * 图片懒加载组件
 *
 * IntersectionObserver 驱动的视口检测：
 * - 骨架屏占位，shimmer 过渡
 * - 预加载阈值可配置
 * - 失败自动回退 fallbackSrc → 指数退避重试 → 错误态点击重试
 * - 支持 loading="lazy" + decoding="async"
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';

interface LazyImageProps {
  src: string;
  alt?: string;
  className?: string;
  imgClassName?: string;
  placeholderClassName?: string;
  /** 预加载阈值，距离视口多少像素时开始加载 */
  threshold?: number;
  onLoad?: () => void;
  onError?: () => void;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
  showSkeleton?: boolean;
  width?: number | string;
  height?: number | string;
  style?: React.CSSProperties;
  /** 主 src 加载失败时的回退 URL（如缩略图变换失败回退到原图） */
  fallbackSrc?: string;
}

/**
 * Supabase Storage 缩略图 URL 生成。
 * 将 /object/public/ 替换为 /render/image/public/ 并附加变换参数。
 * 非 Supabase URL、base64、blob 原样返回。
 */
export const getResizedUrl = (
  url: string,
  width: number,
  height?: number,
): string => {
  if (!url || url.startsWith('data:') || url.startsWith('blob:')) return url;
  if (!url.includes('supabase.co/storage/v1/object/public/')) return url;
  const transformed = url.replace(
    '/storage/v1/object/public/',
    '/storage/v1/render/image/public/',
  );
  const sep = transformed.includes('?') ? '&' : '?';
  return `${transformed}${sep}width=${width}${height ? `&height=${height}` : ''}&resize=cover`;
};

export const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt = '',
  className = '',
  imgClassName = 'w-full h-full object-cover',
  placeholderClassName = '',
  threshold = 200,
  onLoad,
  onError,
  onClick,
  showSkeleton = true,
  width,
  height,
  style,
  fallbackSrc,
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [useFallback, setUseFallback] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const MAX_RETRIES = 2;

  // src 变化时重置所有加载状态并清除待执行的重试定时器
  useEffect(() => {
    clearTimeout(retryTimerRef.current);
    setIsLoaded(false);
    setHasError(false);
    setUseFallback(false);
    setRetryCount(0);
  }, [src]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    if (!('IntersectionObserver' in window)) {
      setIsInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.unobserve(container);
          }
        });
      },
      { rootMargin: `${threshold}px`, threshold: 0 },
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, [threshold]);

  const handleLoad = useCallback(() => {
    setIsLoaded(true);
    onLoad?.();
  }, [onLoad]);

  const handleError = useCallback(() => {
    // 优先尝试 fallbackSrc
    if (!useFallback && fallbackSrc && fallbackSrc !== src) {
      setUseFallback(true);
      return;
    }
    // 指数退避自动重试
    if (retryCount < MAX_RETRIES) {
      retryTimerRef.current = setTimeout(() => setRetryCount((c) => c + 1), 1000 * (retryCount + 1));
      return;
    }
    setHasError(true);
    setIsLoaded(true);
    onError?.();
  }, [onError, useFallback, fallbackSrc, src, retryCount]);

  const handleRetry = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setHasError(false);
    setIsLoaded(false);
    setUseFallback(false);
    setRetryCount(0);
  }, []);

  const isBase64 = src?.startsWith('data:');
  const isBlob = src?.startsWith('blob:');
  const shouldLoad = isInView || isBase64 || isBlob;

  const currentSrc = useFallback && fallbackSrc ? fallbackSrc : src;
  // 重试时追加 cache-buster 避免命中浏览器错误缓存
  const effectiveSrc =
    retryCount > 0 && !isBase64 && !isBlob
      ? `${currentSrc}${currentSrc.includes('?') ? '&' : '?'}_r=${retryCount}`
      : currentSrc;

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden ${className} ${placeholderClassName}`}
      style={{
        ...(width ? { width } : {}),
        ...(height ? { height } : {}),
        ...style,
      }}
      onClick={onClick}
    >
      {/* 骨架屏：shimmer 关键帧已在 index.css 中定义 */}
      {showSkeleton && !isLoaded && (
        <div
          className="absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700"
          style={{ backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }}
        />
      )}

      {shouldLoad && !hasError && (
        <img
          src={effectiveSrc}
          alt={alt}
          className={`transition-opacity duration-300 ease-in-out ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          } ${imgClassName}`}
          onLoad={handleLoad}
          onError={handleError}
          loading="lazy"
          decoding="async"
        />
      )}

      {hasError && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-pointer gap-1.5"
          onClick={handleRetry}
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <span className="text-[10px]">点击重试</span>
        </div>
      )}
    </div>
  );
};

export default LazyImage;
