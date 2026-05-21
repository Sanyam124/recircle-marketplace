'use client';

import { useState, useEffect } from 'react';

interface LightboxImageProps {
  src: string;
  alt: string;
  className?: string;
  imageClassName?: string;
}

export default function LightboxImage({ src, alt, className = '', imageClassName = '' }: LightboxImageProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Close lightbox on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Prevent background scroll when lightbox is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!src) return null;

  return (
    <>
      <div className={`cursor-pointer relative group ${className}`} onClick={() => setIsOpen(true)}>
        <img src={src} alt={alt} className={imageClassName} loading="lazy" />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 rounded-[inherit]">
           <svg className="w-8 h-8 text-white drop-shadow-md" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" /></svg>
        </div>
      </div>

      {isOpen && (
        <div 
           className="fixed inset-0 z-[99999] bg-black/95 flex items-center justify-center backdrop-blur-sm animate-in fade-in duration-200"
           onClick={() => setIsOpen(false)}
        >
          <button 
              onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}
              className="absolute top-4 right-4 sm:top-6 sm:right-6 w-12 h-12 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors z-[100000]"
              aria-label="Close fullscreen"
          >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
          <div className="relative w-[95vw] h-[95vh] max-w-6xl max-h-6xl" onClick={(e) => e.stopPropagation()}>
              <img src={src} alt={alt} className="w-full h-full object-contain" />
          </div>
        </div>
      )}
    </>
  );
}
