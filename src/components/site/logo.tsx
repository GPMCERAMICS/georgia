import { G_PATH, G_VIEWBOX } from "@/lib/logo-path";

// The "g" logo mark. Uses currentColor so callers set the color via text-*.
export function Logo({ className }: { className?: string }) {
  return (
    <svg
      viewBox={G_VIEWBOX}
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path d={G_PATH} />
    </svg>
  );
}
