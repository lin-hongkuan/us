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
