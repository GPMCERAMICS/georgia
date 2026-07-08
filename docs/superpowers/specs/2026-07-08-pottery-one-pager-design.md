# Georgia Perkins Pottery — One-Page Site (Design)

Date: 2026-07-08

## Goal
A single-page marketing website for Georgia Perkins Pottery. Two primary
objectives: (1) rank well in search, especially local, and (2) capture custom
commission inquiries via a contact form.

## Stack
- Next.js 16 (App Router) + TypeScript
- Tailwind v4 + shadcn/ui (radix components, stone/neutral base re-themed warm)
- Resend for transactional email (commission inquiries)
- Deploy target: Vercel (server-rendered HTML for SEO)

## Content (placeholders, editable in `src/lib/site.ts`)
- Business: Georgia Perkins Pottery
- Products: artisanal plates, garden pieces, and other one-of-a-kind ceramics
- Location: PLACEHOLDER (to be supplied) — used for local SEO + LocalBusiness JSON-LD
- Pieces: 6 placeholder gallery items (title, description, price)

## Page sections (top → bottom)
1. **Hero** — name, tagline, atmospheric image, two CTAs (Commission / Shop).
2. **About** — craft story paragraph + photo; local-SEO keyword home.
3. **Gallery / Shop** — responsive grid of piece cards (image, title, desc,
   price). Each has a *Buy* button that is a **stub for now** (wired to Stripe
   payment links later). Uses on-brand generated placeholders until real photos.
4. **Commission form** — name, email, message, optional piece type + budget.
   POSTs to `/api/commission`, which emails Georgia via Resend. Honeypot spam
   guard, success/error states.
5. **Footer** — location, email, socials (placeholders), copyright.

## SEO plan
- Per-page `metadata` (title, description, Open Graph, Twitter card).
- JSON-LD structured data: `LocalBusiness` + `Product` per piece.
- `sitemap.xml` + `robots.txt` via `src/app/sitemap.ts` / `robots.ts`.
- Semantic headings, alt text on all images, `next/image` optimization.

## Design direction
Warm, earthy, gallery-like. Cream/clay/terracotta palette with a sage accent
for the garden pieces. Distinctive type: Fraunces (display serif) + Figtree
(body). Generous whitespace, photography-forward, subtle paper grain.

## Explicitly deferred (not now)
- Real Stripe checkout / API integration (buy buttons are placeholders)
- CMS / admin
- Multi-page routing, blog
- Analytics
- Real location + real photography

## Architecture / files
- `src/lib/site.ts` — centralized editable content (business, pieces).
- `src/app/layout.tsx` — fonts, root metadata.
- `src/app/globals.css` — warm palette tokens, texture utilities.
- `src/app/page.tsx` — composes sections + JSON-LD.
- `src/components/site/*` — Hero, About, Gallery, PieceCard, CommissionForm,
  Footer, PlaceholderVessel, JsonLd.
- `src/app/api/commission/route.ts` — Resend email handler.
- `src/app/sitemap.ts`, `src/app/robots.ts` — SEO endpoints.
- `.env.local.example` — RESEND_API_KEY, CONTACT_TO_EMAIL, NEXT_PUBLIC_SITE_URL.
