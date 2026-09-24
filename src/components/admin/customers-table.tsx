"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { money, shortDate } from "@/lib/admin";
import { PageHeader } from "./admin-shell";

export function CustomersTable() {
  const customers = useQuery(api.admin.customers.list);

  return (
    <div>
      <PageHeader
        title="Customers"
        description="Everyone who has bought something, grouped by email."
      />
      <div className="rounded-2xl border border-border bg-card">
        {customers === undefined ? (
          <div className="space-y-3 p-5">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-2/3" />
          </div>
        ) : customers.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">No customers yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>City</TableHead>
                <TableHead>Orders</TableHead>
                <TableHead>Last order</TableHead>
                <TableHead className="text-right">Lifetime</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((customer) => (
                <TableRow key={customer.email}>
                  <TableCell>
                    <span className="block">{customer.name ?? "—"}</span>
                    <a href={`mailto:${customer.email}`} className="block text-xs text-muted-foreground underline">
                      {customer.email}
                    </a>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{customer.city ?? "—"}</TableCell>
                  <TableCell>
                    <Link href="/admin/orders" className="underline">
                      {customer.orderCount}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{shortDate(customer.lastOrderAt)}</TableCell>
                  <TableCell className="text-right">{money(customer.totalCents)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
