import React, { useEffect, useRef } from 'react';
import { UserType } from '../types';

export const useHideHeaderOnScroll = (headerRef: React.RefObject<HTMLElement | null>) => {
  const scrollPositions = useRef({ [UserType.HER]: 0, [UserType.HIM]: 0 });
  const latestScrollTop = useRef({ [UserType.HER]: 0, [UserType.HIM]: 0 });
  const scrollRafRef = useRef<number | null>(null);
  const headerHiddenRef = useRef(false);

  useEffect(() => {
    return () => {
      if (scrollRafRef.current !== null) cancelAnimationFrame(scrollRafRef.current);
    };
  }, []);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>, type: UserType) => {
    latestScrollTop.current[type] = e.currentTarget.scrollTop;
    if (scrollRafRef.current !== null) return;

    scrollRafRef.current = requestAnimationFrame(() => {
      scrollRafRef.current = null;
      const scrollTop = latestScrollTop.current[type];
      const last = scrollPositions.current[type];
      const diff = scrollTop - last;

      if (Math.abs(diff) < 10) return;

      const shouldHide = diff > 0 && scrollTop > 80;
      const shouldShow = diff < 0 || scrollTop < 20;

      if (headerRef.current) {
        if (!headerHiddenRef.current && shouldHide) {
          headerHiddenRef.current = true;
          headerRef.current.classList.add('header-hidden');
        } else if (headerHiddenRef.current && shouldShow) {
          headerHiddenRef.current = false;
          headerRef.current.classList.remove('header-hidden');
        }
      }

      scrollPositions.current[type] = scrollTop;
    });
  };

  return handleScroll;
};
