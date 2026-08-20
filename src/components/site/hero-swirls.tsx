"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

/** Opacity hits 0 after this share of a viewport height of scrolling. */
const FADE_DISTANCE_VH = 0.7;

/**
 * Decorative swirl band fixed to the bottom of the viewport, so it holds its
 * position while the hero scrolls away. Layered behind all page content
 * (-z-10) and shifted down by half its height so only the top half peeks in.
 * No animation — opacity is a pure function of scroll position, 1 at the top
 * of the page to 0.
 */
export function HeroSwirls() {
  const [opacity, setOpacity] = useState(1);

  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const fadeDistance = window.innerHeight * FADE_DISTANCE_VH;
      setOpacity(Math.max(0, 1 - window.scrollY / fadeDistance));
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

  if (opacity === 0) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 bottom-0 -z-10 translate-y-1/2"
      style={{ opacity }}
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
