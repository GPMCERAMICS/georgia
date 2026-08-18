import type { Metadata } from "next";
import localFont from "next/font/local";
import { Toaster } from "@/components/ui/sonner";
import { site } from "@/lib/site";
import { ConvexClientProvider } from "./ConvexClientProvider";
import "./globals.css";

// Clust, used for both headlines and body. One static weight, so it is
// declared 400 and the browser synthesises the heavier `font-medium` runs.
// OTF rather than the TTF: same outlines, 43K against 105K.
const clust = localFont({
  src: "./fonts/Clust.otf",
  variable: "--font-clust",
  weight: "400",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.name} — Handmade Artisanal Pottery`,
    template: `%s — ${site.name}`,
  },
  description: site.description,
  keywords: [
    "handmade pottery",
    "artisanal ceramics",
    "custom pottery commissions",
    "ceramic plates",
    "garden pottery",
    site.name,
  ],
  authors: [{ name: site.shortName }],
  openGraph: {
    title: `${site.name} — Handmade Artisanal Pottery`,
    description: site.description,
    url: site.url,
    siteName: site.name,
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: `${site.name} — Handmade Artisanal Pottery`,
    description: site.description,
  },
  alternates: {
    canonical: site.url,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${clust.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <ConvexClientProvider>
          {children}
          <Toaster />
        </ConvexClientProvider>
      </body>
    </html>
  );
}
