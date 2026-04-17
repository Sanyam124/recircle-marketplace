'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import imageCompression from 'browser-image-compression';

interface ImageUploadProps {
  label?: string;
  folder?: string;
  onUpload: (url: string) => void;
  onUploadingChange?: (uploading: boolean) => void;
  currentImage?: string;
  className?: string; // Container style
  imageClassName?: string; // Preview image style
  maxSizeMB?: number;
  maxWidthOrHeight?: number;
  fallbackInitial?: string;
  buttonClassName?: string;
}

/**
 * Reusable Image Upload component that handles compression and Cloudinary upload.
 */
export default function ImageUpload({
  label = 'Upload Image',
  folder = 'recircle/general',
  onUpload,
  onUploadingChange,
  currentImage,
  fallbackInitial,
  className = '',
  imageClassName = 'w-32 h-32 rounded-full',
  buttonClassName = '',
  maxSizeMB = 0.5,
  maxWidthOrHeight = 1000,
}: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState(currentImage);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setPreview(currentImage);
  }, [currentImage]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Clear the input value so the exact same file can be selected again 
    // seamlessly if the user clicks "Remove Photo" and changes their mind!
    e.target.value = '';

    try {
      setIsUploading(true);
      onUploadingChange?.(true);

      // 1. Compress Image
      const compressedFile = await imageCompression(file, {
        maxSizeMB,
        maxWidthOrHeight,
        useWebWorker: true,
      });

      // 2. Convert to Base64 for ease of transfer (matching existing patterns)
      const reader = new FileReader();
      reader.readAsDataURL(compressedFile);
      
      reader.onloadend = async () => {
        const base64data = reader.result as string;
        setPreview(base64data); // Show local preview instantly

        // Upload to Cloudinary immediately for fast saves
        const res = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: base64data, folder }),
        });

        if (res.ok) {
          const { url } = await res.json();
          setPreview(url);
          onUpload(url);
        } else {
          console.error('Upload failed');
          setPreview(currentImage);
        }
        setIsUploading(false);
        onUploadingChange?.(false);
      };

    } catch (error) {
      console.error('Image compression failed', error);
      setIsUploading(false);
      onUploadingChange?.(false);
    }
  };

  return (
    <div className={`flex flex-col items-center gap-4 ${className}`}>
      <div className={`relative overflow-hidden group border border-gray-100 dark:border-gray-700 bg-indigo-50 dark:bg-indigo-900/30 ${imageClassName} flex items-center justify-center`}>
        {preview ? (
          <Image
            src={preview}
            alt="Preview"
            fill
            className="object-cover transition-transform group-hover:scale-110"
          />
        ) : (
          <span className="text-3xl md:text-5xl font-black text-indigo-600 dark:text-indigo-400">
            {fallbackInitial?.charAt(0).toUpperCase() || 'U'}
          </span>
        )}
        {isUploading && (
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {label && (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className={buttonClassName || `px-4 py-2 text-xs font-bold rounded-xl transition-all active:scale-95 ${
            isUploading
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border-2 border-dashed border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100'
          }`}
        >
          {isUploading ? 'Processing...' : label}
        </button>
      )}

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleUpload}
        className="hidden"
        accept="image/*"
      />
    </div>
  );
}
