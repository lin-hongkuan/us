import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * 长按打开设置的手势 hook。
 *
 * 特性：
 * - 用 requestAnimationFrame 驱动 0 → 1 的平滑进度，便于 UI 做环形进度 / 光晕 / 图标渐变
 * - 提前松手会从当前进度平滑衰减回 0
 * - 触达阈值时触发回调 + 振动反馈，并暴露 completionTick 让 UI 重放"完成爆发"动画
 * - 通过 consumeLongPressClick() 让点击处理器跳过紧随其后的 click（防止同时触发切换用户）
 */
interface UseSettingsLongPressOptions {
  onTrigger: () => void;
  /** 长按需要持续的毫秒数（默认 700ms） */
  durationMs?: number;
}

interface UseSettingsLongPressResult {
  /** 0 .. 1 的进度，用于环形填充/透明度/缩放插值 */
  progress: number;
  /** 当前是否处于按压（含衰减）阶段 */
  isPressing: boolean;
  /** 每次成功触达阈值时自增的计数，用作完成动画 key */
  completionTick: number;
  /** 绑定到按钮的 pointer 事件 */
  bindings: {
    onPointerDown: (event: React.PointerEvent<HTMLButtonElement>) => void;
    onPointerUp: () => void;
    onPointerCancel: () => void;
    onPointerLeave: () => void;
  };
  /**
   * 在按钮的 click 处理器里调用：如果刚刚由于长按触发过，会消费这个标志并返回 true，
   * 调用方应当跳过原本 click 的副作用（例如切换用户 / 退出）。
   */
  consumeLongPressClick: () => boolean;
}

const DECAY_DURATION_MS = 240;
const COMPLETION_HOLD_MS = 220;

export const useSettingsLongPress = ({
  onTrigger,
  durationMs = 700,
}: UseSettingsLongPressOptions): UseSettingsLongPressResult => {
  const [progress, setProgress] = useState(0);
  const [isPressing, setIsPressing] = useState(false);
  const [completionTick, setCompletionTick] = useState(0);

  const rafRef = useRef<number | null>(null);
  const holdTimerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const progressRef = useRef<number>(0);
  const triggeredRef = useRef<boolean>(false);
  const decayingRef = useRef<boolean>(false);

  const onTriggerRef = useRef(onTrigger);
  useEffect(() => {
    onTriggerRef.current = onTrigger;
  }, [onTrigger]);

  const cancelRaf = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const clearHoldTimer = useCallback(() => {
    if (holdTimerRef.current !== null) {
      window.clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  }, []);

  const runDecay = useCallback((fromProgress: number) => {
    decayingRef.current = true;
    const decayStart = performance.now();

    const tick = () => {
      const elapsed = performance.now() - decayStart;
      const t = Math.min(elapsed / DECAY_DURATION_MS, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3);
      const next = fromProgress * (1 - eased);
      progressRef.current = next;
      setProgress(next);

      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      progressRef.current = 0;
      rafRef.current = null;
      decayingRef.current = false;
      setProgress(0);
      setIsPressing(false);
    };

    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>) => {
      // 忽略鼠标右键/中键
      if (event.pointerType === 'mouse' && event.button !== 0) return;

      cancelRaf();
      clearHoldTimer();
      decayingRef.current = false;
      triggeredRef.current = false;
      progressRef.current = 0;
      setIsPressing(true);
      setProgress(0);
      startTimeRef.current = performance.now();

      // 起手的温柔回馈
      if (navigator.vibrate) navigator.vibrate(12);

      const tick = () => {
        const elapsed = performance.now() - startTimeRef.current;
        const t = Math.min(elapsed / durationMs, 1);
        progressRef.current = t;
        setProgress(t);

        if (t >= 1) {
          triggeredRef.current = true;
          rafRef.current = null;

          // 完成：强反馈 + 自增 completionTick 让 UI 重放爆发动画
          if (navigator.vibrate) navigator.vibrate([28, 40, 28]);
          setCompletionTick((tick) => tick + 1);
          onTriggerRef.current();

          // 短暂保持填满的环，再平滑衰减
          holdTimerRef.current = window.setTimeout(() => {
            holdTimerRef.current = null;
            runDecay(1);
          }, COMPLETION_HOLD_MS);
          return;
        }

        rafRef.current = requestAnimationFrame(tick);
      };

      rafRef.current = requestAnimationFrame(tick);
    },
    [cancelRaf, clearHoldTimer, durationMs, runDecay],
  );

  const handlePointerEnd = useCallback(() => {
    // 正在自动衰减或已触发，交给完成流程
    if (decayingRef.current || triggeredRef.current) return;
    if (!isPressing) return;

    cancelRaf();
    runDecay(progressRef.current);
  }, [cancelRaf, isPressing, runDecay]);

  useEffect(() => () => {
    cancelRaf();
    clearHoldTimer();
  }, [cancelRaf, clearHoldTimer]);

  const consumeLongPressClick = useCallback((): boolean => {
    if (triggeredRef.current) {
      triggeredRef.current = false;
      return true;
    }
    return false;
  }, []);

  return {
    progress,
    isPressing,
    completionTick,
    bindings: {
      onPointerDown: handlePointerDown,
      onPointerUp: handlePointerEnd,
      onPointerCancel: handlePointerEnd,
      onPointerLeave: handlePointerEnd,
    },
    consumeLongPressClick,
  };
};
