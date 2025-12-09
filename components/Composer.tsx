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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-[fadeIn_0.3s_ease-out]">
        <div className={`h-2 w-full ${isHer ? 'bg-rose-500' : 'bg-sky-500'}`} />
        
        <div className="p-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="font-serif text-2xl text-gray-800">
              记录{isHer ? '他对你的好' : '她对你的好'}
            </h2>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 text-gray-400">
              <X size={20} />
            </button>
          </div>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={isHer ? "他今天做了什么让你感动的事？" : "她今天有什么让你心动的瞬间？"}
            className="w-full h-40 p-4 bg-gray-50 rounded-xl border-transparent focus:border-gray-300 focus:bg-white focus:ring-0 transition-all resize-none text-lg font-serif placeholder:font-sans placeholder:text-gray-400 mb-4"
          />

          <div className="flex gap-3 justify-end items-center">
            <button
              onClick={handleSubmit}
              disabled={!text.trim()}
              className={`flex items-center gap-2 px-6 py-2 rounded-full text-white shadow-lg shadow-gray-200 transition-all transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100 ${btnColor}`}
            >
              <span>记录</span>
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};