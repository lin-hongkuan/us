/**
 * ==========================================
 * 图片懒加载组件
 * ==========================================
 *
 * 使用 Intersection Observer 实现视口检测：
 * - 骨架屏占位，平滑淡入
 * - 预加载阈值可配置
 * - 错误处理优雅降级
 * - 支持 loading="lazy" 作为备用方案
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
  /** 图片加载完成回调 */
  onLoad?: () => void;
  /** 图片加载失败回调 */
  onError?: () => void;
  /** 点击回调 */
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
  /** 是否显示骨架屏 */
  showSkeleton?: boolean;
  /** 图片宽度（用于骨架屏） */
  width?: number | string;
  /** 图片高度（用于骨架屏） */
  height?: number | string;
  /** 图片样式 */
  style?: React.CSSProperties;
}

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
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // 使用 Intersection Observer 检测视口
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 检查浏览器是否支持 Intersection Observer
    if (!('IntersectionObserver' in window)) {
      // 不支持时直接加载
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
      {
        rootMargin: `${threshold}px`,
        threshold: 0,
      }
    );

    observer.observe(container);

    return () => {
      observer.disconnect();
    };
  }, [threshold]);

  // 图片加载完成处理
  const handleLoad = useCallback(() => {
    setIsLoaded(true);
    onLoad?.();
  }, [onLoad]);

  // 图片加载失败处理
  const handleError = useCallback(() => {
    setHasError(true);
    setIsLoaded(true);
    onError?.();
  }, [onError]);

  // 如果是 base64 图片，直接加载（已经是本地数据）
  const isBase64 = src?.startsWith('data:');
  const shouldLoad = isInView || isBase64;

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
      {/* 骨架屏占位 */}
      {showSkeleton && !isLoaded && (
        <div
          className="absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 animate-pulse"
          style={{
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.5s infinite',
          }}
        />
      )}

      {/* 实际图片 */}
      {shouldLoad && !hasError && (
        <img
          ref={imgRef}
          src={src}
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

      {/* 错误状态 */}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800 text-gray-400">
          <svg
            className="w-8 h-8"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </div>
      )}
    </div>
  );
};

/**
 * 预加载图片 Hook
 * 用于在组件外部预加载图片
 */
export const useImagePreload = (urls: string[]) => {
  const [loadedCount, setLoadedCount] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (!urls || urls.length === 0) {
      setIsComplete(true);
      return;
    }

    let count = 0;
    const validUrls = urls.filter((url) => url && !url.startsWith('data:'));

    if (validUrls.length === 0) {
      setIsComplete(true);
      return;
    }

    validUrls.forEach((url) => {
      const img = new Image();
      img.onload = img.onerror = () => {
        count++;
        setLoadedCount(count);
        if (count >= validUrls.length) {
          setIsComplete(true);
        }
      };
      img.src = url;
    });
  }, [urls]);

  return { loadedCount, isComplete, total: urls?.length || 0 };
};

// 添加 shimmer 动画到全局 CSS（如果还没有的话）
const shimmerStyle = `
@keyframes shimmer {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}
`;

// 注入样式（仅在客户端）
if (typeof document !== 'undefined') {
  const existingStyle = document.getElementById('lazy-image-styles');
  if (!existingStyle) {
    const styleEl = document.createElement('style');
    styleEl.id = 'lazy-image-styles';
    styleEl.textContent = shimmerStyle;
    document.head.appendChild(styleEl);
  }
}

export default LazyImage;
