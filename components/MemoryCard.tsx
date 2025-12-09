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
  const dateStr = `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;

  return (
    <div 
      className={`
        relative group p-6 mb-6 rounded-2xl border transition-all duration-500 hover:shadow-lg
        ${isHer 
          ? 'bg-white/80 border-rose-100 hover:border-rose-200 text-her-text' 
          : 'bg-white/80 border-sky-100 hover:border-sky-200 text-him-text'
        }
      `}
    >
      <div className="absolute -top-3 left-6 bg-white px-2 py-1 rounded-full border shadow-sm">
        <Quote size={16} className={isHer ? 'text-rose-400' : 'text-sky-400'} />
      </div>

      <p className="font-serif text-lg leading-relaxed mb-4 mt-2">
        {memory.content}
      </p>

      <div className="flex justify-between items-end border-t border-gray-100 pt-3 mt-2">
        <span className="text-xs font-sans text-gray-400 uppercase tracking-widest">
          {dateStr}
        </span>
        
        {canDelete && (
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onDelete(memory.id);
            }}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-2 rounded-full hover:bg-gray-100 text-gray-400 hover:text-red-500"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
    </div>
  );
};