import React, { useState, useEffect } from 'react';

interface TypewriterTextProps {
  text: string;
  delay?: number;
  className?: string;
  startDelay?: number;
}

export const TypewriterText: React.FC<TypewriterTextProps> = ({ 
  text, 
  delay = 100, 
  className = "", 
  startDelay = 0 
}) => {
  const [displayedText, setDisplayedText] = useState('');
  const [started, setStarted] = useState(false);
  const [showCursor, setShowCursor] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setStarted(true);
    }, startDelay);
    return () => clearTimeout(timer);
  }, [startDelay]);

  useEffect(() => {
    if (!started) return;

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
      <span 
        className={`inline-block w-[2px] h-[1em] align-middle bg-current ml-1 transition-opacity duration-500 ${
          showCursor 
            ? (displayedText.length === text.length ? 'animate-pulse' : 'animate-bounce') 
            : 'opacity-0'
        }`}
      ></span>
    </span>
  );
};
