import { useCallback, useState } from 'react';

/**
 * 把藏在 Composer 输入里的彩蛋触发逻辑抽出来。
 * - tryConsumeAsEasterEgg: 把要保存的文本喂进来，如果命中彩蛋就返回 true（不再走正常保存流）
 * - 各 close handler 用来在彩蛋退出时关掉对应模式
 *
 * 想加新彩蛋时，把魔法字符串放到这里就够了，不用动 App 主流程。
 */
export interface UseEasterEggsResult {
  isGravityMode: boolean;
  isGame2048Open: boolean;
  tryConsumeAsEasterEgg: (content: string) => boolean;
  closeGravity: () => void;
  closeGame2048: () => void;
}

const EASTER_EGGS = {
  '1104': 'gravity',
  '2005': 'game2048',
} as const;

export const useEasterEggs = (): UseEasterEggsResult => {
  const [isGravityMode, setIsGravityMode] = useState(false);
  const [isGame2048Open, setIsGame2048Open] = useState(false);

  const tryConsumeAsEasterEgg = useCallback((content: string): boolean => {
    const trimmed = content.trim();
    const target = EASTER_EGGS[trimmed as keyof typeof EASTER_EGGS];
    if (!target) return false;

    if (target === 'gravity') {
      setIsGravityMode(true);
      return true;
    }
    if (target === 'game2048') {
      setIsGame2048Open(true);
      return true;
    }
    return false;
  }, []);

  const closeGravity = useCallback(() => setIsGravityMode(false), []);
  const closeGame2048 = useCallback(() => setIsGame2048Open(false), []);

  return {
    isGravityMode,
    isGame2048Open,
    tryConsumeAsEasterEgg,
    closeGravity,
    closeGame2048,
  };
};
