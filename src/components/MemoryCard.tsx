/**
 * ==========================================
 * 记忆卡片组件
 * ==========================================
 *
 * 显示单个记忆的卡片组件，具有编辑功能。
 * 支持查看、编辑、删除和图片管理记忆。
 *
 * 功能特性：
 * - 显示记忆内容和图片
 * - 行内文本编辑的编辑模式
 * - 图片上传、预览和删除
 * 作者特定的权限（只有作者可以编辑/删除）
 * - 可展开的图片视图
 * - 响应式设计和动画
 */

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Memory, UserType, getAvatar } from '../types';
import { Quote, Trash2, Edit2, Check, X, Loader2, ImagePlus, Trash, Download, Maximize2 } from 'lucide-react';
import { uploadImage } from '../services/storageService';

/**
 * 记忆卡片组件的属性接口
 */
interface MemoryCardProps {
  /** 要显示的记忆数据 */
  memory: Memory;
  /** 删除记忆时的回调函数 */
  onDelete: (id: string) => void;
  /** 更新记忆时的回调函数 */
  onUpdate: (id: string, content: string, imageUrls?: string[] | null) => Promise<boolean>;
  /** 当前登录用户 */
  currentUser: UserType;
}

/**
 * 具有编辑功能的单个记忆卡片组件
 * 显示记忆内容、图片，并为作者提供编辑控件
 * 使用 React.memo 优化重渲染性能
 */
export const MemoryCard: React.FC<MemoryCardProps> = React.memo(({ memory, onDelete, onUpdate, currentUser }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [editContent, setEditContent] = useState(memory.content);
  // Multi-image state
  const [editImageUrls, setEditImageUrls] = useState<string[]>(
    memory.imageUrls || (memory.imageUrl ? [memory.imageUrl] : [])
  );
  const [editImageFiles, setEditImageFiles] = useState<File[]>([]);
  const [newImagePreviews, setNewImagePreviews] = useState<string[]>([]);
  
  const [expandedImageIndex, setExpandedImageIndex] = useState<number | null>(null);
  const [previewImageIndex, setPreviewImageIndex] = useState<number | null>(null);
  const [isImageExpanded, setIsImageExpanded] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Determine if current memory belongs to "Her"
  const isHer = memory.author === UserType.HER;

  // Sync external memory data to local edit state
  useEffect(() => {
    setEditContent(memory.content);
    setEditImageUrls(memory.imageUrls || (memory.imageUrl ? [memory.imageUrl] : []));
    setEditImageFiles([]);
    setNewImagePreviews([]);
  }, [memory]);

  // Only the author can modify their own memories
  const canModify = currentUser === memory.author;

  // Format date manually to avoid additional locale bundle size
  const date = new Date(memory.createdAt);
  const dateStr = `${date.getFullYear()} . ${date.getMonth() + 1} . ${date.getDate()}`;

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    if (files.length === 0) return;

    const totalImages = editImageUrls.length + editImageFiles.length + files.length;
    if (totalImages > 9) {
      alert('最多只能上传 9 张图片');
      return;
    }

    const validFiles: File[] = [];
    const newPreviews: string[] = [];
    let processed = 0;

    files.forEach(file => {
      if (file.size > 10 * 1024 * 1024) {
        alert(`图片 ${file.name} 大小不能超过 10MB`);
        return;
      }
      validFiles.push(file);
      
      const reader = new FileReader();
      reader.onloadend = () => {
        newPreviews.push(reader.result as string);
        processed++;
        if (processed === files.length) {
          setEditImageFiles(prev => [...prev, ...validFiles]);
          setNewImagePreviews(prev => [...prev, ...newPreviews]);
        }
      };
      reader.readAsDataURL(file);
    });
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveExistingImage = (index: number) => {
    setEditImageUrls(prev => prev.filter((_, i) => i !== index));
  };

  const handleRemoveNewImage = (index: number) => {
    setEditImageFiles(prev => prev.filter((_, i) => i !== index));
    setNewImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleCancelEdit = () => {
    setEditContent(memory.content);
    setEditImageUrls(memory.imageUrls || (memory.imageUrl ? [memory.imageUrl] : []));
    setEditImageFiles([]);
    setNewImagePreviews([]);
    setIsEditing(false);
  };

  const handleSaveEdit = async () => {
    const contentChanged = editContent.trim() !== memory.content;
    const originalUrls = memory.imageUrls || (memory.imageUrl ? [memory.imageUrl] : []);
    const imagesChanged = 
      editImageUrls.length !== originalUrls.length ||
      !editImageUrls.every((url, i) => url === originalUrls[i]) ||
      editImageFiles.length > 0;
    
    if (contentChanged || imagesChanged) {
      setIsSaving(true);
      try {
        const uploadedUrls: string[] = [];
        
        for (const file of editImageFiles) {
          const url = await uploadImage(file);
          if (url) uploadedUrls.push(url);
        }
        
        const finalUrls = [...editImageUrls, ...uploadedUrls];
        
        const success = await onUpdate(memory.id, editContent, finalUrls.length > 0 ? finalUrls : null);
        if (success) {
          setIsEditing(false);
          setEditImageFiles([]);
          setNewImagePreviews([]);
        }
      } finally {
        setIsSaving(false);
      }
    } else {
      setIsEditing(false);
    }
  };

  const displayImages = isEditing 
    ? [...editImageUrls.map(url => ({ url, isNew: false })), ...newImagePreviews.map(url => ({ url, isNew: true }))]
    : (memory.imageUrls || (memory.imageUrl ? [memory.imageUrl] : [])).map(url => ({ url, isNew: false }));

  // Determine which image to show as main preview (default to first one)
  const mainPreviewIndex = previewImageIndex !== null && previewImageIndex < displayImages.length 
    ? previewImageIndex 
    : 0;

  return (
    <div 
      data-sound={isHer ? 'her' : 'him'}
      className={`
        relative group p-6 md:p-8 mb-8 md:mb-12 rounded-2xl md:rounded-3xl border
        transform-gpu
        md:transition-[border-color,box-shadow,transform] md:duration-300
        md:hover:shadow-[0_30px_60px_-15px_rgba(0,0,0,0.08)] md:dark:hover:shadow-[0_30px_60px_-15px_rgba(0,0,0,0.3)] md:hover:-translate-y-2
        ${isHer 
          ? 'bg-white dark:bg-slate-800 border-rose-100/50 dark:border-rose-900/50 md:hover:border-rose-200 md:dark:hover:border-rose-700' 
          : 'bg-white dark:bg-slate-800 border-sky-100/50 dark:border-sky-900/50 md:hover:border-sky-200 md:dark:hover:border-sky-700'
        }
      `}
    >
      {/* Decorative Tape/Pin Effect */}
      <div className={`absolute -top-2.5 left-1/2 -translate-x-1/2 w-24 h-6 rotate-[-2deg] border border-white/60 dark:border-slate-600/60 shadow-sm ${isHer ? 'bg-rose-200/90 dark:bg-rose-800/90' : 'bg-sky-200/90 dark:bg-sky-800/90'}`}></div>

      {/* Quote Icon */}
      <div className={`absolute -left-3 top-8 w-8 h-8 rounded-full bg-white dark:bg-slate-700 border shadow-sm flex items-center justify-center transition-transform group-hover:scale-110 duration-500 ${isHer ? 'text-rose-300 dark:text-rose-400 border-rose-100 dark:border-rose-800' : 'text-sky-300 dark:text-sky-400 border-sky-100 dark:border-sky-800'}`}>
        <Quote size={12} fill="currentColor" className="opacity-60 rotate-180" />
      </div>

      {/* Content */}
      <div className="relative z-10">
        {/* Image Display Area */}
        {displayImages.length > 0 && (
          <div className="mb-4">
            {/* Main Preview Image */}
            <div className="relative rounded-xl overflow-hidden group/image mb-2">
              <img 
                src={displayImages[mainPreviewIndex].url} 
                alt={`Memory Main`} 
                className={`w-full object-cover transition-all duration-300 cursor-pointer ${
                  isImageExpanded ? 'max-h-[70vh]' : 'max-h-64'
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!isEditing) {
                    setIsImageExpanded(!isImageExpanded);
                  }
                }}
              />
              
              {/* Full Screen Button (Top Right) */}
              {!isEditing && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpandedImageIndex(mainPreviewIndex);
                  }}
                  className="absolute top-2 right-2 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white opacity-0 group-hover/image:opacity-100 transition-all duration-300 transform hover:scale-110"
                  title="全屏查看"
                >
                  <Maximize2 size={16} />
                </button>
              )}

              {/* Edit Controls Overlay */}
              {isEditing && (
                <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover/image:opacity-100 transition-all duration-300">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const img = displayImages[mainPreviewIndex];
                      if (img.isNew) {
                        const newIndex = newImagePreviews.indexOf(img.url);
                        if (newIndex !== -1) handleRemoveNewImage(newIndex);
                      } else {
                        const existingIndex = editImageUrls.indexOf(img.url);
                        if (existingIndex !== -1) handleRemoveExistingImage(existingIndex);
                      }
                      // Reset preview index if needed
                      if (mainPreviewIndex >= displayImages.length - 1) {
                        setPreviewImageIndex(Math.max(0, displayImages.length - 2));
                      }
                    }}
                    className="p-2 bg-black/50 hover:bg-red-500/70 rounded-full text-white"
                    title="删除图片"
                  >
                    <Trash size={16} />
                  </button>
                </div>
              )}
              
              {/* Download Button (Bottom Right) */}
              {!isEditing && (
                <div className="absolute bottom-2 right-2 flex gap-2 opacity-0 group-hover/image:opacity-100 transition-all duration-300">
                  <a
                    href={displayImages[mainPreviewIndex].url}
                    download={`memory-${memory.id}-${mainPreviewIndex}.jpg`}
                    onClick={(e) => e.stopPropagation()}
                    className="p-2 bg-black/50 hover:bg-black/70 rounded-full text-white"
                    title="下载图片"
                  >
                    <Download size={16} />
                  </a>
                </div>
              )}
            </div>

            {/* Thumbnails List (if more than 1 image) */}
            {displayImages.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {displayImages.map((img, index) => (
                  <button
                    key={index}
                    onClick={(e) => {
                      e.stopPropagation();
                      setPreviewImageIndex(index);
                      setIsImageExpanded(false); // Reset expansion when switching images
                    }}
                    className={`relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all duration-200 ${
                      mainPreviewIndex === index 
                        ? (isHer ? 'border-rose-400 ring-2 ring-rose-200' : 'border-sky-400 ring-2 ring-sky-200') 
                        : 'border-transparent opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img 
                      src={img.url} 
                      alt={`Thumbnail ${index + 1}`} 
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}

            {/* Expanded Image Portal */}
            {expandedImageIndex !== null && createPortal(
              <div 
                className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm animate-in fade-in duration-300"
                onClick={(e) => {
                  e.stopPropagation();
                  setExpandedImageIndex(null);
                }}
              >
                <button
                  className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors z-[110]"
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpandedImageIndex(null);
                  }}
                >
                  <X size={24} />
                </button>
                
                {/* Navigation Buttons for Fullscreen */}
                {displayImages.length > 1 && (
                  <>
                    <button
                      className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors z-[110]"
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedImageIndex((prev) => 
                          prev !== null ? (prev - 1 + displayImages.length) % displayImages.length : 0
                        );
                      }}
                    >
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                    </button>
                    <button
                      className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors z-[110]"
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedImageIndex((prev) => 
                          prev !== null ? (prev + 1) % displayImages.length : 0
                        );
                      }}
                    >
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                    </button>
                  </>
                )}

                <img 
                  src={displayImages[expandedImageIndex].url} 
                  alt="Full screen memory" 
                  className="max-w-[95vw] max-h-[95vh] object-contain rounded-lg shadow-2xl animate-in zoom-in-95 duration-300"
                  onClick={(e) => e.stopPropagation()} 
                />
                
                {/* Image Counter */}
                {displayImages.length > 1 && (
                  <div className="absolute bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/50 rounded-full text-white text-sm font-medium backdrop-blur-md">
                    {expandedImageIndex + 1} / {displayImages.length}
                  </div>
                )}
              </div>,
              document.body
            )}
          </div>
        )}

        {/* Add image button when editing and count < 9 */}
        {isEditing && (editImageUrls.length + editImageFiles.length) < 9 && (
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

        {/* Hidden file input */}
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
            className="w-full bg-transparent border-b border-slate-200 dark:border-slate-600 focus:border-slate-400 dark:focus:border-slate-500 focus:ring-0 p-0 font-serif text-lg md:text-xl leading-loose text-slate-700 dark:text-slate-200 tracking-wide resize-none outline-none"
            rows={Math.max(3, editContent.split('\n').length)}
            autoFocus
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <p className="font-serif text-lg md:text-xl leading-loose text-slate-700 dark:text-slate-200 tracking-wide whitespace-pre-wrap">
            {memory.content}
          </p>
        )}
      </div>

      {/* Footer */}
      <div className="flex justify-between items-end mt-8 pt-6 border-t border-slate-100 dark:border-slate-700">
        <div className="flex flex-col gap-1">
           <span className={`text-[10px] font-bold uppercase tracking-[0.2em] ${isHer ? 'text-rose-400 dark:text-rose-300' : 'text-sky-400 dark:text-sky-300'}`}>
             {isHer ? 'Her Memory' : 'His Memory'}
           </span>
           <span className="font-sans text-[10px] font-bold text-slate-500 dark:text-slate-400 tracking-[0.15em] mt-1">
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
                  className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors disabled:opacity-50"
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
                  className={`p-2 rounded-full transition-colors ${isHer ? 'hover:bg-rose-50 dark:hover:bg-rose-900/30 text-rose-400 dark:text-rose-300 hover:text-rose-600 dark:hover:text-rose-400' : 'hover:bg-sky-50 dark:hover:bg-sky-900/30 text-sky-400 dark:text-sky-300 hover:text-sky-600 dark:hover:text-sky-400'} disabled:opacity-50`}
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
                  className="opacity-0 group-hover:opacity-100 transition-all duration-300 p-2 rounded-full hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-300 dark:text-slate-500 hover:text-slate-500 dark:hover:text-slate-300 transform hover:scale-110"
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
                  className="opacity-0 group-hover:opacity-100 transition-all duration-300 p-2 rounded-full hover:bg-rose-50 dark:hover:bg-rose-900/30 text-slate-300 dark:text-slate-500 hover:text-rose-500 dark:hover:text-rose-400 transform hover:scale-110"
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
      <div className="absolute bottom-4 right-4 text-6xl opacity-[0.03] dark:opacity-[0.05] pointer-events-none select-none transition-opacity duration-500 group-hover:opacity-[0.40] dark:group-hover:opacity-[0.30]">
         {isHer ? getAvatar(UserType.HER) : getAvatar(UserType.HIM)}
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // 自定义比较函数：仅当关键属性变化时重渲染
  return (
    prevProps.memory.id === nextProps.memory.id &&
    prevProps.memory.content === nextProps.memory.content &&
    prevProps.memory.imageUrl === nextProps.memory.imageUrl &&
    JSON.stringify(prevProps.memory.imageUrls) === JSON.stringify(nextProps.memory.imageUrls) &&
    prevProps.currentUser === nextProps.currentUser
  );
});