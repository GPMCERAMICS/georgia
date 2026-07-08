/**
 * On-brand placeholder art for pieces without a real photo yet.
 * Renders a warm gradient tile with a hand-drawn ceramic silhouette so the
 * gallery reads as intentional, not "missing image". Swap for real photos by
 * setting `image` on a piece in src/lib/site.ts.
 */

type Props = {
  shape: 0 | 1 | 2 | 3;
  className?: string;
  /** Decorative by default; pass a label when it stands in for real content. */
  label?: string;
};

// Vessel silhouettes drawn in a 400×400 viewBox, sitting on a ground shadow.
const SHAPES: Record<Props["shape"], React.ReactNode> = {
  // Wide dinner plate (seen slightly from above).
  0: (
    <>
      <ellipse cx="200" cy="232" rx="132" ry="40" fill="url(#vessel)" />
      <ellipse cx="200" cy="222" rx="132" ry="40" fill="url(#vessel)" />
      <ellipse cx="200" cy="218" rx="92" ry="26" fill="url(#well)" />
    </>
  ),
  // Rounded planter / vase, tapered foot.
  1: (
    <path
      d="M132 150 Q200 120 268 150 L252 250 Q200 280 148 250 Z"
      fill="url(#vessel)"
    />
  ),
  // Tapered garden pot with rim.
  2: (
    <>
      <path d="M140 170 L260 170 L238 262 Q200 276 162 262 Z" fill="url(#vessel)" />
      <rect x="132" y="150" width="136" height="26" rx="13" fill="url(#rim)" />
    </>
  ),
  // Deep rimmed bowl.
  3: (
    <>
      <path
        d="M120 178 Q200 168 280 178 Q262 256 200 264 Q138 256 120 178 Z"
        fill="url(#vessel)"
      />
      <ellipse cx="200" cy="180" rx="80" ry="16" fill="url(#well)" />
    </>
  ),
};

export function PlaceholderVessel({ shape, className, label }: Props) {
  return (
    <svg
      viewBox="0 0 400 400"
      className={className}
      role={label ? "img" : "presentation"}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="oklch(0.94 0.02 78)" />
          <stop offset="1" stopColor="oklch(0.9 0.03 66)" />
        </linearGradient>
        <linearGradient id="vessel" x1="0" y1="0" x2="0.2" y2="1">
          <stop offset="0" stopColor="oklch(0.66 0.12 45)" />
          <stop offset="1" stopColor="oklch(0.5 0.12 38)" />
        </linearGradient>
        <linearGradient id="rim" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="oklch(0.7 0.11 47)" />
          <stop offset="1" stopColor="oklch(0.56 0.12 40)" />
        </linearGradient>
        <radialGradient id="well" cx="0.5" cy="0.4" r="0.7">
          <stop offset="0" stopColor="oklch(0.44 0.1 36)" />
          <stop offset="1" stopColor="oklch(0.54 0.12 40)" />
        </radialGradient>
      </defs>
      <rect width="400" height="400" fill="url(#bg)" />
      {/* soft cast shadow */}
      <ellipse cx="204" cy="286" rx="120" ry="22" fill="oklch(0.5 0.05 40 / 0.18)" />
      {SHAPES[shape]}
      {/* glaze highlight */}
      <ellipse cx="168" cy="196" rx="26" ry="10" fill="oklch(1 0 0 / 0.14)" />
    </svg>
  );
}
