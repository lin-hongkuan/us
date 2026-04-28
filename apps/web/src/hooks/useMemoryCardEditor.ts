import { useEffect, useRef, useState } from 'react';
import { Memory } from '../types';
import { uploadImage } from '../services/storageService';
import { getMemoryImageUrls } from '../services/memoryMapper';
import { formatImageValidationIssues, validateImageFiles } from '../services/imageValidation';
import { useFeedbackContext } from '../context/feedbackContext';

export interface DisplayImage {
  url: string;
  isNew: boolean;
}

export const useMemoryCardEditor = (
  memory: Memory,
  onUpdate: (id: string, content: string, imageUrls?: string[] | null) => Promise<boolean>,
) => {
  const { showToast } = useFeedbackContext();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editContent, setEditContent] = useState(memory.content);
  const [editImageUrls, setEditImageUrls] = useState<string[]>(getMemoryImageUrls(memory));
  const [editImageFiles, setEditImageFiles] = useState<File[]>([]);
  const [newImagePreviews, setNewImagePreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewUrlsRef = useRef<string[]>([]);
  previewUrlsRef.current = newImagePreviews;

  useEffect(() => {
    previewUrlsRef.current.forEach(url => {
      if (url.startsWith('blob:')) URL.revokeObjectURL(url);
    });
    setEditContent(memory.content);
    setEditImageUrls(getMemoryImageUrls(memory));
    setEditImageFiles([]);
    setNewImagePreviews([]);
  }, [memory]);

  useEffect(() => {
    return () => {
      previewUrlsRef.current.forEach(url => {
        if (url.startsWith('blob:')) URL.revokeObjectURL(url);
      });
    };
  }, []);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    if (files.length === 0) return;

    const existingImageCount = editImageUrls.length + editImageFiles.length;
    const { acceptedFiles, issues } = validateImageFiles(files, existingImageCount);

    if (issues.length > 0) {
      showToast({
        tone: 'warning',
        title: '有些照片没有添加',
        description: formatImageValidationIssues(issues),
      });
    }

    if (acceptedFiles.length > 0) {
      const newPreviews = acceptedFiles.map(file => URL.createObjectURL(file));
      setEditImageFiles(prev => [...prev, ...acceptedFiles]);
      setNewImagePreviews(prev => [...prev, ...newPreviews]);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveExistingImage = (index: number) => {
    setEditImageUrls(prev => prev.filter((_, i) => i !== index));
  };

  const handleRemoveNewImage = (index: number) => {
    const url = newImagePreviews[index];
    if (url?.startsWith('blob:')) URL.revokeObjectURL(url);
    setEditImageFiles(prev => prev.filter((_, i) => i !== index));
    setNewImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleRemoveDisplayImage = (image: DisplayImage) => {
    if (image.isNew) {
      const newIndex = newImagePreviews.indexOf(image.url);
      if (newIndex !== -1) handleRemoveNewImage(newIndex);
      return;
    }

    const existingIndex = editImageUrls.indexOf(image.url);
    if (existingIndex !== -1) handleRemoveExistingImage(existingIndex);
  };

  const handleCancelEdit = () => {
    newImagePreviews.forEach(url => {
      if (url.startsWith('blob:')) URL.revokeObjectURL(url);
    });
    setEditContent(memory.content);
    setEditImageUrls(getMemoryImageUrls(memory));
    setEditImageFiles([]);
    setNewImagePreviews([]);
    setIsEditing(false);
  };

  const handleSaveEdit = async () => {
    const contentChanged = editContent.trim() !== memory.content;
    const originalUrls = getMemoryImageUrls(memory);
    const imagesChanged =
      editImageUrls.length !== originalUrls.length ||
      !editImageUrls.every((url, i) => url === originalUrls[i]) ||
      editImageFiles.length > 0;

    if (!contentChanged && !imagesChanged) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    try {
      const uploadedUrls: string[] = [];
      for (const file of editImageFiles) {
        const url = await uploadImage(file);
        if (!url) {
          throw new Error(`图片 ${file.name} 上传失败`);
        }
        uploadedUrls.push(url);
      }

      const finalUrls = [...editImageUrls, ...uploadedUrls];
      const success = await onUpdate(memory.id, editContent, finalUrls.length > 0 ? finalUrls : null);
      if (success) {
        newImagePreviews.forEach(url => {
          if (url.startsWith('blob:')) URL.revokeObjectURL(url);
        });
        setIsEditing(false);
        setEditImageFiles([]);
        setNewImagePreviews([]);
      }
    } catch (error) {
      console.error('Failed to update memory card:', error);
      showToast({
        tone: 'error',
        title: '更新失败了',
        description: error instanceof Error ? error.message : '请检查网络后再试一次',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const displayImages = isEditing
    ? [...editImageUrls.map(url => ({ url, isNew: false })), ...newImagePreviews.map(url => ({ url, isNew: true }))]
    : getMemoryImageUrls(memory).map(url => ({ url, isNew: false }));

  return {
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
  };
};
