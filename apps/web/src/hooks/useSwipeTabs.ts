import React, { useRef } from 'react';
import { UserType } from '../types';

interface UseSwipeTabsOptions {
  activeTab: UserType;
  setActiveTab: (tab: UserType) => void;
  playClickSound: (type?: 'default' | 'her' | 'him' | 'action' | 'stamp') => void;
}

export const useSwipeTabs = ({ activeTab, setActiveTab, playClickSound }: UseSwipeTabsOptions) => {
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const touchEndRef = useRef<{ x: number; y: number } | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchEndRef.current = null;
    touchStartRef.current = {
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
    };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndRef.current = {
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
    };
  };

  const handleTouchEnd = () => {
    const touchStart = touchStartRef.current;
    const touchEnd = touchEndRef.current;
    if (!touchStart || !touchEnd) return;

    const distanceX = touchStart.x - touchEnd.x;
    const distanceY = touchStart.y - touchEnd.y;
    const isMainlyHorizontal = Math.abs(distanceX) > Math.abs(distanceY);

    if (isMainlyHorizontal && distanceX > 50 && activeTab === UserType.HER) {
      setActiveTab(UserType.HIM);
      playClickSound('him');
    } else if (isMainlyHorizontal && distanceX < -50 && activeTab === UserType.HIM) {
      setActiveTab(UserType.HER);
      playClickSound('her');
    }

    touchStartRef.current = null;
    touchEndRef.current = null;
  };

  return { handleTouchStart, handleTouchMove, handleTouchEnd };
};
