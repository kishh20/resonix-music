import React, { useState, useEffect } from 'react';
import { Music2 } from 'lucide-react';

interface SafeImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src?: string | null;
  alt: string;
  fallbackSrc?: string;
  className?: string;
  aspectRatio?: 'square' | 'video' | 'auto';
  showIconFallback?: boolean;
}

const DEFAULT_FALLBACK = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80';

export const SafeImage: React.FC<SafeImageProps> = ({
  src,
  alt,
  fallbackSrc = DEFAULT_FALLBACK,
  className = '',
  aspectRatio = 'square',
  showIconFallback = true,
  ...props
}) => {
  const [currentSrc, setCurrentSrc] = useState<string | null>(src || null);
  const [hasError, setHasError] = useState(false);
  const [retryStage, setRetryStage] = useState(0);

  useEffect(() => {
    setCurrentSrc(src || null);
    setHasError(!src);
    setRetryStage(0);
  }, [src]);

  const handleError = () => {
    // If it's a YouTube thumbnail (maxresdefault often 404s), try lower resolutions first
    if (currentSrc && currentSrc.includes('i.ytimg.com/vi/')) {
      if (retryStage === 0 && currentSrc.includes('maxresdefault.jpg')) {
        setRetryStage(1);
        setCurrentSrc(currentSrc.replace('maxresdefault.jpg', 'hqdefault.jpg'));
        return;
      }
      if (retryStage === 1 && currentSrc.includes('hqdefault.jpg')) {
        setRetryStage(2);
        setCurrentSrc(currentSrc.replace('hqdefault.jpg', 'mqdefault.jpg'));
        return;
      }
    }

    // Next fallback: try default fallback image if not already tried
    if (currentSrc !== fallbackSrc && fallbackSrc) {
      setCurrentSrc(fallbackSrc);
      return;
    }

    // Both primary and fallback failed -> show styled gradient icon placeholder
    setHasError(true);
  };

  if (hasError || !currentSrc) {
    if (showIconFallback) {
      return (
        <div
          className={`flex flex-col items-center justify-center bg-gradient-to-br from-slate-800 via-slate-900 to-emerald-950 text-slate-500 select-none overflow-hidden ${
            aspectRatio === 'square' ? 'aspect-square' : aspectRatio === 'video' ? 'aspect-video' : ''
          } ${className}`}
        >
          <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-emerald-400/70 mb-1">
            <Music2 className="w-4 h-4" />
          </div>
          <span className="text-[10px] font-mono text-slate-400 px-2 text-center truncate max-w-full">
            {alt || 'Resonix Audio'}
          </span>
        </div>
      );
    }
  }

  return (
    <img
      src={currentSrc || fallbackSrc}
      alt={alt}
      loading="lazy"
      onError={handleError}
      className={className}
      {...props}
    />
  );
};
