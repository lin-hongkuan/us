/**
 * ==========================================
 * 打字机文字组件
 * ==========================================
 *
 * 一个以打字机效果显示文本的组件，模拟逐字符打字。
 *
 * 功能特性：
 * - 逐字符显示文本
 * - 可配置打字速度和延迟
 * - 闪烁光标动画
 * - 可自定义样式
 */

import React, { useState, useEffect } from 'react';

/**
 * 打字机文字组件的属性接口
 */
interface TypewriterTextProps {
  /** 要以打字机效果显示的文本 */
  text: string;
  /** 每个字符之间的延迟（毫秒） */
  delay?: number;
  /** 额外的CSS类名 */
  className?: string;
  /** 开始效果前的延迟（毫秒） */
  startDelay?: number;
}

/**
 * 打字机效果文字组件
 * 逐字符显示文本并带有闪烁光标
 */
export const TypewriterText: React.FC<TypewriterTextProps> = React.memo(({
  text,
  delay = 100,
  className = "",
  startDelay = 0
}) => {
  // 当前显示的文本
  const [displayedText, setDisplayedText] = useState('');
  // 效果是否已开始
  const [started, setStarted] = useState(false);
  // 是否显示闪烁光标
  const [showCursor, setShowCursor] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setStarted(true);
    }, startDelay);
    return () => clearTimeout(timer);
  }, [startDelay]);

  useEffect(() => {
    if (!started) return;

    // 如果还没输出完，继续追加一个字符；输出完 1s 后让光标淡出
    if (displayedText.length < text.length) {
      const timeout = setTimeout(() => {
        setDisplayedText(text.slice(0, displayedText.length + 1));
      }, delay);
      return () => clearTimeout(timeout);
    } else {
      const timeout = setTimeout(() => {
        setShowCursor(false);
      }, 1000);
      return () => clearTimeout(timeout);
    }
  }, [displayedText, started, text, delay]);

  return (
    <span className={className}>
      {displayedText}
      {/* 光标：打字时跳动，完结后淡出 */}
      <span 
        className={`inline-block w-[2px] h-[1em] align-middle bg-current ml-1 transition-opacity duration-500 ${
          showCursor 
            ? (displayedText.length === text.length ? 'animate-pulse' : 'animate-bounce') 
            : 'opacity-0'
        }`}
      ></span>
    </span>
  );
});

TypewriterText.displayName = 'TypewriterText';
