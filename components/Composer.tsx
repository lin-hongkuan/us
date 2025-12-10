import React, { useState } from 'react';
import { UserType } from '../types';
import { Send, X } from 'lucide-react';

interface ComposerProps {
  currentUser: UserType;
  onSave: (content: string) => void;
  onClose: () => void;
}

export const Composer: React.FC<ComposerProps> = ({ currentUser, onSave, onClose }) => {
  const [text, setText] = useState('');

  const isHer = currentUser === UserType.HER;
  const btnGradient = isHer 
    ? 'bg-gradient-to-r from-rose-400 to-rose-600 hover:from-rose-500 hover:to-rose-700 shadow-rose-200' 
    : 'bg-gradient-to-r from-sky-400 to-sky-600 hover:from-sky-500 hover:to-sky-700 shadow-sky-200';

  const handleSubmit = () => {
    if (!text.trim()) return;
    onSave(text);
    setText('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 backdrop-blur-md p-4 transition-all duration-500">
      <div className="bg-white/90 backdrop-blur-2xl rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] w-full max-w-lg overflow-hidden animate-[fadeInUp_0.4s_cubic-bezier(0.16,1,0.3,1)] border border-white/60 relative group">
        
        {/* Decorative Noise Overlay */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none z-0" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}></div>

        <div className={`h-2 w-full bg-gradient-to-r ${isHer ? 'from-rose-300 via-rose-400 to-rose-500' : 'from-sky-300 via-sky-400 to-sky-500'}`} />
        
        <div className="p-8 relative z-10">
          <div className="flex justify-between items-center mb-8">
            <h2 
              className="font-serif text-3xl tracking-tight text-transparent bg-clip-text bg-cover texture-text cursor-default"
              style={{
                backgroundImage: isHer 
                  ? `linear-gradient(180deg, #fb7185 0%, #e11d48 45%, #881337 100%), url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`
                  : `linear-gradient(180deg, #38bdf8 0%, #0284c7 45%, #0c4a6e 100%), url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
                backgroundBlendMode: 'hard-light',
                backgroundSize: 'cover, 100px 100px',
                '--shadow-rgb': isHer ? '136, 19, 55' : '3, 105, 161'
              } as React.CSSProperties}
            >
              记录{isHer ? '他对你的好' : '她对你的好'}
            </h2>
            <button 
              onClick={onClose} 
              className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all duration-300 hover:rotate-90 active:scale-90"
            >
              <X size={24} />
            </button>
          </div>

          <div className="relative group/input">
            <div className={`absolute -inset-0.5 rounded-2xl bg-gradient-to-r ${isHer ? 'from-rose-200 to-rose-100' : 'from-sky-200 to-sky-100'} opacity-0 group-focus-within/input:opacity-100 transition-opacity duration-500 blur`}></div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={isHer ? "他今天做了什么让你感动的事？" : "她今天有什么让你心动的瞬间？"}
              className="relative w-full h-48 p-6 bg-slate-50/80 rounded-2xl border-2 border-transparent focus:border-white focus:bg-white focus:ring-0 outline-none transition-all duration-300 resize-none text-lg font-serif placeholder:font-sans placeholder:text-slate-300 mb-6 shadow-inner focus:shadow-none"
            />
          </div>

          <div className="flex gap-3 justify-end items-center">
            <button
              onClick={handleSubmit}
              disabled={!text.trim()}
              className={`flex items-center gap-2 px-8 py-3 rounded-full text-white shadow-lg transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 active:scale-95 disabled:opacity-50 disabled:scale-100 disabled:hover:translate-y-0 ${btnGradient}`}
            >
              <span className="font-medium tracking-wide">记录美好</span>
              <Send size={16} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};