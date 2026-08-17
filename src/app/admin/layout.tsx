import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server";
import type { Metadata } from "next";
import { AdminConvexProvider } from "@/components/admin/convex-auth-provider";

export const metadata: Metadata = {
  title: "Admin",
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
        <div className="mx-auto w-full max-w-5xl px-6 py-12">
          <h1 className="font-display text-3xl">Georgia Perkins Pottery</h1>
          <p className="mt-1 text-sm text-muted-foreground">Catalog admin</p>
          <div className="mt-8">{children}</div>
        </div>
      </AdminConvexProvider>
    </ConvexAuthNextjsServerProvider>
  );
}
