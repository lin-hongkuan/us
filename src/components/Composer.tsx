/**
 * ==========================================
 * 撰写器组件
 * ==========================================
 *
 * 用于创建新记忆的模态框组件。支持文本输入和图片上传，
 * 并根据用户身份提供特定主题色彩（粉色为她，蓝色为他）。
 *
 * 功能特性：
 * - 记忆内容文本输入
 * - 图片上传、预览和验证
 * - 用户特定的颜色主题
 * - 加载状态和错误处理
 * - 响应式设计和背景模糊
 */

import React, { useState, useRef } from 'react';
import { UserType } from '../types';
import { Send, X, ImagePlus } from 'lucide-react';
import { uploadImage } from '../services/storageService';

/**
 * 撰写器组件的属性接口
 */
interface ComposerProps {
  /** 当前创建记忆的用户 */
  currentUser: UserType;
  /** 保存记忆时的回调函数 */
  onSave: (content: string, imageUrls?: string[]) => Promise<void>;
  /** 关闭撰写器时的回调函数 */
  onClose: () => void;
}

/**
 * 记忆创建模态框组件
 * 支持文本和图片输入，并提供用户特定的样式
 */
export const Composer: React.FC<ComposerProps> = ({ currentUser, onSave, onClose }) => {
  // 文本内容状态
  const [text, setText] = useState('');
  // 图片预览URL状态
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  // 选中的图片文件状态
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  // 保存操作期间的加载状态
  const [isProcessing, setIsProcessing] = useState(false);
  // 隐藏文件输入的引用
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 根据当前用户确定的UI主题
  const isHer = currentUser === UserType.HER;

  /**
   * Handle form submission
   * Uploads image if present, then saves the memory
   */
  const handleSubmit = async () => {
    if (!text.trim() && imageFiles.length === 0) return;

    setIsProcessing(true);
    try {
      const uploadedUrls: string[] = [];

      // Upload all images
      for (const file of imageFiles) {
        const url = await uploadImage(file);
        if (url) uploadedUrls.push(url);
      }

      await onSave(text, uploadedUrls.length > 0 ? uploadedUrls : undefined);
      // Reset form after successful save
      setText('');
      setImagePreviews([]);
      setImageFiles([]);
    } catch (error) {
      console.error('Failed to save:', error);
      alert('保存失败，请重试');
    } finally {
      setIsProcessing(false);
    }
  };

  // 选择图片：校验类型/大小，生成预览并存储文件
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newFiles: File[] = [];
    
    // Process each selected file
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Check file type
      if (!file.type.startsWith('image/')) {
        continue;
      }

      // Check file size (max 50MB before compression)
      if (file.size > 50 * 1024 * 1024) {
        alert(`图片 ${file.name} 大小超过50MB`);
        continue;
      }
      
      newFiles.push(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          setImagePreviews(prev => [...prev, e.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
    }

    // Store the files for later upload
    setImageFiles(prev => [...prev, ...newFiles]);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // 移除已选图片
  const handleRemoveImage = (index: number) => {
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
    setImageFiles(prev => prev.filter((_, i) => i !== index));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-4 transition-all duration-500 animate-in fade-in duration-300">
      <div className="relative w-full max-w-lg transform overflow-hidden rounded-[2rem] bg-white/95 dark:bg-slate-900/95 shadow-2xl transition-all animate-in zoom-in-95 slide-in-from-bottom-4 duration-500 border border-white/20 dark:border-slate-700/30">
        
        {/* Background Gradient/Mesh */}
        <div className={`absolute inset-0 opacity-30 pointer-events-none bg-gradient-to-br ${isHer ? 'from-rose-100/50 via-transparent to-rose-50/30' : 'from-sky-100/50 via-transparent to-sky-50/30'} animate-pulse`} />
        
        {/* Header Bar */}
        <div className={`h-1.5 w-full bg-gradient-to-r ${isHer ? 'from-rose-300 via-rose-400 to-rose-500' : 'from-sky-300 via-sky-400 to-sky-500'}`} />

        <div className="relative p-8">
            {/* Close Button */}
            <button 
              onClick={onClose} 
              className="absolute top-6 right-6 p-2 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-300 transition-all duration-300 hover:rotate-90"
            >
              <X size={20} />
            </button>

            {/* Title */}
            <div className="mb-8 text-center animate-in slide-in-from-bottom-2 fade-in duration-500 delay-100 fill-mode-backwards">
                <h2 className={`font-serif text-2xl md:text-3xl font-medium tracking-wide ${isHer ? 'text-rose-900 dark:text-rose-100' : 'text-sky-900 dark:text-sky-100'}`}>
                    记录{isHer ? '他对你的好' : '她对你的好'}
                </h2>
                <div className={`mx-auto mt-3 h-1 w-12 rounded-full ${isHer ? 'bg-rose-200' : 'bg-sky-200'}`} />
            </div>

            {/* Textarea Area */}
            <div className="relative mb-6 group animate-in slide-in-from-bottom-2 fade-in duration-500 delay-200 fill-mode-backwards">
                <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder={isHer ? "他今天做了什么让你感动的事？" : "她今天有什么让你心动的瞬间？"}
                    className={`w-full h-40 resize-none rounded-xl bg-slate-50 dark:bg-slate-800/50 p-4 text-base leading-relaxed text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-all duration-300 ${isHer ? 'focus:ring-rose-100 dark:focus:ring-rose-900/30 focus:bg-white dark:focus:bg-slate-800' : 'focus:ring-sky-100 dark:focus:ring-sky-900/30 focus:bg-white dark:focus:bg-slate-800'}`}
                />
            </div>

            {/* Image Previews */}
            {imagePreviews.length > 0 && (
                <div className="mb-6 grid grid-cols-3 gap-2 animate-in zoom-in-95 fade-in duration-300 max-h-48 overflow-y-auto pr-1">
                    {imagePreviews.map((preview, index) => (
                        <div key={index} className="relative aspect-square overflow-hidden rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm group/image">
                            <img src={preview} alt={`Preview ${index}`} className="h-full w-full object-cover transition-transform duration-700 group-hover/image:scale-105" />
                            <div className="absolute inset-0 bg-black/0 transition-colors group-hover/image:bg-black/10" />
                            <button
                                onClick={() => handleRemoveImage(index)}
                                className="absolute top-1 right-1 rounded-full bg-black/50 p-1 text-white opacity-0 backdrop-blur-sm transition-all hover:bg-black/70 group-hover/image:opacity-100 hover:scale-110"
                            >
                                <X size={12} />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between pt-2 animate-in slide-in-from-bottom-2 fade-in duration-500 delay-300 fill-mode-backwards">
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageSelect}
                    className="hidden"
                />
                
                <button
                    onClick={() => fileInputRef.current?.click()}
                    className={`group flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all duration-300 hover:scale-105 active:scale-95 ${
                        isHer 
                        ? 'text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-900/20' 
                        : 'text-sky-600 hover:bg-sky-50 dark:text-sky-400 dark:hover:bg-sky-900/20'
                    }`}
                >
                    <div className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${isHer ? 'bg-rose-100 group-hover:bg-rose-200 dark:bg-rose-900/40' : 'bg-sky-100 group-hover:bg-sky-200 dark:bg-sky-900/40'}`}>
                        <ImagePlus size={16} className="transition-transform duration-300 group-hover:rotate-12" />
                    </div>
                    <span>{imagePreviews.length > 0 ? '添加更多' : '添加照片'}</span>
                </button>

                <button
                    onClick={handleSubmit}
                    disabled={isProcessing || (!text.trim() && imageFiles.length === 0)}
                    className={`group flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-medium text-white shadow-md transition-all hover:shadow-lg hover:-translate-y-0.5 active:scale-95 disabled:opacity-50 disabled:hover:translate-y-0 ${
                        isHer
                        ? 'bg-gradient-to-r from-rose-400 to-rose-600 hover:from-rose-500 hover:to-rose-700 shadow-rose-200 dark:shadow-none'
                        : 'bg-gradient-to-r from-sky-400 to-sky-600 hover:from-sky-500 hover:to-sky-700 shadow-sky-200 dark:shadow-none'
                    }`}
                >
                    <span>{isProcessing ? '记录中...' : '记录美好'}</span>
                    {!isProcessing && <Send size={14} className="transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1" />}
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};
