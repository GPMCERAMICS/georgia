"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { ArrowDown, ArrowUp, Search } from "lucide-react";
import { toast } from "sonner";
import { api } from "@convex/_generated/api";
import type { AdminPiece } from "@convex/admin/pieces";
import type { Doc } from "@convex/_generated/dataModel";
import { PlaceholderVessel } from "@/components/site/placeholder-vessel";
import { useCatalogNow } from "@/components/shop/use-catalog-now";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { modeLabel, money, pieceStatusMeta } from "@/lib/admin";
import { placeholderShape } from "@/lib/shop";
import { cn } from "@/lib/utils";
import { PageHeader } from "./admin-shell";

type StatusFilter = "all" | Doc<"pieces">["status"];

function AvailabilityBadge({ piece }: { piece: AdminPiece }) {
  if (piece.status !== "published") return null;
  const a = piece.availability;
  if (a.state === "sold") return <Badge variant="destructive">Sold</Badge>;
  if (a.state === "held") return <Badge variant="warning">In checkout</Badge>;
  if (a.state === "available") {
    return (
      <Badge variant="success">
        {a.remaining === null ? "Open" : a.remaining === 1 ? "Available" : `${a.remaining} left`}
      </Badge>
    );
  }
  return null;
}

export function PiecesTable() {
  const now = useCatalogNow();
  const pieces = useQuery(api.admin.pieces.list, now === null ? "skip" : { now });
  const tags = useQuery(api.admin.tags.list);
  const setStatus = useMutation(api.admin.pieces.setStatus);
  const reorder = useMutation(api.admin.pieces.reorder);

  const [search, setSearch] = useState("");
  const [status, setStatus_] = useState<StatusFilter>("all");
  const [tag, setTag] = useState("all");

  const tagName = useMemo(() => new Map((tags ?? []).map((t) => [t.slug, t.name])), [tags]);

  const visible = useMemo(() => {
    if (!pieces) return undefined;
    const q = search.trim().toLowerCase();
    return pieces.filter(
      (piece) =>
        (status === "all" || piece.status === status) &&
        (tag === "all" || piece.tags.includes(tag)) &&
        (q === "" || piece.title.toLowerCase().includes(q) || piece.slug.includes(q)),
    );
  }, [pieces, search, status, tag]);

  async function toggle(piece: AdminPiece) {
    try {
      await setStatus({
        id: piece._id,
        status: piece.status === "published" ? "draft" : "published",
      });
    } catch {
      toast.error("Could not update that piece. Try again.");
    }
  }

  async function move(piece: AdminPiece, direction: -1 | 1) {
    if (!pieces) return;
    const ids = pieces.map((p) => p._id);
    const index = ids.indexOf(piece._id);
    const target = index + direction;
    if (target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    try {
      await reorder({ orderedIds: ids });
    } catch {
      toast.error("Could not reorder. Try again.");
    }
  }

  const unfiltered = search === "" && status === "all" && tag === "all";

  return (
    <div>
      <PageHeader
        title="Pieces"
        description="Everything in the catalog. Drafts are private until you publish them."
        actions={
          <Button asChild className="rounded-full">
            <Link href="/admin/pieces/new">New piece</Link>
          </Button>
        }
      />

      <div className="mb-4 grid gap-2 sm:grid-cols-[1fr_160px_180px]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search by title"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <NativeSelect value={status} onChange={(e) => setStatus_(e.target.value as StatusFilter)}>
          <option value="all">All statuses</option>
          <option value="published">Live</option>
          <option value="draft">Draft</option>
          <option value="archived">Archived</option>
        </NativeSelect>
        <NativeSelect value={tag} onChange={(e) => setTag(e.target.value)}>
          <option value="all">All tags</option>
          {(tags ?? []).map((t) => (
            <option key={t._id} value={t.slug}>
              {t.name}
            </option>
          ))}
        </NativeSelect>
      </div>

      <div className="rounded-2xl border border-border bg-card">
        {visible === undefined ? (
          <div className="space-y-3 p-5">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-2/3" />
          </div>
        ) : visible.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            {pieces && pieces.length === 0 ? (
              <>
                No pieces yet.{" "}
                <Link href="/admin/pieces/new" className="underline">
                  Add your first one.
                </Link>
              </>
            ) : (
              "Nothing matches those filters."
            )}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-14" />
                <TableHead>Piece</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((piece, index) => (
                <TableRow key={piece._id} className={cn(piece.status === "archived" && "opacity-60")}>
                  <TableCell>
                    <div className="relative size-10 overflow-hidden rounded-md border border-border bg-muted">
                      {piece.thumbnailUrl ? (
                        <Image src={piece.thumbnailUrl} alt="" fill sizes="40px" className="object-cover" />
                      ) : (
                        <PlaceholderVessel shape={placeholderShape(piece.slug)} label="" className="h-full w-full" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Link href={`/admin/pieces/${piece._id}`} className="font-display text-base hover:underline">
                      {piece.title}
                    </Link>
                    {piece.size && <span className="block text-xs text-muted-foreground">{piece.size}</span>}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {piece.tags.map((slug) => (
                        <Badge key={slug} variant="outline">
                          {tagName.get(slug) ?? slug}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{modeLabel[piece.mode]}</TableCell>
                  <TableCell className="text-right">{money(piece.priceCents)}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      <Badge variant={pieceStatusMeta[piece.status].variant}>
                        {pieceStatusMeta[piece.status].label}
                      </Badge>
                      <AvailabilityBadge piece={piece} />
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      {unfiltered && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            aria-label="Move up"
                            disabled={index === 0}
                            onClick={() => void move(piece, -1)}
                          >
                            <ArrowUp />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            aria-label="Move down"
                            disabled={index === visible.length - 1}
                            onClick={() => void move(piece, 1)}
                          >
                            <ArrowDown />
                          </Button>
                        </>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-full"
                        disabled={piece.status === "archived"}
                        onClick={() => void toggle(piece)}
                      >
                        {piece.status === "published" ? "Unpublish" : "Publish"}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
