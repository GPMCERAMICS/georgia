"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { useMutation, useQuery } from "convex/react";
import { ImagePlus } from "lucide-react";
import { toast } from "sonner";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";

/** A photo uploaded to storage but not yet attached to a piece. */
export type StagedPhoto = { storageId: Id<"_storage">; previewUrl: string };

/** Formats the storefront can display. Phone HEIC photos are not among them. */
const ACCEPTED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
  "image/svg+xml",
];

/** Uploads one file to Convex storage and returns its id. */
function useUploadFile() {
  const generateUploadUrl = useMutation(api.admin.uploads.generateUploadUrl);
  return async (file: File): Promise<Id<"_storage">> => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      throw new Error(`${file.name} can't be used. Upload a JPG, PNG or WebP photo.`);
    }
    const uploadUrl = await generateUploadUrl();
    const response = await fetch(uploadUrl, {
      method: "POST",
      headers: { "Content-Type": file.type },
      body: file,
    });
    if (!response.ok) throw new Error("Upload failed");
    const { storageId } = (await response.json()) as { storageId: Id<"_storage"> };
    return storageId;
  };
}

/** The thumbnail strip and the "Add photos" tile both modes share. */
function PhotoStrip({
  photos,
  uploading,
  onFiles,
  onRemove,
}: {
  photos: { key: string; url: string }[];
  uploading: boolean;
  onFiles: (files: File[]) => void;
  onRemove: (key: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
      {photos.map((photo, i) => (
        <div key={photo.key} className="group relative aspect-square overflow-hidden border border-border bg-muted">
          <Image src={photo.url} alt="" fill sizes="160px" unoptimized className="object-cover" />
          {i === 0 && (
            <span className="chip absolute bottom-1.5 left-1.5 bg-background/90 px-2 py-0.5 text-xs">
              Cover
            </span>
          )}
          <button
            type="button"
            aria-label="Remove photo"
            onClick={() => onRemove(photo.key)}
            className="chip absolute right-1.5 top-1.5 flex size-7 items-center justify-center bg-background/90 text-base leading-none"
          >
            ×
          </button>
        </div>
      ))}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(",")}
        multiple
        className="hidden"
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          if (files.length > 0) onFiles(files);
          event.target.value = "";
        }}
      />
      <button
        type="button"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
        className="flex aspect-square flex-col items-center justify-center gap-2 border border-dashed border-border text-sm text-muted-foreground transition-colors hover:border-foreground hover:text-foreground disabled:opacity-60"
      >
        <ImagePlus className="size-6" />
        {uploading ? "Uploading…" : "Add photos"}
      </button>
    </div>
  );
}

/** Photos of a piece that already exists: changes save immediately. */
export function PhotoUpload({ pieceId }: { pieceId: Id<"pieces"> }) {
  // Queried here rather than passed in: the component needs storage ids, not
  // just URLs, to be able to remove a photo — and subscribing directly means
  // the strip updates the moment an upload lands.
  const images = useQuery(api.admin.uploads.listImages, { pieceId });
  const attachImage = useMutation(api.admin.uploads.attachImage);
  const removeImage = useMutation(api.admin.uploads.removeImage);
  const uploadFile = useUploadFile();
  const [uploading, setUploading] = useState(false);

  async function handleFiles(files: File[]) {
    setUploading(true);
    try {
      for (const file of files) {
        const storageId = await uploadFile(file);
        await attachImage({ pieceId, storageId });
      }
    } catch (err) {
      toast.error(
        err instanceof Error && err.message ? err.message : "Could not upload that photo. Try again.",
      );
    } finally {
      setUploading(false);
    }
  }

  async function handleRemove(storageId: string) {
    try {
      await removeImage({ pieceId, storageId: storageId as Id<"_storage"> });
    } catch {
      toast.error("Could not remove that photo. Try again.");
    }
  }

  return (
    <PhotoStrip
      photos={(images ?? []).map((image) => ({ key: image.storageId, url: image.url }))}
      uploading={uploading}
      onFiles={(files) => void handleFiles(files)}
      onRemove={(key) => void handleRemove(key)}
    />
  );
}

/**
 * Photos for a piece that has not been created yet. Files upload to storage
 * as they are picked; the form sends their ids along when it creates the piece.
 */
export function PhotoPicker({
  photos,
  onChange,
}: {
  photos: StagedPhoto[];
  onChange: (update: (current: StagedPhoto[]) => StagedPhoto[]) => void;
}) {
  const uploadFile = useUploadFile();
  const [uploading, setUploading] = useState(false);

  async function handleFiles(files: File[]) {
    setUploading(true);
    try {
      for (const file of files) {
        const storageId = await uploadFile(file);
        const previewUrl = URL.createObjectURL(file);
        onChange((current) => [...current, { storageId, previewUrl }]);
      }
    } catch (err) {
      toast.error(
        err instanceof Error && err.message ? err.message : "Could not upload that photo. Try again.",
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <PhotoStrip
      photos={photos.map((photo) => ({ key: photo.storageId, url: photo.previewUrl }))}
      uploading={uploading}
      onFiles={(files) => void handleFiles(files)}
      onRemove={(key) => onChange((current) => current.filter((photo) => photo.storageId !== key))}
    />
  );
}
