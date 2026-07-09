import type { Metadata } from "next";
import { Figtree } from "next/font/google";
import localFont from "next/font/local";
import { Toaster } from "@/components/ui/sonner";
import { site } from "@/lib/site";
import "./globals.css";

// Display serif — self-hosted Zvon Serif (variable), the brand's headline face.
const zvon = localFont({
  src: "./fonts/ZvonSerifGX.ttf",
  variable: "--font-display",
  weight: "400 900",
  display: "swap",
});

// Body — quiet, humanist, highly legible.
const figtree = Figtree({
  variable: "--font-sans",
  subsets: ["latin"],
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
      className={`${zvon.variable} ${figtree.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
