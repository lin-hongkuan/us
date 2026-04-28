import { useEffect } from 'react';

interface TauriWindow extends Window {
  __TAURI_INTERNALS__?: unknown;
}

export const isTauriRuntime = (): boolean => {
  return Boolean((window as TauriWindow).__TAURI_INTERNALS__);
};

export const useTauriComposerShortcut = (enabled: boolean, onOpenComposer: () => void): void => {
  useEffect(() => {
    if (!enabled || !isTauriRuntime()) return;

    let cleanup: (() => void) | undefined;
    let disposed = false;

    import('@tauri-apps/api/event').then(({ listen }) => {
      if (disposed) return;
      listen('open-composer', onOpenComposer).then((unlisten) => {
        if (disposed) {
          unlisten();
          return;
        }
        cleanup = unlisten;
      });
    });

    return () => {
      disposed = true;
      cleanup?.();
    };
  }, [enabled, onOpenComposer]);
};
