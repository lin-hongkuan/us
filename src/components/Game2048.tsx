import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, RotateCcw } from 'lucide-react';

interface Game2048Props {
  onClose: () => void;
}

// Emoji mapping for powers of 2
const EMOJI_MAP: Record<number, string> = {
  2: '🐹',
  4: '🐰',
  8: '🐼',
  16: '🐨',
  32: '🦊',
  64: '🐯',
  128: '🦁',
  256: '🐮',
  512: '🐷',
  1024: '🐵',
  2048: '🦄',
  4096: '🐲',
  8192: '👑',
};

const GRID_SIZE = 4;

export const Game2048: React.FC<Game2048Props> = ({ onClose }) => {
  const [board, setBoard] = useState<number[][]>([]);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);

  // Initialize board
  const initBoard = () => {
    const newBoard = Array(GRID_SIZE).fill(0).map(() => Array(GRID_SIZE).fill(0));
    addRandomTile(newBoard);
    addRandomTile(newBoard);
    setBoard(newBoard);
    setScore(0);
    setGameOver(false);
    setWon(false);
  };

  useEffect(() => {
    initBoard();
  }, []);

  const addRandomTile = (currentBoard: number[][]) => {
    const emptyTiles = [];
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (currentBoard[r][c] === 0) {
          emptyTiles.push({ r, c });
        }
      }
    }

    if (emptyTiles.length > 0) {
      const { r, c } = emptyTiles[Math.floor(Math.random() * emptyTiles.length)];
      currentBoard[r][c] = Math.random() < 0.9 ? 2 : 4;
    }
  };

  const move = useCallback((direction: 'up' | 'down' | 'left' | 'right') => {
    if (gameOver) return;

    let moved = false;
    const newBoard = JSON.parse(JSON.stringify(board));
    let newScore = score;

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

    let rotatedBoard = newBoard;
    let rotations = 0;

    if (direction === 'left') rotations = 0;
    else if (direction === 'down') rotations = 1;
    else if (direction === 'right') rotations = 2;
    else if (direction === 'up') rotations = 3;

    for (let i = 0; i < rotations; i++) {
      rotatedBoard = rotateBoard(rotatedBoard);
    }

    // Process rows (slide left logic)
    for (let r = 0; r < GRID_SIZE; r++) {
      const row = rotatedBoard[r].filter((val: number) => val !== 0);
      const newRow = [];
      let skip = false;

      for (let i = 0; i < row.length; i++) {
        if (skip) {
          skip = false;
          continue;
        }
        if (i + 1 < row.length && row[i] === row[i + 1]) {
          const mergedVal = row[i] * 2;
          newRow.push(mergedVal);
          newScore += mergedVal;
          if (mergedVal === 2048 && !won) setWon(true);
          skip = true;
        } else {
          newRow.push(row[i]);
        }
      }

      const paddedRow = [...newRow, ...Array(GRID_SIZE - newRow.length).fill(0)];
      if (JSON.stringify(rotatedBoard[r]) !== JSON.stringify(paddedRow)) {
        moved = true;
      }
      rotatedBoard[r] = paddedRow;
    }

    // Rotate back
    for (let i = 0; i < (4 - rotations) % 4; i++) {
      rotatedBoard = rotateBoard(rotatedBoard);
    }

    if (moved) {
      addRandomTile(rotatedBoard);
      setBoard(rotatedBoard);
      setScore(newScore);
      checkGameOver(rotatedBoard);
    }
  }, [board, gameOver, score, won]);

  const checkGameOver = (currentBoard: number[][]) => {
    // Check for empty cells
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (currentBoard[r][c] === 0) return;
      }
    }

    // Check for possible merges
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const val = currentBoard[r][c];
        if (c + 1 < GRID_SIZE && currentBoard[r][c + 1] === val) return;
        if (r + 1 < GRID_SIZE && currentBoard[r + 1][c] === val) return;
      }
    }

    setGameOver(true);
  };

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

  // Touch handling
  const touchStart = useRef<{ x: number, y: number } | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart.current) return;
    const touchEnd = { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
    const dx = touchEnd.x - touchStart.current.x;
    const dy = touchEnd.y - touchStart.current.y;

    if (Math.abs(dx) > Math.abs(dy)) {
      if (Math.abs(dx) > 30) {
        move(dx > 0 ? 'right' : 'left');
      }
    } else {
      if (Math.abs(dy) > 30) {
        move(dy > 0 ? 'down' : 'up');
      }
    }
    touchStart.current = null;
  };

  return (
    <div className="fixed inset-0 z-[200] bg-slate-100 dark:bg-slate-900 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md flex justify-between items-center mb-6">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 dark:text-white">2048 Emoji</h2>
          <p className="text-slate-500 dark:text-slate-400">Score: {score}</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={initBoard}
            className="p-2 bg-white dark:bg-slate-800 rounded-full shadow-md hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            <RotateCcw size={24} className="text-slate-600 dark:text-slate-300" />
          </button>
          <button 
            onClick={onClose}
            className="p-2 bg-white dark:bg-slate-800 rounded-full shadow-md hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            <X size={24} className="text-slate-600 dark:text-slate-300" />
          </button>
        </div>
      </div>

      <div 
        className="bg-slate-300 dark:bg-slate-700 p-3 rounded-xl shadow-xl touch-none select-none"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="grid grid-cols-4 gap-3">
          {board.map((row, r) => (
            row.map((val, c) => (
              <div 
                key={`${r}-${c}`}
                className="w-16 h-16 sm:w-20 sm:h-20 bg-slate-200 dark:bg-slate-600 rounded-lg flex items-center justify-center text-3xl sm:text-4xl transition-all duration-100 transform"
                style={{
                  backgroundColor: val ? undefined : 'rgba(255,255,255,0.1)',
                }}
              >
                {val > 0 && (
                  <div className="animate-in zoom-in duration-200">
                    {EMOJI_MAP[val] || val}
                  </div>
                )}
              </div>
            ))
          ))}
        </div>
      </div>

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
      
      {won && !gameOver && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-yellow-400 text-yellow-900 px-6 py-2 rounded-full font-bold shadow-lg animate-bounce z-10">
          You Won! Keep going?
        </div>
      )}

      <div className="mt-8 text-center text-slate-400 text-sm">
        Use arrow keys or swipe to move
      </div>
    </div>
  );
};
