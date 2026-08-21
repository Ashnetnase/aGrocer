import Image from 'next/image';
import { CookingPotIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MealImageProps {
  src: string | undefined;
  width: number;
  height: number;
  className: string;
  /** Scales the placeholder icon to suit the tile it sits in. */
  iconClassName?: string;
  priority?: boolean;
}

/**
 * A meal photo, or a placeholder when there isn't one.
 *
 * Meals the family adds themselves have no image in Stage 1 (no upload), so
 * every render site goes through here rather than assuming a photo exists.
 * The placeholder uses the same moss-on-canvas treatment as the empty planner
 * tile, so an image-less meal still looks intentional.
 */
export function MealImage({ src, width, height, className, iconClassName, priority }: MealImageProps) {
  if (src) {
    return (
      <Image
        src={src}
        alt=""
        width={width}
        height={height}
        priority={priority}
        className={cn('object-cover', className)}
      />
    );
  }

  return (
    <div
      aria-hidden="true"
      className={cn('flex items-center justify-center bg-moss-50 text-moss-300', className)}
    >
      <CookingPotIcon className={iconClassName ?? 'h-6 w-6'} strokeWidth={1.75} />
    </div>
  );
}
