/**
 * ==========================================
 * 2048游戏组件
 * ==========================================
 *
 * 一个带有可爱动物表情符号的2048滑动拼图游戏实现。
 * 玩家合并相同数字的方块以达到2048。
 *
 * 功能特性：
 * - 4x4网格与滑动方块机制
 * - 方块值的动物表情符号表示
 * - 分数跟踪
 * - 键盘和触摸控制
 * - 游戏结束检测
 * - 重置功能
 * - 响应式设计
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, RotateCcw } from 'lucide-react';

/**
 * 2048游戏组件的属性接口
 */
interface Game2048Props {
  /** 关闭游戏时的回调函数 */
  onClose: () => void;
}

/**
 * 方块值的表情符号映射（2的幂）
 * 每个数字对应一个可爱的动物表情符号
 */
const EMOJI_MAP: Record<number, string> = {
  2: '🐹',      // 仓鼠
  4: '🐰',      // 兔子
  8: '🐼',      // 熊猫
  16: '🐨',     // 考拉
  32: '🦊',     // 狐狸
  64: '🐯',     // 老虎
  128: '🦁',    // 狮子
  256: '🐮',    // 牛
  512: '🐷',    // 猪
  1024: '🐵',   // 猴子
  2048: '🦄',   // 独角兽（目标）
  4096: '🐲',   // 龙
  8192: '👑',   // 王冠
};

/** 游戏网格的大小 */
const GRID_SIZE = 4;

/**
 * 2048 Game component with animal emoji tiles
 * Classic sliding puzzle game with cute theme
 */
export const Game2048: React.FC<Game2048Props> = ({ onClose }) => {
  // Game board state (4x4 grid of numbers)
  const [board, setBoard] = useState<number[][]>([]);
  // Current game score
  const [score, setScore] = useState(0);
  // Game over state
  const [gameOver, setGameOver] = useState(false);
  // Game won state (reached 2048)
  const [won, setWon] = useState(false);

  /**
   * Initialize a new 4x4 game board
   * Creates empty board and adds two random tiles
   */
  const initBoard = () => {
    const newBoard = Array(GRID_SIZE).fill(0).map(() => Array(GRID_SIZE).fill(0));
    addRandomTile(newBoard);
    addRandomTile(newBoard);
    setBoard(newBoard);
    setScore(0);
    setGameOver(false);
    setWon(false);
  };

  // Initialize board on component mount
  useEffect(() => {
    initBoard();
  }, []);

  /**
   * Add a random tile (2 or 4) to an empty cell on the board
   * 90% chance for 2, 10% chance for 4
   * @param currentBoard - The board to modify
   */
  const addRandomTile = (currentBoard: number[][]) => {
    const emptyTiles = [];
    // Find all empty cells
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (currentBoard[r][c] === 0) {
          emptyTiles.push({ r, c });
        }
      }
    }

    // Add random tile to random empty cell
    if (emptyTiles.length > 0) {
      const { r, c } = emptyTiles[Math.floor(Math.random() * emptyTiles.length)];
      currentBoard[r][c] = Math.random() < 0.9 ? 2 : 4;
    }
  };

  /**
   * Move tiles in the specified direction
   * Handles merging, scoring, and adding new tiles
   * @param direction - Direction to move tiles ('up', 'down', 'left', 'right')
   */
  const move = useCallback((direction: 'up' | 'down' | 'left' | 'right') => {
    if (gameOver) return;

    let moved = false;
    const newBoard = JSON.parse(JSON.stringify(board)); // Deep copy
    let newScore = score;

    /**
     * Rotate board 90 degrees clockwise
     * Used to normalize all moves to left-sliding logic
     */
    const rotateBoard = (b: number[][]) => {
      const N = b.length;
      const res = Array(N).fill(0).map(() => Array(N).fill(0));
      for (let r = 0; r < N; r++) {
        for (let c = 0; c < N; c++) {
          res[c][N - 1 - r] = b[r][c];
        }
      }
      return res;
    };

    // Normalize direction to left by rotating board
    let rotatedBoard = newBoard;
    let rotations = 0;

    if (direction === 'left') rotations = 0;
    else if (direction === 'down') rotations = 1;
    else if (direction === 'right') rotations = 2;
    else if (direction === 'up') rotations = 3;

    // Apply rotations
    for (let i = 0; i < rotations; i++) {
      rotatedBoard = rotateBoard(rotatedBoard);
    }

    // Process each row (slide left logic)
    for (let r = 0; r < GRID_SIZE; r++) {
      const row = rotatedBoard[r].filter((val: number) => val !== 0); // Remove zeros
      const newRow = [];
      let skip = false;

      // Merge adjacent equal tiles
      for (let i = 0; i < row.length; i++) {
        if (skip) {
          skip = false;
          continue;
        }
        if (i + 1 < row.length && row[i] === row[i + 1]) {
          const mergedVal = row[i] * 2;
          newRow.push(mergedVal);
          newScore += mergedVal; // Add to score
          if (mergedVal === 2048 && !won) setWon(true); // Check win condition
          skip = true; // Skip next tile (already merged)
        } else {
          newRow.push(row[i]);
        }
      }

      // Pad with zeros to maintain grid size
      const paddedRow = [...newRow, ...Array(GRID_SIZE - newRow.length).fill(0)];
      if (JSON.stringify(rotatedBoard[r]) !== JSON.stringify(paddedRow)) {
        moved = true; // Track if any movement occurred
      }
      rotatedBoard[r] = paddedRow;
    }

    // Rotate board back to original orientation
    for (let i = 0; i < (4 - rotations) % 4; i++) {
      rotatedBoard = rotateBoard(rotatedBoard);
    }

    // If tiles moved, add new random tile and update state
    if (moved) {
      addRandomTile(rotatedBoard);
      setBoard(rotatedBoard);
      setScore(newScore);
      checkGameOver(rotatedBoard);
    }
  }, [board, gameOver, score, won]);

  /**
   * Check if the game is over (no empty cells and no possible merges)
   * @param currentBoard - The board to check
   */
  const checkGameOver = (currentBoard: number[][]) => {
    // Check for empty cells
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (currentBoard[r][c] === 0) return; // Game not over
      }
    }

    // Check for possible horizontal merges
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const val = currentBoard[r][c];
        if (c + 1 < GRID_SIZE && currentBoard[r][c + 1] === val) return; // Can merge right
        if (r + 1 < GRID_SIZE && currentBoard[r + 1][c] === val) return; // Can merge down
      }
    }

    setGameOver(true); // No moves possible
  };

  // Keyboard event handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp') move('up');
      else if (e.key === 'ArrowDown') move('down');
      else if (e.key === 'ArrowLeft') move('left');
      else if (e.key === 'ArrowRight') move('right');
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [move]);

  // Touch handling state
  const touchStart = useRef<{ x: number, y: number } | null>(null);

  /**
   * Handle touch start event for swipe gestures
   * Records the starting position of the touch
   */
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };

  /**
   * Handle touch end event for swipe gestures
   * Determines swipe direction and triggers move if swipe distance is sufficient
   */
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart.current) return;

    const touchEnd = { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
    const dx = touchEnd.x - touchStart.current.x; // Horizontal distance
    const dy = touchEnd.y - touchStart.current.y; // Vertical distance

    // Determine primary swipe direction
    if (Math.abs(dx) > Math.abs(dy)) {
      // Horizontal swipe
      if (Math.abs(dx) > 30) { // Minimum swipe distance threshold
        move(dx > 0 ? 'right' : 'left');
      }
    } else {
      // Vertical swipe
      if (Math.abs(dy) > 30) { // Minimum swipe distance threshold
        move(dy > 0 ? 'down' : 'up');
      }
    }
    touchStart.current = null; // Reset touch start position
  };

  return (
    // Main game container - full screen overlay
    <div className="fixed inset-0 z-[200] bg-slate-100 dark:bg-slate-900 flex flex-col items-center justify-center p-4">
      {/* Header with title, score, and controls */}
      <div className="w-full max-w-md flex justify-between items-center mb-6">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 dark:text-white">2048 Emoji</h2>
          <p className="text-slate-500 dark:text-slate-400">Score: {score}</p>
        </div>
        <div className="flex gap-2">
          {/* Reset game button */}
          <button
            onClick={initBoard}
            className="p-2 bg-white dark:bg-slate-800 rounded-full shadow-md hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            title="Reset Game"
          >
            <RotateCcw size={24} className="text-slate-600 dark:text-slate-300" />
          </button>
          {/* Close game button */}
          <button
            onClick={onClose}
            className="p-2 bg-white dark:bg-slate-800 rounded-full shadow-md hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            title="Close Game"
          >
            <X size={24} className="text-slate-600 dark:text-slate-300" />
          </button>
        </div>
      </div>

      {/* Game board container with touch handling */}
      <div
        className="bg-slate-300 dark:bg-slate-700 p-3 rounded-xl shadow-xl touch-none select-none"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* 4x4 grid of tiles */}
        <div className="grid grid-cols-4 gap-3">
          {board.map((row, r) => (
            row.map((val, c) => (
              <div
                key={`${r}-${c}`} // Unique key for each tile
                className="w-16 h-16 sm:w-20 sm:h-20 bg-slate-200 dark:bg-slate-600 rounded-lg flex items-center justify-center text-3xl sm:text-4xl transition-all duration-100 transform"
                style={{
                  backgroundColor: val ? undefined : 'rgba(255,255,255,0.1)', // Semi-transparent for empty tiles
                }}
              >
                {/* Render emoji for non-empty tiles with animation */}
                {val > 0 && (
                  <div className="animate-in zoom-in duration-200">
                    {EMOJI_MAP[val] || val} {/* Fallback to number if no emoji */}
                  </div>
                )}
              </div>
            ))
          ))}
        </div>
      </div>

      {/* Game over overlay */}
      {gameOver && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-2xl text-center animate-in zoom-in duration-300">
            <h3 className="text-2xl font-bold mb-2 text-slate-800 dark:text-white">Game Over!</h3>
            <p className="mb-6 text-slate-600 dark:text-slate-300">Final Score: {score}</p>
            <button
              onClick={initBoard}
              className="px-6 py-3 bg-rose-500 text-white rounded-xl font-bold hover:bg-rose-600 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      )}

      {/* Win notification banner */}
      {won && !gameOver && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-yellow-400 text-yellow-900 px-6 py-2 rounded-full font-bold shadow-lg animate-bounce z-10">
          You Won! Keep going?
        </div>
      )}

      {/* Instructions */}
      <div className="mt-8 text-center text-slate-400 text-sm">
        Use arrow keys or swipe to move
      </div>
    </div>
  );
};
