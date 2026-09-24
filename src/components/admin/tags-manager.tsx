"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { toast } from "sonner";
import { api } from "@convex/_generated/api";
import type { Doc } from "@convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { slugify } from "@/lib/slug";
import { PageHeader } from "./admin-shell";

type Tag = Doc<"tags"> & { pieceCount: number };

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message
    ? error.message.replace(/^.*Uncaught Error: /, "").split("\n")[0]
    : fallback;
}

function TagRow({
  tag,
  index,
  count,
  onMove,
}: {
  tag: Tag;
  index: number;
  count: number;
  onMove: (direction: -1 | 1) => void;
}) {
  const update = useMutation(api.admin.tags.update);
  const remove = useMutation(api.admin.tags.remove);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(tag.name);
  const [slug, setSlug] = useState(tag.slug);
  const [description, setDescription] = useState(tag.description);

  async function save() {
    try {
      await update({ id: tag._id, name: name.trim(), slug: slug.trim(), description: description.trim() });
      setEditing(false);
      toast.success("Saved");
    } catch (error) {
      toast.error(errorMessage(error, "Could not save"));
    }
  }

  async function flag(field: "featured" | "visible", value: boolean) {
    try {
      await update({ id: tag._id, [field]: value });
    } catch (error) {
      toast.error(errorMessage(error, "Could not update"));
    }
  }

  return (
    <li className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start">
      <div className="flex shrink-0 gap-1 sm:flex-col">
        <Button variant="ghost" size="icon" className="size-8" aria-label="Move up" disabled={index === 0} onClick={() => onMove(-1)}>
          <ArrowUp />
        </Button>
        <Button variant="ghost" size="icon" className="size-8" aria-label="Move down" disabled={index === count - 1} onClick={() => onMove(1)}>
          <ArrowDown />
        </Button>
      </div>

      <div className="min-w-0 flex-1">
        {editing ? (
          <div className="grid gap-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor={`name-${tag._id}`}>Name</Label>
                <Input id={`name-${tag._id}`} value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor={`slug-${tag._id}`}>Slug</Label>
                <Input id={`slug-${tag._id}`} value={slug} onChange={(e) => setSlug(e.target.value)} />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor={`desc-${tag._id}`}>Description</Label>
              <Textarea id={`desc-${tag._id}`} rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <Button size="sm" className="rounded-full" onClick={() => void save()}>
                Save
              </Button>
              <Button size="sm" variant="outline" className="rounded-full" onClick={() => setEditing(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-display text-lg">{tag.name}</span>
              <span className="text-xs text-muted-foreground">/shop?tag={tag.slug}</span>
              <Badge variant="muted">
                {tag.pieceCount} piece{tag.pieceCount === 1 ? "" : "s"}
              </Badge>
            </div>
            {tag.description && <p className="mt-1 text-sm text-muted-foreground">{tag.description}</p>}
            <div className="mt-2 flex gap-3">
              <button type="button" className="text-sm underline" onClick={() => setEditing(true)}>
                Edit
              </button>
              <ConfirmDialog
                trigger={<button type="button" className="text-sm text-destructive underline" />}
                title={`Delete "${tag.name}"?`}
                description="The tag is removed from every piece that carries it. The pieces themselves are untouched."
                confirmLabel="Delete tag"
                onConfirm={async () => {
                  try {
                    await remove({ id: tag._id });
                    toast.success("Deleted");
                  } catch (error) {
                    toast.error(errorMessage(error, "Could not delete"));
                  }
                }}
              >
                Delete
              </ConfirmDialog>
            </div>
          </>
        )}
      </div>

      <div className="flex shrink-0 gap-4 sm:flex-col sm:gap-2">
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={tag.featured} onCheckedChange={(v) => void flag("featured", v)} />
          Homepage
        </label>
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={tag.visible} onCheckedChange={(v) => void flag("visible", v)} />
          Visible
        </label>
      </div>
    </li>
  );
}

export function TagsManager() {
  const tags = useQuery(api.admin.tags.list);
  const create = useMutation(api.admin.tags.create);
  const reorder = useMutation(api.admin.tags.reorder);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);

  async function move(index: number, direction: -1 | 1) {
    if (!tags) return;
    const ids = tags.map((t) => t._id);
    const target = index + direction;
    if (target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    try {
      await reorder({ orderedIds: ids });
    } catch {
      toast.error("Could not reorder");
    }
  }

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    try {
      await create({
        name: name.trim(),
        slug: slugify(name),
        description: "",
        featured: false,
        visible: true,
      });
      setName("");
      toast.success("Tag added");
    } catch (error) {
      toast.error(errorMessage(error, "Could not add that tag"));
    } finally {
      setCreating(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Tags"
        description="How the shop is sorted. A piece can carry several. Featured tags get a section on the homepage."
      />

      <form onSubmit={handleCreate} className="mb-6 flex max-w-md gap-2">
        <Input
          placeholder="New tag, e.g. Mugs"
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-label="New tag name"
        />
        <Button type="submit" className="rounded-full" disabled={creating || !name.trim()}>
          Add
        </Button>
      </form>

      <div className="rounded-2xl border border-border bg-card">
        {tags === undefined ? (
          <div className="space-y-3 p-5">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-2/3" />
          </div>
        ) : tags.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">No tags yet. Add one above.</p>
        ) : (
          <ul className="divide-y divide-border">
            {tags.map((tag, index) => (
              <TagRow key={tag._id} tag={tag} index={index} count={tags.length} onMove={(d) => void move(index, d)} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
