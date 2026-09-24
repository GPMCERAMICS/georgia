import { Suspense } from "react";
import { OrdersTable } from "@/components/admin/orders-table";

export default function AdminOrdersPage() {
  // useSearchParams needs a Suspense boundary above it.
  return (
    <Suspense>
      <OrdersTable />
    </Suspense>
  );
}
