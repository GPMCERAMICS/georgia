import type { Doc } from "@convex/_generated/dataModel";

export const money = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);

export const shortDate = (ms: number) =>
  new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(ms);

export const longDate = (ms: number) =>
  new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(ms);

/** Midnight on the first of the current month, local time. */
export function startOfMonth(now: number): number {
  const d = new Date(now);
  return new Date(d.getFullYear(), d.getMonth(), 1).getTime();
}

type BadgeVariant =
  | "default"
  | "secondary"
  | "success"
  | "warning"
  | "destructive"
  | "outline"
  | "muted";

export const orderStatusMeta: Record<Doc<"orders">["status"], { label: string; variant: BadgeVariant }> = {
  pending: { label: "Checking out", variant: "muted" },
  paid: { label: "To ship", variant: "warning" },
  shipped: { label: "Shipped", variant: "success" },
  delivered: { label: "Delivered", variant: "secondary" },
  expired: { label: "Expired", variant: "muted" },
  cancelled: { label: "Cancelled", variant: "muted" },
  refunded: { label: "Refunded", variant: "destructive" },
};

export const inquiryStatusMeta: Record<
  Doc<"inquiries">["status"],
  { label: string; variant: BadgeVariant }
> = {
  new: { label: "New", variant: "warning" },
  replied: { label: "Replied", variant: "secondary" },
  quoted: { label: "Quoted", variant: "secondary" },
  inProgress: { label: "In progress", variant: "success" },
  done: { label: "Done", variant: "muted" },
  declined: { label: "Declined", variant: "muted" },
};

export const pieceStatusMeta: Record<Doc<"pieces">["status"], { label: string; variant: BadgeVariant }> = {
  draft: { label: "Draft", variant: "muted" },
  published: { label: "Live", variant: "success" },
  archived: { label: "Archived", variant: "outline" },
};

export const modeLabel = {
  oneoff: "One of a kind",
  madeToOrder: "Made to order",
} as const;
