import Image from "next/image";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { SiteHeader } from "./site-header";

/**
 * A full-width photo that opens a page, with the site header laid over it.
 * `tall` is the homepage hero; the default is the short strip the inner
 * pages use.
 */
export function PageBanner({
  image,
  tall = false,
  children,
}: {
  image: string;
  tall?: boolean;
  children: ReactNode;
}) {
  return (
    <section
      className={cn(
        "relative isolate flex flex-col text-white",
        tall ? "min-h-[86vh]" : "min-h-[340px] md:min-h-[420px]",
      )}
    >
      <Image
        src={image}
        alt=""
        fill
        priority
        sizes="100vw"
        className="-z-20 object-cover"
      />
      <div aria-hidden className="absolute inset-0 -z-10 bg-black/40" />
      <SiteHeader overlay />
      <div className="flex flex-1 items-center">{children}</div>
    </section>
  );
}

/** The centred statement the short banners carry. */
export function BannerStatement({ children }: { children: ReactNode }) {
  return (
    <p className="mx-auto max-w-4xl text-balance px-6 pb-14 text-center font-display text-2xl leading-snug md:text-4xl md:leading-snug">
      {children}
    </p>
  );
}
