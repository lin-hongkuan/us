import React from 'react';
import { Memory, UserType } from '../types';
import { Quote, Trash2 } from 'lucide-react';

interface MemoryCardProps {
  memory: Memory;
  onDelete: (id: string) => void;
  currentUser: UserType;
}

export const MemoryCard: React.FC<MemoryCardProps> = ({ memory, onDelete, currentUser }) => {
  const isHer = memory.author === UserType.HER;
  
  // Only allow deletion if the current user is the author
  const canDelete = currentUser === memory.author;

  // Format date manually to avoid date-fns locale import issues
  const date = new Date(memory.createdAt);
  const dateStr = `${date.getFullYear()} . ${date.getMonth() + 1} . ${date.getDate()}`;

  return (
    <div 
      className={`
        relative group p-8 mb-12 rounded-3xl border transition-all duration-700
        hover:shadow-[0_30px_60px_-15px_rgba(0,0,0,0.08)] hover:-translate-y-2
        ${isHer 
          ? 'bg-white/80 border-rose-100/50 hover:border-rose-200' 
          : 'bg-white/80 border-sky-100/50 hover:border-sky-200'
        }
        backdrop-blur-md
      `}
    >
      {/* Decorative Tape/Pin Effect */}
      <div className={`absolute -top-2.5 left-1/2 -translate-x-1/2 w-24 h-6 rotate-[-2deg] backdrop-blur-md border border-white/60 shadow-sm ${isHer ? 'bg-rose-200/60' : 'bg-sky-200/60'}`}></div>

      {/* Quote Icon */}
      <div className={`absolute -left-3 top-8 w-8 h-8 rounded-full bg-white border shadow-sm flex items-center justify-center transition-transform group-hover:scale-110 duration-500 ${isHer ? 'text-rose-300 border-rose-100' : 'text-sky-300 border-sky-100'}`}>
        <Quote size={12} fill="currentColor" className="opacity-60" />
      </div>

      {/* Content */}
      <div className="relative z-10">
        <p className="font-serif text-lg md:text-xl leading-loose text-slate-700 tracking-wide whitespace-pre-wrap">
          {memory.content}
        </p>
      </div>

      {/* Footer */}
      <div className="flex justify-between items-end mt-8 pt-6 border-t border-slate-100">
        <div className="flex flex-col gap-1">
           <span className={`text-[10px] font-bold uppercase tracking-[0.2em] ${isHer ? 'text-rose-400' : 'text-sky-400'}`}>
             {isHer ? 'Her Memory' : 'His Memory'}
           </span>
           <span className="font-sans text-[10px] font-bold text-slate-500 tracking-[0.15em] mt-1">
             {dateStr}
           </span>
        </div>
        
        {canDelete && (
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onDelete(memory.id);
            }}
            className="opacity-0 group-hover:opacity-100 transition-all duration-300 p-2 rounded-full hover:bg-rose-50 text-slate-300 hover:text-rose-500 transform hover:scale-110"
            title="删除回忆"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
      
      {/* Watermark Icon */}
      <div className="absolute bottom-4 right-4 text-6xl opacity-[0.03] pointer-events-none select-none transition-opacity duration-500 group-hover:opacity-[0.40]">
         {isHer ? '🐱' : '🐶'}
      </div>
    </div>
  );
};