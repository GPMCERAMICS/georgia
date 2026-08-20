"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

/**
 * Decorative swirl band fixed to the bottom of the viewport, layered behind
 * all page content (-z-10). It stays visible for the whole page: as the user
 * scrolls from top to bottom, opacity eases 100% → 50% and the band slides
 * from 50% to 90% of its height below the viewport edge. Both are pure
 * functions of scroll progress — no animation.
 */
export function HeroSwirls() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const scrollable = Math.max(
        1,
        document.documentElement.scrollHeight - window.innerHeight,
      );
      setProgress(Math.min(1, Math.max(0, window.scrollY / scrollable)));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  const opacity = 1 - 0.5 * progress;
  const translateY = 50 + 40 * progress;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 bottom-0 -z-10"
      style={{ opacity, transform: `translateY(${translateY}%)` }}
    >
      <Image
        src="/swirls-bg.webp"
        alt=""
        width={1728}
        height={559}
        priority
        sizes="100vw"
        className="h-auto w-full"
      />
    </div>
  );
}
