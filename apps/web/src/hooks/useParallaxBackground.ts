import { useEffect, useRef } from 'react';

export const useParallaxBackground = () => {
  const backgroundRef = useRef<HTMLDivElement>(null);
  const mousePos = useRef({ x: 0, y: 0 });
  const currentPos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const isDesktopPointer = window.matchMedia('(pointer: fine)').matches;
    const isWideEnough = window.matchMedia('(min-width: 768px)').matches;
    if (!isDesktopPointer || !isWideEnough) return;

    const target = backgroundRef.current;
    if (!target) return;

    let frameId: number | null = null;
    let isRunning = true;
    const ease = 0.015;
    const epsilon = 0.001;

    const animate = () => {
      frameId = null;
      if (!isRunning || document.hidden) return;

      const deltaX = mousePos.current.x - currentPos.current.x;
      const deltaY = mousePos.current.y - currentPos.current.y;
      if (Math.abs(deltaX) < epsilon && Math.abs(deltaY) < epsilon) return;

      currentPos.current.x += deltaX * ease;
      currentPos.current.y += deltaY * ease;
      target.style.transform = `translate3d(${currentPos.current.x * 60}px, ${currentPos.current.y * 60}px, 0)`;
      requestTick();
    };

    const requestTick = () => {
      if (!isRunning || frameId !== null) return;
      frameId = requestAnimationFrame(animate);
    };

    const handleMouseMove = (e: MouseEvent) => {
      mousePos.current = {
        x: (e.clientX / window.innerWidth) * 2 - 1,
        y: (e.clientY / window.innerHeight) * 2 - 1,
      };
      requestTick();
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) requestTick();
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    document.addEventListener('visibilitychange', handleVisibilityChange);
    requestTick();

    return () => {
      isRunning = false;
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (frameId !== null) cancelAnimationFrame(frameId);
    };
  }, []);

  return backgroundRef;
};
