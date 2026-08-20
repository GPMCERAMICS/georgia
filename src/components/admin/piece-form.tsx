"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { api } from "@convex/_generated/api";
import type { Doc, Id } from "@convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PhotoUpload } from "@/components/admin/photo-upload";
import { slugify } from "@/lib/slug";

type Mode = Doc<"pieces">["mode"];
type Collection = Doc<"pieces">["collection"];
type ShippingTier = Doc<"pieces">["shippingTier"];

const MODE_LABELS: Record<Mode, string> = {
  oneoff: "One-off finished piece",
  madeToOrder: "Made to order",
  deposit: "Commission deposit",
  drop: "Small batch / drop",
};

/**
 * Format an epoch for a <input type="datetime-local">.
 *
 * Must use the LOCAL getters, not toISOString(): the input renders and parses
 * its value as local wall-clock time, so feeding it a UTC string shifts the
 * release by the UTC offset on every save — 2pm becomes 7pm, then midnight.
 * Parsing back is already correct, since a "YYYY-MM-DDTHH:mm" string with no
 * zone is defined to be local.
 */
function toDateTimeLocal(epochMs: number): string {
  const d = new Date(epochMs);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Stock semantics differ per mode; null means unlimited. */
function defaultStockFor(mode: Mode): number | null {
  if (mode === "oneoff") return 1;
  if (mode === "drop") return 6;
  return null; // madeToOrder and deposit are unlimited
}

/**
 * Handles both creating a new piece and editing an existing one.
 *
 * Given an `id`, it loads the piece itself from the same admin-only list
 * query the pieces table uses, rather than requiring each page to fetch it.
 * Loading and not-found are handled here, before any form state exists, so
 * the inner form component is only ever mounted once its `piece` prop (or
 * lack of one) is settled — that keeps the hook count each component renders
 * consistent across renders.
 */
export function PieceForm({ id }: { id?: string }) {
  const pieces = useQuery(api.admin.pieces.list, id ? {} : "skip");

  if (!id) {
    return <PieceFormFields />;
  }
  if (pieces === undefined) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }
  const piece = pieces.find((p) => p._id === (id as Id<"pieces">));
  if (!piece) {
    return <p className="text-sm text-muted-foreground">Piece not found.</p>;
  }
  return <PieceFormFields piece={piece} />;
}

function PieceFormFields({ piece }: { piece?: Doc<"pieces"> }) {
  const router = useRouter();
  const create = useMutation(api.admin.pieces.create);
  const update = useMutation(api.admin.pieces.update);

  const [title, setTitle] = useState(piece?.title ?? "");
  const [slug, setSlug] = useState(piece?.slug ?? "");
  // Once she's editing an existing piece, or has hand-edited the slug field,
  // further title edits should stop clobbering it.
  const [slugTouched, setSlugTouched] = useState(Boolean(piece));
  const [description, setDescription] = useState(piece?.description ?? "");
  const [size, setSize] = useState(piece?.size ?? "");
  const [collection, setCollection] = useState<Collection>(
    piece?.collection ?? "wildlife",
  );
  const [mode, setMode] = useState<Mode>(piece?.mode ?? "oneoff");
  const [price, setPrice] = useState(
    piece ? (piece.priceCents / 100).toFixed(2) : "",
  );
  const [stock, setStock] = useState(() => {
    if (piece) return piece.stock === null ? "" : String(piece.stock);
    const fallback = defaultStockFor("oneoff");
    return fallback === null ? "" : String(fallback);
  });
  const [releaseAt, setReleaseAt] = useState(
    piece?.releaseAt ? toDateTimeLocal(piece.releaseAt) : "",
  );
  const [leadTimeWeeks, setLeadTimeWeeks] = useState(
    piece?.leadTimeWeeks !== undefined && piece.leadTimeWeeks !== null
      ? String(piece.leadTimeWeeks)
      : "",
  );
  const [shippingTier, setShippingTier] = useState<ShippingTier>(
    piece?.shippingTier ?? "plate",
  );
  const [saving, setSaving] = useState(false);

  function changeMode(next: Mode) {
    setMode(next);
    const fallback = defaultStockFor(next);
    setStock(fallback === null ? "" : String(fallback));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);

    const fields = {
      title: title.trim(),
      slug: (slug.trim() || slugify(title)).trim(),
      description: description.trim(),
      size: size.trim() === "" ? null : size.trim(),
      collection,
      mode,
      priceCents: Math.round(Number(price) * 100),
      stock:
        mode === "madeToOrder" || mode === "deposit"
          ? null
          : Number(stock || 0),
      releaseAt:
        mode === "drop" && releaseAt !== ""
          ? new Date(releaseAt).getTime()
          : null,
      leadTimeWeeks:
        mode === "madeToOrder" && leadTimeWeeks !== ""
          ? Number(leadTimeWeeks)
          : null,
      shippingTier,
    };

    try {
      if (piece) {
        await update({ id: piece._id, ...fields });
        toast.success("Saved");
        router.push("/admin");
      } else {
        // Land on the new piece's own page rather than back at the list: the
        // photo uploader needs a pieceId, so this is the first moment she can
        // add photos, and bouncing to the list would make her hunt for the
        // piece she just made.
        const newId = await create(fields);
        toast.success("Piece created as a draft — add photos below");
        router.push(`/admin/pieces/${newId}`);
      }
    } catch (error) {
      // The mutation throws on a slug collision ("A piece with the slug ...
      // already exists") — surface that message rather than a generic one.
      toast.error(error instanceof Error ? error.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="flex max-w-xl flex-col gap-5" onSubmit={handleSubmit}>
      <div className="flex flex-col gap-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          value={title}
          required
          onChange={(event) => {
            setTitle(event.target.value);
            if (!slugTouched) setSlug(slugify(event.target.value));
          }}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="slug">URL slug</Label>
        <Input
          id="slug"
          value={slug}
          required
          onChange={(event) => {
            setSlug(event.target.value);
            setSlugTouched(true);
          }}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          rows={4}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="mode">Sale type</Label>
        <select
          id="mode"
          className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
          value={mode}
          onChange={(event) => changeMode(event.target.value as Mode)}
        >
          {Object.entries(MODE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="collection">Collection</Label>
        <select
          id="collection"
          className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
          value={collection}
          onChange={(event) =>
            setCollection(event.target.value as Collection)
          }
        >
          <option value="wildlife">Wildlife</option>
          <option value="heirloom">Heirloom</option>
          <option value="totems">Totems</option>
        </select>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="price">Price (USD)</Label>
        <Input
          id="price"
          type="number"
          step="0.01"
          min="0"
          required
          value={price}
          onChange={(event) => setPrice(event.target.value)}
        />
      </div>

      {(mode === "oneoff" || mode === "drop") && (
        <div className="flex flex-col gap-2">
          <Label htmlFor="stock">
            {mode === "oneoff" ? "Stock (one-offs are 1)" : "Batch size"}
          </Label>
          <Input
            id="stock"
            type="number"
            min="0"
            value={stock}
            onChange={(event) => setStock(event.target.value)}
          />
        </div>
      )}

      {mode === "drop" && (
        <div className="flex flex-col gap-2">
          <Label htmlFor="releaseAt">Release date and time</Label>
          <Input
            id="releaseAt"
            type="datetime-local"
            value={releaseAt}
            onChange={(event) => setReleaseAt(event.target.value)}
          />
        </div>
      )}

      {mode === "madeToOrder" && (
        <div className="flex flex-col gap-2">
          <Label htmlFor="leadTimeWeeks">Lead time (weeks)</Label>
          <Input
            id="leadTimeWeeks"
            type="number"
            min="0"
            value={leadTimeWeeks}
            onChange={(event) => setLeadTimeWeeks(event.target.value)}
          />
        </div>
      )}

      <div className="flex flex-col gap-2">
        <Label htmlFor="size">Size</Label>
        <Input
          id="size"
          placeholder='e.g. 14" platter'
          value={size ?? ""}
          onChange={(event) => setSize(event.target.value)}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="shippingTier">Shipping tier</Label>
        <select
          id="shippingTier"
          className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
          value={shippingTier}
          onChange={(event) =>
            setShippingTier(event.target.value as ShippingTier)
          }
        >
          <option value="plate">Plate</option>
          <option value="platter">Platter (larger)</option>
        </select>
      </div>

      {piece && (
        <div className="flex flex-col gap-2">
          <Label>Photos</Label>
          <PhotoUpload pieceId={piece._id} />
        </div>
      )}

      <div className="flex gap-3">
        <Button type="submit" disabled={saving} className="rounded-full">
          {saving ? "Saving…" : piece ? "Save changes" : "Create piece"}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="rounded-full"
          onClick={() => router.push("/admin")}
        >
          Cancel
        </Button>
      </div>

      {!piece && (
        <p className="text-xs text-muted-foreground">
          Photos can be added on the next screen, once the piece is created.
        </p>
      )}
    </form>
  );
}
