import { PawPrint } from 'lucide-react';
import { useEffect, useState } from 'react';

interface ResilientImageProps {
  src: string;
  alt: string;
  className?: string;
  fallbackLabel?: string;
  loading?: 'eager' | 'lazy';
  decoding?: 'async' | 'sync' | 'auto';
  fetchPriority?: 'high' | 'low' | 'auto';
  width?: number;
  height?: number;
}

export function ResilientImage({
  src,
  alt,
  className = '',
  fallbackLabel,
  loading = 'lazy',
  decoding = 'async',
  fetchPriority,
  width,
  height,
}: ResilientImageProps) {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [src]);

  if (hasError || !src) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-[#F5F5F4] to-[#E7E5E4] text-[#57534E] p-4 text-center ${className}`}
        role="img"
        aria-label={alt}
      >
        <PawPrint className="w-8 h-8 text-[#C2410C]/80 mb-2" aria-hidden="true" />
        <span className="text-xs font-medium line-clamp-2 max-w-[18ch]">
          {fallbackLabel || alt}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      loading={loading}
      decoding={decoding}
      fetchPriority={fetchPriority}
      width={width}
      height={height}
      onError={() => setHasError(true)}
      className={className}
    />
  );
}
