"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { ArrowRight } from "lucide-react";
import { api } from "@convex/_generated/api";
import { useCatalogNow } from "@/components/shop/use-catalog-now";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { money, orderStatusMeta, shortDate, startOfMonth } from "@/lib/admin";
import { PageHeader } from "./admin-shell";

function Stat({
  label,
  value,
  hint,
  href,
}: {
  label: string;
  value: string | number | undefined;
  hint?: string;
  href?: string;
}) {
  const body = (
    <div className="rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary/40">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      {value === undefined ? (
        <Skeleton className="mt-3 h-8 w-24" />
      ) : (
        <p className="mt-2 font-display text-3xl">{value}</p>
      )}
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

export function Overview() {
  const now = useCatalogNow();
  const stats = useQuery(
    api.admin.dashboard.stats,
    now === null ? "skip" : { now, monthStart: startOfMonth(now) },
  );

  const monthLabel =
    now === null
      ? "This month"
      : `${new Intl.DateTimeFormat("en-US", { month: "long" }).format(now)} revenue`;

  return (
    <div>
      <PageHeader
        title="Overview"
        description="What needs your attention today."
        actions={
          <Button asChild className="rounded-full">
            <Link href="/admin/pieces/new">New piece</Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label={monthLabel}
          value={stats && money(stats.revenueMonthCents)}
          hint={stats ? `${stats.ordersMonth} order${stats.ordersMonth === 1 ? "" : "s"}` : undefined}
          href="/admin/orders"
        />
        <Stat
          label="To ship"
          value={stats?.toShip}
          hint="Paid, not yet posted"
          href="/admin/orders?status=paid"
        />
        <Stat
          label="Available to buy"
          value={stats?.available}
          hint={stats ? `${stats.published} live, ${stats.drafts} in draft` : undefined}
          href="/admin/pieces"
        />
        <Stat
          label="New inquiries"
          value={stats?.newInquiries}
          hint="Commission requests waiting"
          href="/admin/inquiries"
        />
      </div>

      <section className="mt-10">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-2xl">Recent orders</h2>
          <Link href="/admin/orders" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            All orders <ArrowRight className="size-3.5" />
          </Link>
        </div>
        <div className="rounded-2xl border border-border bg-card">
          {stats === undefined ? (
            <div className="space-y-3 p-5">
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-3/4" />
            </div>
          ) : stats.recentOrders.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">
              No orders yet. Once the shop is live, paid orders land here.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.recentOrders.map((order) => (
                  <TableRow key={order._id}>
                    <TableCell>
                      <Link href={`/admin/orders/${order._id}`} className="font-medium hover:underline">
                        {order.orderNumber}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{order.name ?? order.email ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {order.paidAt ? shortDate(order.paidAt) : "—"}
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
      </section>
    </div>
  );
}
