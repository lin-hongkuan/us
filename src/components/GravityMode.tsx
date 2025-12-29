/**
 * ==========================================
 * 重力模式组件
 * ==========================================
 *
 * 使用Matter.js的交互式物理记忆查看器
 * 记忆卡片在重力作用下坠落，可以用鼠标/触摸操纵
 *
 * 功能特性：
 * - 具有弹跳和摩擦的物理模拟
 * - 鼠标/触摸交互用于移动卡片
 * - 基于内容的动态卡片尺寸
 * - 作者视觉区分（颜色和表情符号）
 * - 平滑动画和真实物理
 * - 边界墙壁保持卡片在屏幕上
 */

import React, { useEffect, useRef, useState } from 'react';
import Matter from 'matter-js';
import { Memory, UserType } from '../types';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

/**
 * 重力模式组件的属性接口
 */
interface GravityModeProps {
  /** 在物理模拟中显示的记忆数组 */
  memories: Memory[];
  /** 关闭重力模式时的回调函数 */
  onClose: () => void;
}

/**
 * 重力模式组件 - 基于物理的记忆查看器
 * 使用Matter.js创建真实的坠落卡片行为
 */
export const GravityMode: React.FC<GravityModeProps> = ({ memories, onClose }) => {
  // Matter.js引用：引擎、渲染器和运行器
  const sceneRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<Matter.Engine | null>(null);
  const renderRef = useRef<Matter.Render | null>(null);
  const runnerRef = useRef<Matter.Runner | null>(null);

  // 存储每个记忆卡片的物理物体的映射
  const bodiesRef = useRef<Map<string, Matter.Body>>(new Map());

  // 存储每个卡片的测量尺寸，用于物理物体尺寸调整
  const [cardDimensions, setCardDimensions] = useState<Map<string, { width: number, height: number }>>(new Map());
  // 准备状态，确保在初始化物理前测量尺寸
  const [isReady, setIsReady] = useState(false);

  /**
   * Measure card dimensions based on content length
   * Cards get taller with more content and images
   */
  useEffect(() => {
    const measureCards = () => {
      const dims = new Map();
      memories.forEach(memory => {
        // Calculate approximate dimensions based on content
        const width = 300; // Fixed width for consistent physics
        const height = Math.min(400, Math.max(150, memory.content.length * 1.5 + (memory.imageUrl ? 200 : 0)));
        dims.set(memory.id, { width, height });
      });
      setCardDimensions(dims);
      setIsReady(true);
    };

    measureCards();
  }, [memories]);

  /**
   * Initialize Matter.js physics engine and create physics bodies
   * Sets up gravity, walls, mouse interaction, and DOM synchronization
   */
  useEffect(() => {
    if (!isReady || !sceneRef.current) return;

    // Import Matter.js modules
    const Engine = Matter.Engine,
          Render = Matter.Render,
          Runner = Matter.Runner,
          Bodies = Matter.Bodies,
          Composite = Matter.Composite,
          Mouse = Matter.Mouse,
          MouseConstraint = Matter.MouseConstraint,
          Events = Matter.Events;

    // Create physics engine
    const engine = Engine.create();
    engineRef.current = engine;

    // Get viewport dimensions
    const width = window.innerWidth;
    const height = window.innerHeight;

    // Create invisible boundary walls to keep cards on screen
    const wallOptions = { isStatic: true, render: { visible: false } };
    const ground = Bodies.rectangle(width / 2, height + 50, width, 100, wallOptions); // Bottom wall
    const leftWall = Bodies.rectangle(-50, height / 2, 100, height, wallOptions);   // Left wall
    const rightWall = Bodies.rectangle(width + 50, height / 2, 100, height, wallOptions); // Right wall

    Composite.add(engine.world, [ground, leftWall, rightWall]);

    // Create physics bodies for each memory card
    memories.forEach((memory, index) => {
      const dim = cardDimensions.get(memory.id) || { width: 300, height: 200 };
      // Random starting positions above the screen
      const x = Math.random() * (width - 100) + 50;
      const y = -Math.random() * 1000 - 100; // Start above viewport

      // Create rectangular physics body with bouncy properties
      const body = Bodies.rectangle(x, y, dim.width, dim.height, {
        restitution: 0.5, // Bouncy (energy retention on collision)
        friction: 0.1,    // Low friction for smooth movement
        angle: Math.random() * Math.PI * 0.2 - 0.1, // Slight random rotation
        render: { visible: false } // Hide physics rendering, we use DOM
      });

      bodiesRef.current.set(memory.id, body);
      Composite.add(engine.world, body);
    });

    // Add mouse/touch interaction
    const mouse = Mouse.create(sceneRef.current);
    const mouseConstraint = MouseConstraint.create(engine, {
      mouse: mouse,
      constraint: {
        stiffness: 0.2, // How strongly mouse affects objects
        render: { visible: false } // Hide constraint rendering
      }
    });

    Composite.add(engine.world, mouseConstraint);

    // Start physics simulation
    const runner = Runner.create();
    runnerRef.current = runner;
    Runner.run(runner, engine);

    // Animation loop to sync DOM elements with physics bodies
    let animationFrameId: number;

    const updateDOM = () => {
      bodiesRef.current.forEach((body, id) => {
        const element = document.getElementById(`gravity-card-${id}`);
        if (element) {
          const { x, y } = body.position;
          const angle = body.angle;
          // Position DOM element to match physics body (centered)
          const dim = cardDimensions.get(id);
          element.style.transform = `translate(${x - (dim?.width || 0)/2}px, ${y - (dim?.height || 0)/2}px) rotate(${angle}rad)`;
        }
      });
      animationFrameId = requestAnimationFrame(updateDOM);
    };

    updateDOM(); // Start DOM update loop

    // Cleanup function
    return () => {
      Runner.stop(runner);
      Engine.clear(engine);
      cancelAnimationFrame(animationFrameId);
    };
  }, [isReady, memories, cardDimensions]);

  // Don't render until dimensions are measured
  if (!isReady) return null;

  return (
    // Physics scene container - full screen with grab cursor
    <div ref={sceneRef} className="fixed inset-0 z-[200] bg-slate-100 dark:bg-slate-900 overflow-hidden cursor-grab active:cursor-grabbing">
      {/* Render each memory as a physics-controlled card */}
      {memories.map(memory => {
        const dim = cardDimensions.get(memory.id);
        if (!dim) return null;

        return (
          <div
            key={memory.id}
            id={`gravity-card-${memory.id}`} // Used for DOM-physics synchronization
            className="absolute top-0 left-0 bg-white dark:bg-slate-800 rounded-2xl shadow-xl overflow-hidden border border-slate-100 dark:border-slate-700 select-none pointer-events-none will-change-transform"
            style={{
              width: dim.width,
              height: dim.height,
              // Start off-screen to prevent flash before physics initialization
              transform: 'translate(-1000px, -1000px)'
            }}
          >
            {/* Author color indicator bar */}
            <div className={`h-2 w-full ${memory.author === UserType.HER ? 'bg-rose-400' : 'bg-sky-400'}`} />

            {/* Card content */}
            <div className="p-4 h-full flex flex-col">
              {/* Header with date and author emoji */}
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-medium text-slate-400">
                  {format(memory.createdAt, 'yyyy/MM/dd', { locale: zhCN })}
                </span>
                <span className="text-lg">
                  {memory.author === UserType.HER ? '🐱' : '🐶'}
                </span>
              </div>

              {/* Content area with text and optional image */}
              <div className="flex-1 overflow-hidden relative">
                <p className="text-slate-700 dark:text-slate-300 text-sm line-clamp-6 whitespace-pre-wrap">
                  {memory.content}
                </p>
                {/* Memory image if present */}
                {memory.imageUrl && (
                  <div className="mt-2 h-24 w-full rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-900">
                    <img src={memory.imageUrl} alt="memory" className="w-full h-full object-cover opacity-80" />
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
