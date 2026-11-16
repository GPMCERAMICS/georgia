"use client";

import { useQuery } from "convex/react";
import { toast } from "sonner";
import { api } from "@convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { shortDate } from "@/lib/admin";
import { PageHeader } from "./admin-shell";

const SOURCES: Record<string, string> = {
  footer: "Site sign-up",
  checkout: "Ticked at checkout",
};

/** Everyone on the newsletter list, with a way to copy the addresses out. */
export function SubscribersTable() {
  const subscribers = useQuery(api.admin.subscribers.list);

  async function copyAll() {
    if (!subscribers) return;
    try {
      await navigator.clipboard.writeText(subscribers.map((s) => s.email).join(", "));
      toast.success(`Copied ${subscribers.length} address${subscribers.length === 1 ? "" : "es"}`);
    } catch {
      toast.error("Could not copy. Select the addresses and copy them by hand.");
    }
  }

  return (
    <div>
      <PageHeader
        title="Newsletter"
        description="People who asked to hear from the shop. Anyone who unsubscribes drops off this list."
      />
      {subscribers && subscribers.length > 0 && (
        <Button variant="outline" className="mb-4" onClick={() => void copyAll()}>
          Copy all addresses
        </Button>
      )}
      <div className="border border-border bg-card">
        {subscribers === undefined ? (
          <div className="space-y-3 p-5">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-2/3" />
          </div>
        ) : subscribers.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">No subscribers yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Joined from</TableHead>
                <TableHead className="text-right">Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subscribers.map((subscriber) => (
                <TableRow key={subscriber._id}>
                  <TableCell>{subscriber.email}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {SOURCES[subscriber.source ?? ""] ?? subscriber.source ?? "—"}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {shortDate(subscriber.subscribedAt)}
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
