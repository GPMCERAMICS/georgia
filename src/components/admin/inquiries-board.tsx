"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { api } from "@convex/_generated/api";
import type { Doc } from "@convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { NativeSelect } from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { inquiryStatusMeta, longDate } from "@/lib/admin";
import { cn } from "@/lib/utils";
import { PageHeader } from "./admin-shell";

type Status = Doc<"inquiries">["status"];
type Inquiry = Doc<"inquiries"> & { pieceTitle: string | null; pieceSlug: string | null };

const STATUSES: Status[] = ["new", "replied", "quoted", "inProgress", "done", "declined"];
const OPEN: Status[] = ["new", "replied", "quoted", "inProgress"];

function InquiryCard({ inquiry }: { inquiry: Inquiry }) {
  const setStatus = useMutation(api.admin.inquiries.setStatus);
  const updateNotes = useMutation(api.admin.inquiries.updateNotes);
  const remove = useMutation(api.admin.inquiries.remove);
  const [notes, setNotes] = useState(inquiry.notes);
  const [dirty, setDirty] = useState(false);
  const meta = inquiryStatusMeta[inquiry.status];

  return (
    <article className="rounded-2xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-display text-xl">{inquiry.name}</h2>
            <Badge variant={meta.variant}>{meta.label}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            <a href={`mailto:${inquiry.email}`} className="underline">
              {inquiry.email}
            </a>
            {" · "}
            {longDate(inquiry._creationTime)}
          </p>
        </div>
        <NativeSelect
          className="w-40"
          value={inquiry.status}
          onChange={async (e) => {
            try {
              await setStatus({ id: inquiry._id, status: e.target.value as Status });
            } catch {
              toast.error("Could not update status");
            }
          }}
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {inquiryStatusMeta[s].label}
            </option>
          ))}
        </NativeSelect>
      </div>

      <dl className="mt-4 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-[auto_1fr]">
        {inquiry.type && (
          <>
            <dt className="text-muted-foreground">Type</dt>
            <dd>{inquiry.type}</dd>
          </>
        )}
        {inquiry.budget && (
          <>
            <dt className="text-muted-foreground">Budget</dt>
            <dd>{inquiry.budget}</dd>
          </>
        )}
        {inquiry.pieceTitle && (
          <>
            <dt className="text-muted-foreground">About</dt>
            <dd>
              <Link href={`/admin/pieces/${inquiry.pieceId}`} className="underline">
                {inquiry.pieceTitle}
              </Link>
            </dd>
          </>
        )}
      </dl>
      <p className="mt-4 whitespace-pre-wrap text-sm">{inquiry.message}</p>

      <div className="mt-4 border-t border-border pt-4">
        <Textarea
          rows={2}
          placeholder="Your notes: quote given, materials, dates…"
          value={notes}
          onChange={(e) => {
            setNotes(e.target.value);
            setDirty(true);
          }}
        />
        <div className="mt-2 flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            className="rounded-full"
            disabled={!dirty}
            onClick={async () => {
              try {
                await updateNotes({ id: inquiry._id, notes });
                setDirty(false);
                toast.success("Notes saved");
              } catch {
                toast.error("Could not save notes");
              }
            }}
          >
            Save notes
          </Button>
          <Button asChild size="sm" variant="outline" className="rounded-full">
            <a href={`mailto:${inquiry.email}?subject=${encodeURIComponent("Your commission inquiry")}`}>Reply by email</a>
          </Button>
          <ConfirmDialog
            trigger={<Button size="sm" variant="ghost" className="rounded-full text-destructive" />}
            title="Delete this inquiry?"
            description="It is gone from the dashboard. The email notification you received is unaffected."
            confirmLabel="Delete"
            onConfirm={async () => {
              try {
                await remove({ id: inquiry._id });
              } catch {
                toast.error("Could not delete");
              }
            }}
          >
            Delete
          </ConfirmDialog>
        </div>
      </div>
    </article>
  );
}

export function InquiriesBoard() {
  const inquiries = useQuery(api.admin.inquiries.list);
  const [filter, setFilter] = useState<"open" | "all" | Status>("open");

  const visible = inquiries?.filter((inquiry) =>
    filter === "all" ? true : filter === "open" ? OPEN.includes(inquiry.status) : inquiry.status === filter,
  );

  const filters: { value: typeof filter; label: string }[] = [
    { value: "open", label: "Open" },
    { value: "new", label: "New" },
    { value: "inProgress", label: "In progress" },
    { value: "done", label: "Done" },
    { value: "all", label: "All" },
  ];

  return (
    <div>
      <PageHeader
        title="Inquiries"
        description="Commission requests from the site. Move each one along as you talk to the customer."
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {filters.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setFilter(f.value)}
            className={cn(
              "rounded-full border px-3.5 py-1 text-sm transition-colors",
              f.value === filter
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {visible === undefined ? (
        <Skeleton className="h-40 w-full rounded-2xl" />
      ) : visible.length === 0 ? (
        <p className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          Nothing here.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {visible.map((inquiry) => (
            <InquiryCard key={inquiry._id} inquiry={inquiry} />
          ))}
        </div>
      )}
    </div>
  );
}
