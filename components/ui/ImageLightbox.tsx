'use client';

import { useEffect } from 'react';

interface ImageLightboxProps {
  src: string;
  alt?: string;
  onClose: () => void;
}

export default function ImageLightbox({ src, alt = 'Photo', onClose }: ImageLightboxProps) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
      onClick={onClose}
    >
      <button
        type="button"
        aria-label="Close"
        className="absolute top-4 right-4 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-lg text-white"
        onClick={(e) => { e.stopPropagation(); onClose(); }}
      >
        ×
      </button>
      <img
        src={src}
        alt={alt}
        className="max-h-[90svh] max-w-[90vw] rounded-sm object-contain"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}
