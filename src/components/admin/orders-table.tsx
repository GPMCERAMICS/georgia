"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Doc } from "@convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { money, orderStatusMeta, shortDate } from "@/lib/admin";
import { cn } from "@/lib/utils";
import { PageHeader } from "./admin-shell";

type Status = Doc<"orders">["status"];

const FILTERS: { value: Status | null; label: string }[] = [
  { value: null, label: "All" },
  { value: "paid", label: "To ship" },
  { value: "shipped", label: "Shipped" },
  { value: "delivered", label: "Delivered" },
  { value: "refunded", label: "Refunded" },
  { value: "pending", label: "In checkout" },
];

function parseStatus(raw: string | null): Status | null {
  return FILTERS.find((f) => f.value === raw)?.value ?? null;
}

export function OrdersTable() {
  const router = useRouter();
  const params = useSearchParams();
  const status = parseStatus(params.get("status"));
  const orders = useQuery(api.admin.orders.list, { status });

  return (
    <div>
      <PageHeader title="Orders" description="Everything that has been paid for, and what to do next." />

      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((filter) => (
          <button
            key={filter.label}
            type="button"
            onClick={() =>
              router.replace(filter.value ? `/admin/orders?status=${filter.value}` : "/admin/orders")
            }
            className={cn(
              "rounded-full border px-3.5 py-1 text-sm transition-colors",
              filter.value === status
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            {filter.label}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-card">
        {orders === undefined ? (
          <div className="space-y-3 p-5">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-2/3" />
          </div>
        ) : orders.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">Nothing here yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Pieces</TableHead>
                <TableHead>Delivery</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => (
                <TableRow key={order._id}>
                  <TableCell>
                    <Link href={`/admin/orders/${order._id}`} className="font-medium hover:underline">
                      {order.orderNumber}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {shortDate(order.paidAt ?? order._creationTime)}
                  </TableCell>
                  <TableCell>
                    <span className="block">{order.name ?? "—"}</span>
                    <span className="block text-xs text-muted-foreground">{order.email ?? ""}</span>
                  </TableCell>
                  <TableCell className="max-w-[260px] truncate text-muted-foreground">
                    {order.items.map((item) => item.title).join(", ")}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {order.shippingMethod === "pickup" ? "Pickup" : "Ship"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={orderStatusMeta[order.status].variant}>
                      {orderStatusMeta[order.status].label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">{money(order.totalCents)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
