"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * On the two-column layout the square photo is capped so that it, the
 * breadcrumb above it and the thumbnail row below it fit in the window
 * together: the 10.75rem is those two rows plus the block's padding.
 */
export const PIECE_PHOTO_FIT = "md:max-w-[calc(100svh-10.75rem)]";

/** One large photo with a row of thumbnails that swap it. */
export function PieceGallery({ images, title }: { images: string[]; title: string }) {
  const [index, setIndex] = useState(0);
  const current = images[Math.min(index, images.length - 1)];

  return (
    <div>
      <div className={cn("relative aspect-square overflow-hidden bg-muted", PIECE_PHOTO_FIT)}>
        <Image
          key={current}
          src={current}
          alt={title}
          fill
          priority
          sizes="(min-width: 768px) 50vw, 100vw"
          className="object-cover"
        />
      </div>
      {images.length > 1 && (
        <div className={cn("mt-3 flex flex-wrap gap-3 md:flex-nowrap", PIECE_PHOTO_FIT)}>
          {images.map((url, i) => (
            <button
              key={url}
              type="button"
              aria-label={`Photo ${i + 1} of ${images.length}`}
              aria-current={i === index}
              onClick={() => setIndex(i)}
              className={cn(
                // One row on the two-column layout: thumbnails shrink to share it, so
                // every photo stays reachable while the block is pinned.
                "relative aspect-square w-16 overflow-hidden bg-muted outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring md:w-auto md:min-w-0 md:max-w-20 md:flex-1",
                i === index ? "ring-2 ring-inset ring-foreground" : "opacity-70 hover:opacity-100",
              )}
            >
              <Image src={url} alt="" fill sizes="80px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
