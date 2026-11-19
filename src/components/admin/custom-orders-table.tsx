"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { api } from "@convex/_generated/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { customOrderStatusFor, money, shortDate } from "@/lib/admin";
import { PageHeader } from "./admin-shell";

/** Every custom order, newest first, with a button to start another. */
export function CustomOrdersTable() {
  const router = useRouter();
  const orders = useQuery(api.admin.customOrders.list);
  const create = useMutation(api.admin.customOrders.create);
  const [creating, setCreating] = useState(false);

  async function handleNew() {
    setCreating(true);
    try {
      const id = await create({});
      router.push(`/admin/custom/${id}`);
    } catch {
      toast.error("Could not start a custom order. Try again.");
      setCreating(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Custom orders"
        description="Commissions and one-off work: a quote, a deposit, then the balance and shipping."
        actions={
          <Button onClick={() => void handleNew()} disabled={creating}>
            {creating ? "Starting…" : "New custom order"}
          </Button>
        }
      />
      <div className="border border-border bg-card">
        {orders === undefined ? (
          <div className="space-y-3 p-5">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-2/3" />
          </div>
        ) : orders.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">
            No custom orders yet. Start one here, or from an inquiry.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Started</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Paid</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => (
                <TableRow key={order._id}>
                  <TableCell>
                    <Link href={`/admin/custom/${order._id}`} className="font-medium hover:underline">
                      {order.number}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {shortDate(order._creationTime)}
                  </TableCell>
                  <TableCell>
                    <span className="block">{order.name || "—"}</span>
                    <span className="block text-xs text-muted-foreground">{order.email}</span>
                  </TableCell>
                  <TableCell className="max-w-[240px] truncate text-muted-foreground">
                    {order.title || "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={customOrderStatusFor(order).variant}>
                      {customOrderStatusFor(order).label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {money(order.totals.paidCents)}
                  </TableCell>
                  <TableCell className="text-right">{money(order.totals.totalCents)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
