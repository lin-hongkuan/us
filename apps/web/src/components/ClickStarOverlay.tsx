import React, { useEffect, useRef, useState } from 'react';

interface Star {
  id: number;
  x: number;
  y: number;
}

interface StarPopEventDetail {
  x: number;
  y: number;
}

const STAR_POP_EVENT = 'us:star-pop';

export const dispatchStarPop = (x: number, y: number): void => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent<StarPopEventDetail>(STAR_POP_EVENT, {
      detail: { x, y }
    })
  );
};

export const ClickStarOverlay: React.FC = React.memo(() => {
  const [stars, setStars] = useState<Star[]>([]);
  const maxStars = 10;
  const lifeMs = 700;
  const throttleMs = 100;

  const starIdRef = useRef(0);
  const lastClickTimeRef = useRef(0);
  const timeoutIdsRef = useRef<number[]>([]);

  useEffect(() => {
    const handleStarPop = (event: Event) => {
      const customEvent = event as CustomEvent<StarPopEventDetail>;
      const point = customEvent.detail;
      if (!point) return;

      const now = Date.now();
      if (now - lastClickTimeRef.current < throttleMs) return;
      lastClickTimeRef.current = now;

      setStars((prev) => {
        const nextStar = { id: starIdRef.current++, x: point.x, y: point.y };
        if (prev.length >= maxStars) {
          return [...prev.slice(1), nextStar];
        }
        return [...prev, nextStar];
      });

      const timeoutId = window.setTimeout(() => {
        setStars((prev) => prev.slice(1));
        timeoutIdsRef.current = timeoutIdsRef.current.filter((id) => id !== timeoutId);
      }, lifeMs);
      timeoutIdsRef.current.push(timeoutId);
    };

    window.addEventListener(STAR_POP_EVENT, handleStarPop as EventListener);
    return () => {
      window.removeEventListener(STAR_POP_EVENT, handleStarPop as EventListener);
      timeoutIdsRef.current.forEach((id) => window.clearTimeout(id));
      timeoutIdsRef.current = [];
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-50">
      {stars.map((star) => (
        <div
          key={star.id}
          className="pointer-events-none absolute text-yellow-300 text-xl select-none star-pop drop-shadow-[0_0_6px_rgba(250,204,21,0.8)]"
          style={{ left: star.x, top: star.y }}
        >
          ★
        </div>
      ))}
    </div>
  );
});

ClickStarOverlay.displayName = 'ClickStarOverlay';

