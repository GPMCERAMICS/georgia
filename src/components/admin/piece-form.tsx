"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { api } from "@convex/_generated/api";
import type { AdminPiece } from "@convex/admin/pieces";
import type { Id } from "@convex/_generated/dataModel";
import { PhotoUpload } from "@/components/admin/photo-upload";
import { useCatalogNow } from "@/components/shop/use-catalog-now";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { pieceStatusMeta } from "@/lib/admin";
import { slugify } from "@/lib/slug";

type Mode = AdminPiece["mode"];
type ShippingTier = AdminPiece["shippingTier"];

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message
    ? error.message.replace(/^.*Uncaught Error: /, "").split("\n")[0]
    : fallback;
}

/**
 * Create and edit share one form. Given an `id` the piece is loaded first so
 * the inner form mounts once with settled initial state.
 */
export function PieceForm({ id }: { id?: string }) {
  const now = useCatalogNow();
  const piece = useQuery(
    api.admin.pieces.get,
    id && now !== null ? { id: id as Id<"pieces">, now } : "skip",
  );
  const tags = useQuery(api.admin.tags.list);

  if (tags === undefined || (id && piece === undefined)) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full max-w-2xl" />
      </div>
    );
  }
  if (id && piece === null) {
    return <p className="text-muted-foreground">Piece not found.</p>;
  }
  return <PieceFormFields piece={piece ?? undefined} allTags={tags} />;
}

function Field({ label, htmlFor, hint, children }: { label: string; htmlFor?: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function num(value: string): number | null {
  if (value.trim() === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function PieceFormFields({
  piece,
  allTags,
}: {
  piece?: AdminPiece;
  allTags: { _id: Id<"tags">; slug: string; name: string }[];
}) {
  const router = useRouter();
  const create = useMutation(api.admin.pieces.create);
  const update = useMutation(api.admin.pieces.update);
  const setStatus = useMutation(api.admin.pieces.setStatus);
  const markSold = useMutation(api.admin.pieces.markSold);
  const markAvailable = useMutation(api.admin.pieces.markAvailable);
  const remove = useMutation(api.admin.pieces.remove);

  const [title, setTitle] = useState(piece?.title ?? "");
  const [slug, setSlug] = useState(piece?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(piece));
  const [description, setDescription] = useState(piece?.description ?? "");
  const [tags, setTags] = useState<string[]>(piece?.tags ?? []);
  const [mode, setMode] = useState<Mode>(piece?.mode ?? "oneoff");
  const [price, setPrice] = useState(piece ? (piece.priceCents / 100).toFixed(2) : "");
  const [stock, setStock] = useState(piece && piece.stock !== null ? String(piece.stock) : "1");
  const [leadTimeWeeks, setLeadTimeWeeks] = useState(
    piece?.leadTimeWeeks != null ? String(piece.leadTimeWeeks) : "",
  );
  const [size, setSize] = useState(piece?.size ?? "");
  const [width, setWidth] = useState(piece?.dimensions ? String(piece.dimensions.widthIn) : "");
  const [height, setHeight] = useState(piece?.dimensions ? String(piece.dimensions.heightIn) : "");
  const [depth, setDepth] = useState(piece?.dimensions ? String(piece.dimensions.depthIn) : "");
  const [weight, setWeight] = useState(piece?.weightOz != null ? String(piece.weightOz) : "");
  const [foodSafe, setFoodSafe] = useState(piece?.foodSafe ?? true);
  const [dishwasherSafe, setDishwasherSafe] = useState(piece?.dishwasherSafe ?? false);
  const [careNotes, setCareNotes] = useState(piece?.careNotes ?? "");
  const [shippingTier, setShippingTier] = useState<ShippingTier>(piece?.shippingTier ?? "plate");
  const [saving, setSaving] = useState(false);

  function toggleTag(slug: string) {
    setTags((current) =>
      current.includes(slug) ? current.filter((s) => s !== slug) : [...current, slug],
    );
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);

    const w = num(width);
    const h = num(height);
    const d = num(depth);
    const fields = {
      title: title.trim(),
      slug: (slug.trim() || slugify(title)).trim(),
      description: description.trim(),
      size: size.trim() === "" ? null : size.trim(),
      tags,
      mode,
      priceCents: Math.round(Number(price) * 100),
      stock: mode === "madeToOrder" ? null : Math.max(0, Math.round(Number(stock || 0))),
      leadTimeWeeks: mode === "madeToOrder" ? num(leadTimeWeeks) : null,
      shippingTier,
      dimensions:
        w !== null && h !== null && d !== null ? { widthIn: w, heightIn: h, depthIn: d } : null,
      weightOz: num(weight),
      foodSafe,
      dishwasherSafe,
      careNotes: careNotes.trim() === "" ? null : careNotes.trim(),
    };

    try {
      if (piece) {
        await update({ id: piece._id, ...fields });
        toast.success("Saved");
      } else {
        const newId = await create(fields);
        toast.success("Created as a draft — add photos, then publish");
        router.push(`/admin/pieces/${newId}`);
      }
    } catch (error) {
      toast.error(errorMessage(error, "Could not save"));
    } finally {
      setSaving(false);
    }
  }

  async function act(label: string, fn: () => Promise<unknown>) {
    try {
      await fn();
      toast.success(label);
    } catch (error) {
      toast.error(errorMessage(error, "Something went wrong"));
    }
  }

  const sold = piece?.availability.state === "sold";

  return (
    <div>
      <Link
        href="/admin/pieces"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" /> Pieces
      </Link>
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-display text-3xl md:text-4xl">{piece ? piece.title : "New piece"}</h1>
            {piece && (
              <Badge variant={pieceStatusMeta[piece.status].variant}>
                {pieceStatusMeta[piece.status].label}
              </Badge>
            )}
            {sold && <Badge variant="destructive">Sold</Badge>}
          </div>
          {piece?.status === "published" && (
            <a
              href={`/shop/${piece.slug}`}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-block text-sm text-muted-foreground underline"
            >
              View on the site
            </a>
          )}
        </div>
        {piece && (
          <div className="flex flex-wrap gap-2">
            {piece.status !== "archived" && (
              <Button
                variant={piece.status === "published" ? "outline" : "default"}
                className="rounded-full"
                onClick={() =>
                  act(piece.status === "published" ? "Unpublished" : "Published", () =>
                    setStatus({
                      id: piece._id,
                      status: piece.status === "published" ? "draft" : "published",
                    }),
                  )
                }
              >
                {piece.status === "published" ? "Unpublish" : "Publish"}
              </Button>
            )}
            {sold ? (
              <Button
                variant="outline"
                className="rounded-full"
                onClick={() => act("Back on sale", () => markAvailable({ id: piece._id }))}
              >
                Mark available
              </Button>
            ) : (
              <ConfirmDialog
                trigger={<Button variant="outline" className="rounded-full" />}
                title="Mark this piece sold?"
                description="Use this when it sold in person. It stays on the site as a sold piece."
                confirmLabel="Mark sold"
                confirmVariant="default"
                onConfirm={() => act("Marked sold", () => markSold({ id: piece._id }))}
              >
                Mark sold
              </ConfirmDialog>
            )}
            <Button
              variant="outline"
              className="rounded-full"
              onClick={() =>
                act(piece.status === "archived" ? "Restored to draft" : "Archived", () =>
                  setStatus({
                    id: piece._id,
                    status: piece.status === "archived" ? "draft" : "archived",
                  }),
                )
              }
            >
              {piece.status === "archived" ? "Restore" : "Archive"}
            </Button>
            <ConfirmDialog
              trigger={<Button variant="ghost" className="rounded-full text-destructive" />}
              title="Delete this piece for good?"
              description="Photos are deleted too. Pieces with orders cannot be deleted — archive those instead."
              confirmLabel="Delete"
              onConfirm={() =>
                act("Deleted", async () => {
                  await remove({ id: piece._id });
                  router.push("/admin/pieces");
                })
              }
            >
              Delete
            </ConfirmDialog>
          </div>
        )}
      </div>

      <form className="grid gap-8 lg:grid-cols-[1fr_320px]" onSubmit={handleSubmit}>
        <div className="flex flex-col gap-8">
          <section className="grid gap-5 rounded-2xl border border-border bg-card p-5">
            <h2 className="font-display text-xl">Listing</h2>
            <Field label="Title" htmlFor="title">
              <Input
                id="title"
                value={title}
                required
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (!slugTouched) setSlug(slugify(e.target.value));
                }}
              />
            </Field>
            <Field label="URL" htmlFor="slug" hint={`gpmceramics.com/shop/${slug || "…"}`}>
              <Input
                id="slug"
                value={slug}
                required
                onChange={(e) => {
                  setSlug(e.target.value);
                  setSlugTouched(true);
                }}
              />
            </Field>
            <Field label="Description" htmlFor="description" hint="Blank line between paragraphs.">
              <Textarea
                id="description"
                rows={6}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </Field>
            <Field label="Tags" hint="Pick everything that fits. Featured tags become homepage sections.">
              {allTags.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No tags yet.{" "}
                  <Link href="/admin/tags" className="underline">
                    Create some
                  </Link>
                  .
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {allTags.map((tag) => {
                    const on = tags.includes(tag.slug);
                    return (
                      <button
                        key={tag._id}
                        type="button"
                        aria-pressed={on}
                        onClick={() => toggleTag(tag.slug)}
                        className={
                          on
                            ? "rounded-full border border-primary bg-primary px-3 py-1 text-sm text-primary-foreground"
                            : "rounded-full border border-border px-3 py-1 text-sm text-muted-foreground hover:text-foreground"
                        }
                      >
                        {tag.name}
                      </button>
                    );
                  })}
                </div>
              )}
            </Field>
          </section>

          <section className="grid gap-5 rounded-2xl border border-border bg-card p-5">
            <h2 className="font-display text-xl">Details</h2>
            <Field label="Size, in words" htmlFor="size" hint='Shown on the card, e.g. 14" platter'>
              <Input id="size" value={size} onChange={(e) => setSize(e.target.value)} />
            </Field>
            <Field label="Dimensions (inches)" hint="Width × height × depth. Optional, but carriers will want it later.">
              <div className="grid grid-cols-3 gap-2">
                <Input type="number" step="0.1" min="0" placeholder="W" value={width} onChange={(e) => setWidth(e.target.value)} aria-label="Width" />
                <Input type="number" step="0.1" min="0" placeholder="H" value={height} onChange={(e) => setHeight(e.target.value)} aria-label="Height" />
                <Input type="number" step="0.1" min="0" placeholder="D" value={depth} onChange={(e) => setDepth(e.target.value)} aria-label="Depth" />
              </div>
            </Field>
            <Field label="Weight (oz)" htmlFor="weight">
              <Input id="weight" type="number" step="1" min="0" value={weight} onChange={(e) => setWeight(e.target.value)} />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
                Food safe
                <Switch checked={foodSafe} onCheckedChange={setFoodSafe} />
              </label>
              <label className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
                Dishwasher safe
                <Switch checked={dishwasherSafe} onCheckedChange={setDishwasherSafe} />
              </label>
            </div>
            <Field label="Care notes" htmlFor="care">
              <Textarea id="care" rows={2} value={careNotes} onChange={(e) => setCareNotes(e.target.value)} />
            </Field>
          </section>

          {piece && (
            <section className="grid gap-4 rounded-2xl border border-border bg-card p-5">
              <h2 className="font-display text-xl">Photos</h2>
              <p className="-mt-3 text-sm text-muted-foreground">The first photo is the cover.</p>
              <PhotoUpload pieceId={piece._id} />
            </section>
          )}
        </div>

        <aside className="flex flex-col gap-6">
          <section className="grid gap-5 rounded-2xl border border-border bg-card p-5">
            <h2 className="font-display text-xl">Selling</h2>
            <Field label="How it sells" htmlFor="mode">
              <NativeSelect id="mode" value={mode} onChange={(e) => setMode(e.target.value as Mode)}>
                <option value="oneoff">One of a kind</option>
                <option value="madeToOrder">Made to order</option>
              </NativeSelect>
            </Field>
            <Field label="Price (USD)" htmlFor="price">
              <Input id="price" type="number" step="0.01" min="0" required value={price} onChange={(e) => setPrice(e.target.value)} />
            </Field>
            {mode === "oneoff" ? (
              <Field label="In stock" htmlFor="stock" hint="Usually 1. Set to 0 to show it as sold.">
                <Input id="stock" type="number" min="0" step="1" value={stock} onChange={(e) => setStock(e.target.value)} />
              </Field>
            ) : (
              <Field label="Lead time (weeks)" htmlFor="lead" hint="Shown to buyers as an estimate.">
                <Input id="lead" type="number" min="0" step="1" value={leadTimeWeeks} onChange={(e) => setLeadTimeWeeks(e.target.value)} />
              </Field>
            )}
            <Field label="Shipping size" htmlFor="tier" hint="Sets the flat rate from Settings.">
              <NativeSelect id="tier" value={shippingTier} onChange={(e) => setShippingTier(e.target.value as ShippingTier)}>
                <option value="plate">Plate (small box)</option>
                <option value="platter">Platter (large box)</option>
              </NativeSelect>
            </Field>
          </section>

          <div className="flex flex-col gap-2">
            <Button type="submit" disabled={saving} className="rounded-full">
              {saving ? "Saving…" : piece ? "Save changes" : "Create draft"}
            </Button>
            {!piece && (
              <p className="text-xs text-muted-foreground">
                Photos can be added once the piece exists. It stays private until you publish it.
              </p>
            )}
          </div>
        </aside>
      </form>
    </div>
  );
}
