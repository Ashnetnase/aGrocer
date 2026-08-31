'use client';

import { useState } from 'react';
import { StoreIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProductThumbnailProps {
  src?: string;
  alt: string;
  className?: string;
}

export function ProductThumbnail({ src, alt, className }: ProductThumbnailProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <span className={cn('flex shrink-0 items-center justify-center rounded-lg bg-canvas', className)} aria-hidden>
        <StoreIcon className="h-6 w-6 text-muted" />
      </span>
    );
  }

  return (
    // Retailer images are remote, dynamic URLs and are not suitable for Next/Image optimisation.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={cn('shrink-0 rounded-lg bg-white object-contain', className)}
    />
  );
}
