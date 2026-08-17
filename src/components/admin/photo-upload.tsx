"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Button } from "@/components/ui/button";

export function PhotoUpload({ pieceId }: { pieceId: Id<"pieces"> }) {
  // Queried here rather than passed in: the component needs storage ids, not
  // just URLs, to be able to remove a photo — and subscribing directly means
  // the strip updates the moment an upload lands.
  const images = useQuery(api.admin.uploads.listImages, { pieceId });
  const generateUploadUrl = useMutation(api.admin.uploads.generateUploadUrl);
  const attachImage = useMutation(api.admin.uploads.attachImage);
  const removeImage = useMutation(api.admin.uploads.removeImage);
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File) {
    setUploading(true);
    try {
      const uploadUrl = await generateUploadUrl();
      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!response.ok) throw new Error("Upload failed");
      const { storageId } = (await response.json()) as {
        storageId: Id<"_storage">;
      };
      await attachImage({ pieceId, storageId });
    } catch (err) {
      toast.error(
        err instanceof Error && err.message
          ? err.message
          : "Could not upload that photo. Try again.",
      );
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleRemove(storageId: Id<"_storage">) {
    try {
      await removeImage({ pieceId, storageId });
    } catch {
      toast.error("Could not remove that photo. Try again.");
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-3">
        {images?.map((image) => (
          <div
            key={image.storageId}
            className="group relative h-24 w-24 overflow-hidden rounded-lg border border-border"
          >
            <Image
              src={image.url}
              alt=""
              fill
              sizes="96px"
              className="object-cover"
            />
            <button
              type="button"
              aria-label="Remove photo"
              onClick={() => void handleRemove(image.storageId)}
              className="absolute top-1 right-1 rounded-full bg-background/90 px-2 text-sm leading-6 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />
      <Button
        type="button"
        variant="outline"
        className="w-fit rounded-full"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? "Uploading…" : "Add photo"}
      </Button>
    </div>
  );
}
