'use client';

import React, { useState, useRef } from 'react';
import { Upload, Image as ImageIcon, X, AlertCircle, CheckCircle2 } from 'lucide-react';

interface ImageUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadImage: (assetUrl: string, width: number, height: number) => void;
}

export const ImageUploadModal: React.FC<ImageUploadModalProps> = ({ isOpen, onClose, onUploadImage }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = async (file: File) => {
    setError(null);
    if (!['image/png', 'image/jpeg', 'image/jpg', 'image/webp'].includes(file.type)) {
      setError('Please select a PNG, JPG, JPEG, or WEBP image file.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('Image file size exceeds the 10MB maximum limit.');
      return;
    }

    setIsUploading(true);

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const dataUrl = event.target?.result as string;
        if (!dataUrl) {
          setError('Failed to read image file.');
          setIsUploading(false);
          return;
        }

        // Measure image natural dimensions
        const img = new Image();
        img.onload = async () => {
          const res = await fetch('http://localhost:4000/api/upload/image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filename: file.name, dataUrl }),
          });

          const data = await res.json();
          if (!res.ok || !data.assetUrl) {
            setError(data.error || 'Failed to upload image.');
            setIsUploading(false);
            return;
          }

          const fullAssetUrl = data.assetUrl.startsWith('http')
            ? data.assetUrl
            : `http://localhost:4000${data.assetUrl}`;

          onUploadImage(fullAssetUrl, img.naturalWidth || 400, img.naturalHeight || 300);
          setIsUploading(false);
          onClose();
        };

        img.onerror = () => {
          setError('Failed to load image preview.');
          setIsUploading(false);
        };

        img.src = dataUrl;
      };

      reader.readAsDataURL(file);
    } catch (err: any) {
      console.error('Image upload failed:', err);
      setError('Error uploading image file.');
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
            <ImageIcon className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-100">Upload Image</h3>
            <p className="text-xs text-slate-400">Supported formats: PNG, JPG, JPEG, WEBP (Max 10MB)</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const file = e.dataTransfer.files?.[0];
            if (file) processFile(file);
          }}
          className="border-2 border-dashed border-slate-700 hover:border-blue-500 bg-slate-850 hover:bg-slate-800/50 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all group"
        >
          <Upload className="w-10 h-10 text-slate-400 group-hover:text-blue-400 mb-3 transition-colors" />
          <p className="text-sm font-medium text-slate-200">Click or Drag & Drop Image Here</p>
          <p className="text-xs text-slate-500 mt-1">PNG, JPG, WEBP up to 10MB</p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png, image/jpeg, image/jpg, image/webp"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        {isUploading && (
          <div className="mt-4 flex items-center justify-center gap-2 text-sm text-blue-400">
            <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
            <span>Processing and uploading image...</span>
          </div>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
