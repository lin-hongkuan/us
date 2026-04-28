import React from 'react';
import { ImagePlus, Quote } from 'lucide-react';
import { Memory, UserType, getAvatar } from '../types';
import { MAX_MEMORY_IMAGES } from '../config/constants';
import { useMemoryCardEditor } from '../hooks/useMemoryCardEditor';
import { MemoryCardFooter } from './MemoryCardFooter';
import { MemoryImageGallery } from './MemoryImageGallery';

interface MemoryCardProps {
  memory: Memory;
  onDelete: (id: string) => void;
  onUpdate: (id: string, content: string, imageUrls?: string[] | null) => Promise<boolean>;
  currentUser: UserType;
}

const areImageUrlsEqual = (a?: string[], b?: string[]): boolean => {
  if (a === b) return true;
  if (!a && !b) return true;
  if (!a || !b) return false;
  if (a.length !== b.length) return false;

  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
};

export const MemoryCard: React.FC<MemoryCardProps> = React.memo(({ memory, onDelete, onUpdate, currentUser }) => {
  const isHer = memory.author === UserType.HER;
  const canModify = currentUser === memory.author;
  const date = new Date(memory.createdAt);
  const dateStr = `${date.getFullYear()} . ${date.getMonth() + 1} . ${date.getDate()}`;
  const {
    isEditing,
    setIsEditing,
    isSaving,
    editContent,
    setEditContent,
    editImageUrls,
    editImageFiles,
    displayImages,
    fileInputRef,
    handleImageSelect,
    handleRemoveDisplayImage,
    handleCancelEdit,
    handleSaveEdit,
  } = useMemoryCardEditor(memory, onUpdate);

  return (
    <div
      data-sound={isHer ? 'her' : 'him'}
      className={`
        relative group p-7 md:p-8 mb-8 md:mb-12 rounded-2xl md:rounded-3xl border
        transform-gpu
        transition-[border-color,box-shadow,transform] duration-300
        hover:shadow-[0_8px_24px_-6px_rgba(0,0,0,0.1)] dark:hover:shadow-[0_8px_24px_-6px_rgba(0,0,0,0.25)] md:hover:shadow-[0_30px_60px_-15px_rgba(0,0,0,0.08)] md:dark:hover:shadow-[0_30px_60px_-15px_rgba(0,0,0,0.3)] hover:-translate-y-2
        active:scale-[0.99]
        ${isHer
          ? 'bg-white dark:bg-slate-800 border-rose-100/50 dark:border-rose-900/50 hover:border-rose-200 dark:hover:border-rose-700'
          : 'bg-white dark:bg-slate-800 border-sky-100/50 dark:border-sky-900/50 hover:border-sky-200 dark:hover:border-sky-700'
        }
      `}
    >
      <div className={`absolute -top-2.5 left-1/2 -translate-x-1/2 w-24 h-6 rotate-[-2deg] border border-white/60 dark:border-slate-600/60 shadow-sm ${isHer ? 'bg-rose-200/90 dark:bg-rose-800/90' : 'bg-sky-200/90 dark:bg-sky-800/90'}`}></div>

      <div className={`absolute -left-3 top-8 w-8 h-8 rounded-full bg-white dark:bg-slate-700 border shadow-sm flex items-center justify-center transition-transform group-hover:scale-110 duration-500 ${isHer ? 'text-rose-300 dark:text-rose-400 border-rose-100 dark:border-rose-800' : 'text-sky-300 dark:text-sky-400 border-sky-100 dark:border-sky-800'}`}>
        <Quote size={12} fill="currentColor" className="opacity-60 rotate-180" />
      </div>

      <div className={`absolute -right-3 bottom-8 w-8 h-8 rounded-full bg-white dark:bg-slate-700 border shadow-sm flex items-center justify-center transition-transform group-hover:scale-110 duration-500 pointer-events-none ${isHer ? 'text-rose-300 dark:text-rose-400 border-rose-100 dark:border-rose-800' : 'text-sky-300 dark:text-sky-400 border-sky-100 dark:border-sky-800'}`}>
        <Quote size={12} fill="currentColor" className="opacity-60" />
      </div>

      <div className="relative z-10">
        <MemoryImageGallery
          images={displayImages}
          memoryId={memory.id}
          isEditing={isEditing}
          isHer={isHer}
          onRemoveImage={handleRemoveDisplayImage}
        />

        {isEditing && (editImageUrls.length + editImageFiles.length) < MAX_MEMORY_IMAGES && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
            disabled={isSaving}
            className={`w-full mb-4 p-4 border-2 border-dashed rounded-xl transition-all duration-300 flex items-center justify-center gap-2 ${
              isHer
                ? 'border-rose-200 dark:border-rose-700 text-rose-400 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-900/30 hover:border-rose-300 dark:hover:border-rose-600'
                : 'border-sky-200 dark:border-sky-700 text-sky-400 dark:text-sky-300 hover:bg-sky-50 dark:hover:bg-sky-900/30 hover:border-sky-300 dark:hover:border-sky-600'
            }`}
          >
            <ImagePlus size={20} />
            <span className="text-sm font-medium">
              {displayImages.length === 0 ? '添加照片' : '继续添加'}
            </span>
          </button>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleImageSelect}
          className="hidden"
        />

        {isEditing ? (
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="w-full bg-transparent border-b border-slate-200 dark:border-slate-600 focus:border-slate-400 dark:focus:border-slate-500 focus:ring-0 p-0 font-serif text-base md:text-xl leading-loose text-slate-700 dark:text-slate-200 tracking-wide resize-none outline-none"
            rows={Math.max(3, editContent.split('\n').length)}
            autoFocus
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <p className="font-serif text-base md:text-xl leading-loose text-slate-700 dark:text-slate-200 tracking-wide whitespace-pre-wrap">
            {memory.content}
          </p>
        )}
      </div>

      <MemoryCardFooter
        isHer={isHer}
        dateStr={dateStr}
        canModify={canModify}
        isEditing={isEditing}
        isSaving={isSaving}
        onStartEdit={() => setIsEditing(true)}
        onCancelEdit={handleCancelEdit}
        onSaveEdit={handleSaveEdit}
        onDelete={() => onDelete(memory.id)}
      />

      <div className="absolute bottom-4 right-4 text-6xl opacity-[0.03] dark:opacity-[0.05] pointer-events-none select-none transition-opacity duration-500 group-hover:opacity-[0.40] dark:group-hover:opacity-[0.30]">
        {isHer ? getAvatar(UserType.HER) : getAvatar(UserType.HIM)}
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.memory.id === nextProps.memory.id &&
    prevProps.memory.content === nextProps.memory.content &&
    prevProps.memory.imageUrl === nextProps.memory.imageUrl &&
    areImageUrlsEqual(prevProps.memory.imageUrls, nextProps.memory.imageUrls) &&
    prevProps.currentUser === nextProps.currentUser
  );
});

MemoryCard.displayName = 'MemoryCard';
