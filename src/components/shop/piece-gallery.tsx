"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";

/** One large photo with a row of thumbnails that swap it. */
export function PieceGallery({ images, title }: { images: string[]; title: string }) {
  const [index, setIndex] = useState(0);
  const current = images[Math.min(index, images.length - 1)];

  return (
    <div>
      <div className="relative aspect-square overflow-hidden bg-muted">
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
        <div className="mt-3 flex flex-wrap gap-3">
          {images.map((url, i) => (
            <button
              key={url}
              type="button"
              aria-label={`Photo ${i + 1} of ${images.length}`}
              aria-current={i === index}
              onClick={() => setIndex(i)}
              className={cn(
                "relative size-16 overflow-hidden bg-muted outline-none ring-offset-2 ring-offset-background focus-visible:ring-2 focus-visible:ring-ring md:size-20",
                i === index ? "ring-1 ring-foreground" : "opacity-70 hover:opacity-100",
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
