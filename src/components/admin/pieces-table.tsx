"use client";

import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { api } from "@convex/_generated/api";
import type { Doc } from "@convex/_generated/dataModel";
import { Button } from "@/components/ui/button";

const money = (cents: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);

const collectionLabel: Record<Doc<"pieces">["collection"], string> = {
  wildlife: "Wildlife",
  heirloom: "Heirloom",
};

const modeLabel: Record<Doc<"pieces">["mode"], string> = {
  oneoff: "One-off",
  madeToOrder: "Made to order",
  deposit: "Deposit",
  drop: "Drop",
};

const statusLabel: Record<Doc<"pieces">["status"], string> = {
  draft: "Draft",
  published: "Published",
  archived: "Archived",
};

export function PiecesTable() {
  const pieces = useQuery(api.admin.pieces.list);
  const setStatus = useMutation(api.admin.pieces.setStatus);
  const markSold = useMutation(api.admin.pieces.markSold);

  async function handleToggleStatus(piece: Doc<"pieces">) {
    try {
      await setStatus({
        id: piece._id,
        status: piece.status === "published" ? "draft" : "published",
      });
    } catch {
      toast.error("Could not update that piece's status. Try again.");
    }
  }

  async function handleMarkSold(piece: Doc<"pieces">) {
    try {
      await markSold({ id: piece._id });
    } catch {
      toast.error("Could not mark that piece as sold. Try again.");
    }
  }

  // Archiving is how a piece leaves the shop for good without being deleted —
  // past sales still reference it. Restoring returns it to draft rather than
  // straight to published, so nothing reappears on the public site by accident.
  async function handleToggleArchived(piece: Doc<"pieces">) {
    try {
      await setStatus({
        id: piece._id,
        status: piece.status === "archived" ? "draft" : "archived",
      });
    } catch {
      toast.error("Could not archive that piece. Try again.");
    }
  }

  // useQuery returns undefined while loading (and while the admin-gated
  // query is still resolving auth) — render nothing conclusive until then
  // so we don't flash an empty state before real data arrives.
  if (pieces === undefined) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button asChild className="rounded-full">
          <Link href="/admin/pieces/new">New piece</Link>
        </Button>
      </div>

      {pieces.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center">
          <p className="text-sm text-muted-foreground">
            No pieces yet. Add your first one to get started.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Collection</th>
                <th className="px-4 py-3 font-medium">Mode</th>
                <th className="px-4 py-3 font-medium">Price</th>
                <th className="px-4 py-3 font-medium">Stock</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {pieces.map((piece) => (
                <tr key={piece._id}>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/pieces/${piece._id}`}
                      className="font-display text-base hover:underline"
                    >
                      {piece.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {collectionLabel[piece.collection]}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {modeLabel[piece.mode]}
                  </td>
                  <td className="px-4 py-3">{money(piece.priceCents)}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {piece.stock === null ? "Unlimited" : piece.stock}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {statusLabel[piece.status]}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-full"
                        disabled={piece.status === "archived"}
                        onClick={() => void handleToggleStatus(piece)}
                      >
                        {piece.status === "published"
                          ? "Unpublish"
                          : "Publish"}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-full"
                        disabled={piece.stock === 0}
                        onClick={() => void handleMarkSold(piece)}
                      >
                        Mark sold
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-full"
                        onClick={() => void handleToggleArchived(piece)}
                      >
                        {piece.status === "archived" ? "Restore" : "Archive"}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
