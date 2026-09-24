import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server";
import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminConvexProvider } from "@/components/admin/convex-auth-provider";

export const metadata: Metadata = {
  title: { default: "Dashboard", template: "%s — Dashboard" },
  robots: { index: false, follow: false },
};

export default function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Both auth providers live here rather than in the root layout: the server
  // provider reads cookies, which would make every public page dynamic.
  return (
    <ConvexAuthNextjsServerProvider>
      <AdminConvexProvider>
        <AdminShell>{children}</AdminShell>
      </AdminConvexProvider>
    </ConvexAuthNextjsServerProvider>
  );
}
