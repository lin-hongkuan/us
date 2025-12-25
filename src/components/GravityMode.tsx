import React, { useEffect, useRef, useState } from 'react';
import Matter from 'matter-js';
import { Memory, UserType } from '../types';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface GravityModeProps {
  memories: Memory[];
  onClose: () => void;
}

export const GravityMode: React.FC<GravityModeProps> = ({ memories, onClose }) => {
  const sceneRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<Matter.Engine | null>(null);
  const renderRef = useRef<Matter.Render | null>(null);
  const runnerRef = useRef<Matter.Runner | null>(null);
  const bodiesRef = useRef<Map<string, Matter.Body>>(new Map());
  
  // Store card dimensions to sync physics bodies with DOM
  const [cardDimensions, setCardDimensions] = useState<Map<string, { width: number, height: number }>>(new Map());
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Measure cards first
    const measureCards = () => {
      const dims = new Map();
      memories.forEach(memory => {
        // Estimate size or use a fixed size for simplicity in this fun mode
        // To make it look like "blocks", we can use a fixed width and variable height based on content
        const width = 300; // Approximate card width
        const height = Math.min(400, Math.max(150, memory.content.length * 1.5 + (memory.imageUrl ? 200 : 0))); 
        dims.set(memory.id, { width, height });
      });
      setCardDimensions(dims);
      setIsReady(true);
    };
    
    measureCards();
  }, [memories]);

  useEffect(() => {
    if (!isReady || !sceneRef.current) return;

    // Setup Matter JS
    const Engine = Matter.Engine,
          Render = Matter.Render,
          Runner = Matter.Runner,
          Bodies = Matter.Bodies,
          Composite = Matter.Composite,
          Mouse = Matter.Mouse,
          MouseConstraint = Matter.MouseConstraint,
          Events = Matter.Events;

    const engine = Engine.create();
    engineRef.current = engine;

    const width = window.innerWidth;
    const height = window.innerHeight;

    // Create renderer (optional, for debugging or if we want to use canvas rendering)
    // We will use DOM rendering for the actual cards, but we need the engine running.
    // We won't use Matter.Render to draw to canvas, we'll just use the engine.
    
    // Create walls
    const wallOptions = { isStatic: true, render: { visible: false } };
    const ground = Bodies.rectangle(width / 2, height + 50, width, 100, wallOptions);
    const leftWall = Bodies.rectangle(-50, height / 2, 100, height, wallOptions);
    const rightWall = Bodies.rectangle(width + 50, height / 2, 100, height, wallOptions);
    
    Composite.add(engine.world, [ground, leftWall, rightWall]);

    // Create bodies for memories
    memories.forEach((memory, index) => {
      const dim = cardDimensions.get(memory.id) || { width: 300, height: 200 };
      const x = Math.random() * (width - 100) + 50;
      const y = -Math.random() * 1000 - 100; // Start above screen
      
      const body = Bodies.rectangle(x, y, dim.width, dim.height, {
        restitution: 0.5, // Bouncy
        friction: 0.1,
        angle: Math.random() * Math.PI * 0.2 - 0.1, // Slight random rotation
        render: { visible: false } // We render DOM elements
      });
      
      bodiesRef.current.set(memory.id, body);
      Composite.add(engine.world, body);
    });

    // Add mouse control
    const mouse = Mouse.create(sceneRef.current);
    const mouseConstraint = MouseConstraint.create(engine, {
      mouse: mouse,
      constraint: {
        stiffness: 0.2,
        render: {
          visible: false
        }
      }
    });

    Composite.add(engine.world, mouseConstraint);

    // Run the engine
    const runner = Runner.create();
    runnerRef.current = runner;
    Runner.run(runner, engine);

    // Update loop for DOM elements
    let animationFrameId: number;
    
    const updateDOM = () => {
      bodiesRef.current.forEach((body, id) => {
        const element = document.getElementById(`gravity-card-${id}`);
        if (element) {
          const { x, y } = body.position;
          const angle = body.angle;
          element.style.transform = `translate(${x - (cardDimensions.get(id)?.width || 0)/2}px, ${y - (cardDimensions.get(id)?.height || 0)/2}px) rotate(${angle}rad)`;
        }
      });
      animationFrameId = requestAnimationFrame(updateDOM);
    };
    
    updateDOM();

    return () => {
      Runner.stop(runner);
      Engine.clear(engine);
      cancelAnimationFrame(animationFrameId);
    };
  }, [isReady, memories, cardDimensions]);

  if (!isReady) return null;

  return (
    <div ref={sceneRef} className="fixed inset-0 z-[200] bg-slate-100 dark:bg-slate-900 overflow-hidden cursor-grab active:cursor-grabbing">
      {memories.map(memory => {
        const dim = cardDimensions.get(memory.id);
        if (!dim) return null;
        
        return (
          <div
            key={memory.id}
            id={`gravity-card-${memory.id}`}
            className="absolute top-0 left-0 bg-white dark:bg-slate-800 rounded-2xl shadow-xl overflow-hidden border border-slate-100 dark:border-slate-700 select-none pointer-events-none will-change-transform"
            style={{
              width: dim.width,
              height: dim.height,
              // Initial position off-screen to avoid flash before physics update
              transform: 'translate(-1000px, -1000px)' 
            }}
          >
            <div className={`h-2 w-full ${memory.author === UserType.HER ? 'bg-rose-400' : 'bg-sky-400'}`} />
            <div className="p-4 h-full flex flex-col">
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-medium text-slate-400">
                  {format(memory.createdAt, 'yyyy/MM/dd', { locale: zhCN })}
                </span>
                <span className="text-lg">
                  {memory.author === UserType.HER ? '🐱' : '🐶'}
                </span>
              </div>
              
              <div className="flex-1 overflow-hidden relative">
                <p className="text-slate-700 dark:text-slate-300 text-sm line-clamp-6 whitespace-pre-wrap">
                  {memory.content}
                </p>
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
