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
  const btnColor = isHer ? 'bg-rose-600 hover:bg-rose-700' : 'bg-sky-600 hover:bg-sky-700';

  const handleSubmit = () => {
    if (!text.trim()) return;
    onSave(text);
    setText('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/20 backdrop-blur-sm p-4">
      <div className="bg-white/90 backdrop-blur-xl rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden animate-[fadeIn_0.3s_ease-out] border border-white/50">
        <div className={`h-1.5 w-full bg-gradient-to-r ${isHer ? 'from-rose-300 to-rose-500' : 'from-sky-300 to-sky-500'}`} />
        
        <div className="p-8">
          <div className="flex justify-between items-center mb-8">
            <h2 className="font-serif text-3xl text-slate-800 tracking-tight">
              记录{isHer ? '他对你的好' : '她对你的好'}
            </h2>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 text-slate-400 transition-colors">
              <X size={24} />
            </button>
          </div>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={isHer ? "他今天做了什么让你感动的事？" : "她今天有什么让你心动的瞬间？"}
            className="w-full h-48 p-6 bg-slate-50/50 rounded-2xl border-transparent focus:border-slate-200 focus:bg-white focus:ring-0 transition-all resize-none text-lg font-serif placeholder:font-sans placeholder:text-slate-300 mb-6 shadow-inner"
          />

          <div className="flex gap-3 justify-end items-center">
            <button
              onClick={handleSubmit}
              disabled={!text.trim()}
              className={`flex items-center gap-2 px-8 py-3 rounded-full text-white shadow-lg shadow-slate-200 transition-all transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100 ${btnColor}`}
            >
              <span className="font-medium tracking-wide">记录美好</span>
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};