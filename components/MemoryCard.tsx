import React, { useState, useEffect, useRef } from 'react';
import { Memory, UserType } from '../types';
import { Quote, Trash2, Edit2, Check, X, Loader2, ImagePlus, Trash } from 'lucide-react';
import { uploadImage } from '../services/storageService';

interface MemoryCardProps {
  memory: Memory;
  onDelete: (id: string) => void;
  onUpdate: (id: string, content: string, imageUrl?: string | null) => Promise<boolean>;
  currentUser: UserType;
}

export const MemoryCard: React.FC<MemoryCardProps> = ({ memory, onDelete, onUpdate, currentUser }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editContent, setEditContent] = useState(memory.content);
  const [editImageUrl, setEditImageUrl] = useState<string | null | undefined>(memory.imageUrl);
  const [editImageFile, setEditImageFile] = useState<File | null>(null);
  const [isImageExpanded, setIsImageExpanded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isHer = memory.author === UserType.HER;
  
  // Sync editContent and editImageUrl with memory when it changes
  useEffect(() => {
    setEditContent(memory.content);
    setEditImageUrl(memory.imageUrl);
    setEditImageFile(null);
  }, [memory.content, memory.imageUrl]);
  
  // Only allow deletion/editing if the current user is the author
  const canModify = currentUser === memory.author;

  // Format date manually to avoid date-fns locale import issues
  const date = new Date(memory.createdAt);
  const dateStr = `${date.getFullYear()} . ${date.getMonth() + 1} . ${date.getDate()}`;

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('请选择图片文件');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('图片大小不能超过10MB');
      return;
    }

    // Store file for later upload
    setEditImageFile(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setEditImageUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveImage = () => {
    setEditImageUrl(null);
    setEditImageFile(null);
  };

  const handleCancelEdit = () => {
    setEditContent(memory.content);
    setEditImageUrl(memory.imageUrl);
    setEditImageFile(null);
    setIsEditing(false);
  };

  const handleSaveEdit = async () => {
    const contentChanged = editContent.trim() !== memory.content;
    const imageChanged = editImageUrl !== memory.imageUrl || editImageFile !== null;
    
    if (contentChanged || imageChanged) {
      setIsSaving(true);
      try {
        let imageToSave: string | null | undefined = undefined;
        
        // If there's a new file to upload
        if (editImageFile) {
          const uploadedUrl = await uploadImage(editImageFile);
          imageToSave = uploadedUrl;
        } else if (editImageUrl === null) {
          // Image was removed
          imageToSave = null;
        }
        
        const success = await onUpdate(memory.id, editContent, imageToSave);
        if (success) {
          setIsEditing(false);
          setEditImageFile(null);
        }
      } finally {
        setIsSaving(false);
      }
    } else {
      setIsEditing(false);
    }
  };

  return (
    <div 
      data-sound={isHer ? 'her' : 'him'}
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
        <Quote size={12} fill="currentColor" className="opacity-60 rotate-180" />
      </div>

      {/* Content */}
      <div className="relative z-10">
        {/* Image Display */}
        {(isEditing ? editImageUrl : memory.imageUrl) && (
          <div className="relative mb-4 rounded-xl overflow-hidden group/image">
            <img 
              src={isEditing ? (editImageUrl || undefined) : memory.imageUrl} 
              alt="Memory" 
              className={`w-full object-cover rounded-xl transition-all duration-300 cursor-pointer ${
                isImageExpanded ? 'max-h-[70vh]' : 'max-h-64'
              }`}
              onClick={(e) => {
                e.stopPropagation();
                if (!isEditing) setIsImageExpanded(!isImageExpanded);
              }}
            />
            {isEditing && (
              <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover/image:opacity-100 transition-all duration-300">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  disabled={isCompressing}
                  className="p-2 bg-black/50 hover:bg-black/70 rounded-full text-white"
                  title="更换图片"
                >
                  <ImagePlus size={16} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveImage();
                  }}
                  className="p-2 bg-black/50 hover:bg-red-500/70 rounded-full text-white"
                  title="删除图片"
                >
                  <Trash size={16} />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Add image button when editing and no image */}
        {isEditing && !editImageUrl && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
            disabled={isSaving}
            className={`w-full mb-4 p-4 border-2 border-dashed rounded-xl transition-all duration-300 flex items-center justify-center gap-2 ${
              isHer 
                ? 'border-rose-200 text-rose-400 hover:bg-rose-50 hover:border-rose-300' 
                : 'border-sky-200 text-sky-400 hover:bg-sky-50 hover:border-sky-300'
            }`}
          >
            <ImagePlus size={20} />
            <span className="text-sm font-medium">
              添加照片
            </span>
          </button>
        )}

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageSelect}
          className="hidden"
        />

        {isEditing ? (
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="w-full bg-transparent border-b border-slate-200 focus:border-slate-400 focus:ring-0 p-0 font-serif text-lg md:text-xl leading-loose text-slate-700 tracking-wide resize-none outline-none"
            rows={Math.max(3, editContent.split('\n').length)}
            autoFocus
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <p className="font-serif text-lg md:text-xl leading-loose text-slate-700 tracking-wide whitespace-pre-wrap">
            {memory.content}
          </p>
        )}
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
        
        {canModify && (
          <div className="flex gap-2">
            {isEditing ? (
              <>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCancelEdit();
                  }}
                  disabled={isSaving}
                  className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-50"
                  title="取消"
                >
                  <X size={14} />
                </button>
                <button 
                  onClick={async (e) => {
                    e.stopPropagation();
                    handleSaveEdit();
                  }}
                  disabled={isSaving}
                  className={`p-2 rounded-full transition-colors ${isHer ? 'hover:bg-rose-50 text-rose-400 hover:text-rose-600' : 'hover:bg-sky-50 text-sky-400 hover:text-sky-600'} disabled:opacity-50`}
                  title="保存"
                >
                  {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                </button>
              </>
            ) : (
              <>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsEditing(true);
                  }}
                  data-sound="action"
                  className="opacity-0 group-hover:opacity-100 transition-all duration-300 p-2 rounded-full hover:bg-slate-50 text-slate-300 hover:text-slate-500 transform hover:scale-110"
                  title="编辑回忆"
                >
                  <Edit2 size={14} />
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(memory.id);
                  }}
                  data-sound="action"
                  className="opacity-0 group-hover:opacity-100 transition-all duration-300 p-2 rounded-full hover:bg-rose-50 text-slate-300 hover:text-rose-500 transform hover:scale-110"
                  title="删除回忆"
                >
                  <Trash2 size={14} />
                </button>
              </>
            )}
          </div>
        )}
      </div>
      
      {/* Watermark Icon */}
      <div className="absolute bottom-4 right-4 text-6xl opacity-[0.03] pointer-events-none select-none transition-opacity duration-500 group-hover:opacity-[0.40]">
         {isHer ? '🐱' : '🐶'}
      </div>
    </div>
  );
};