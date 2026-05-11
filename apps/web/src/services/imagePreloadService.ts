const imageUrlCache = new Map<string, string>();

const requestIdle = (callback: () => void): void => {
  const requestIdleCallback = window.requestIdleCallback;
  if (requestIdleCallback) {
    requestIdleCallback(callback, { timeout: 2000 });
    return;
  }
  setTimeout(callback, 250);
};

export const preloadImage = (url: string): Promise<void> => {
  if (!url || url.startsWith('data:') || url.startsWith('blob:') || imageUrlCache.has(url)) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      imageUrlCache.set(url, url);
      resolve();
    };
    img.onerror = () => {
      resolve();
    };
    img.src = url;
  });
};

export const preloadImages = async (urls: string[]): Promise<void> => {
  const uniqueUrls = [...new Set(urls.filter(url => url && !url.startsWith('data:') && !url.startsWith('blob:')))];
  const batch = uniqueUrls.slice(0, 10);
  const concurrency = 2;
  for (let i = 0; i < batch.length; i += concurrency) {
    await Promise.all(batch.slice(i, i + concurrency).map(preloadImage));
  }
};

export const scheduleImagePreload = (urls: string[]): void => {
  if (urls.length === 0 || typeof window === 'undefined') return;
  requestIdle(() => {
    void preloadImages(urls);
  });
};

// 检查图片是否已缓存
export const isImageCached = (url: string): boolean => {
  if (!url || url.startsWith('data:') || url.startsWith('blob:')) return true;
  return imageUrlCache.has(url);
};

// 高优先级预加载（立即执行，不等待空闲）
export const preloadImageHighPriority = (url: string): Promise<void> => {
  if (!url || url.startsWith('data:') || url.startsWith('blob:') || imageUrlCache.has(url)) {
    return Promise.resolve();
  }
  return preloadImage(url);
};

// 批量预加载指定优先级的图片
export const preloadImagesWithPriority = async (
  urls: string[],
  priority: 'high' | 'normal' | 'low' = 'normal'
): Promise<void> => {
  const uniqueUrls = [...new Set(urls.filter(url => url && !url.startsWith('data:') && !url.startsWith('blob:')))];

  // 根据优先级决定批次大小和并发数
  const config = {
    high: { batchSize: 5, concurrency: 3 },
    normal: { batchSize: 10, concurrency: 2 },
    low: { batchSize: 15, concurrency: 1 },
  }[priority];

  const batch = uniqueUrls.slice(0, config.batchSize);
  for (let i = 0; i < batch.length; i += config.concurrency) {
    await Promise.all(batch.slice(i, i + config.concurrency).map(preloadImage));
  }
};

// 调度优先级预加载
export const schedulePriorityPreload = (
  urls: string[],
  priority: 'high' | 'normal' | 'low' = 'normal'
): void => {
  if (urls.length === 0 || typeof window === 'undefined') return;

  if (priority === 'high') {
    // 高优先级立即执行
    void preloadImagesWithPriority(urls, 'high');
  } else {
    // 其他优先级等待空闲
    requestIdle(() => {
      void preloadImagesWithPriority(urls, priority);
    });
  }
};
