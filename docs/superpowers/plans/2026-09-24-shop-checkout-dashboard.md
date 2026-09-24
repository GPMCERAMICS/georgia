# Shop, Checkout, and Dashboard — Implementation Plan

Date: 2026-09-24

Supersedes the deferred "Plan 2" from
`2026-07-31-convex-catalog-and-admin.md`. Builds on the catalog that plan
delivered (Convex `pieces`, derived availability, admin auth) and takes the
site to a working store: cart, Stripe Checkout, order management, buyer and
owner email, and a real dashboard.

## Decisions (locked 2026-09-24)

| Topic | Decision |
|---|---|
| Sale modes | Two: `oneoff` (a single physical object) and `madeToOrder` (a design she remakes on demand, with a lead time). `deposit` and `drop` are cut. |
| Commission | A consultation, not a purchase. A sold one-off stays on the site as a portfolio reference with a "Commission something like this" call to action. |
| Sold one-offs | Stay on the shop grid with a Sold badge, sink to the bottom, until she archives them. |
| Collections | Replaced by **tags**. A piece carries many tags; the storefront filters by tag. Tags are managed in the dashboard. Homepage sections are tags with `featured` set. |
| Variants | None. Every listing is one item with one price. |
| Product fields | Dimensions (w/h/d inches), weight (oz), food safe, dishwasher safe, care notes. All optional. Weight and dimensions exist for future carrier rates. |
| Cart | Yes. Several pieces in one checkout and one shipment. All lines are reserved in one transaction. |
| Checkout | Stripe Checkout (hosted). Guest only. Apple and Google Pay come free. |
| Hold window | 30 minutes, matching Stripe's minimum session expiry. A cron expires stale holds as the backstop. |
| Tax | Georgia, US. Stripe Tax toggle in Settings, off by default. |
| Shipping | US only. Flat rate by size tier (plate / platter) plus free local pickup. Rates live in Settings, not env vars. Placeholder amounts seeded. |
| Carrier rates | Not now. The `settings.shipping` shape is where Shippo or EasyPost slots in. |
| Orders | `pending → paid → shipped → delivered`, plus `expired`, `cancelled`, `refunded`. Human order numbers `GP-1001…`. |
| Refunds | Issued from the Stripe dashboard. The `charge.refunded` webhook updates the order. |
| Customers | Derived from orders grouped by email. No table. |
| Inquiries | Stored in Convex with a status pipeline, not just emailed. |
| Email | Resend from Convex actions. Owner: new order, new inquiry. Buyer: order confirmation, shipped. Sending domain still to be verified (follow-up). |
| Dashboard | Sidebar layout: Overview, Orders, Pieces, Tags, Inquiries, Customers, Settings. Route stays `/admin`. |
| Brand copy | Stays in `src/lib/site.ts` for v1. Only commerce settings live in the database. |
| Auth | Convex Auth password, unchanged. Password reset via emailed code added. |
| Hosting | Vercel + Convex production. Stripe test keys in development, live at launch. |

## Data model

```
tags        name, slug, description, sortOrder, featured, visible
pieces      title, slug, description, size, tags[], mode, priceCents,
            stock | null, leadTimeWeeks | null, shippingTier,
            dimensions{w,h,d} | null, weightOz | null,
            foodSafe, dishwasherSafe, careNotes | null,
            images[], status, sortOrder
orders      orderNumber, status, email, name, shippingAddress | null,
            shippingMethod ("ship" | "pickup"), subtotalCents, shippingCents,
            taxCents, totalCents, stripeSessionId, stripePaymentIntentId,
            expiresAt, paidAt, shippedAt, carrier, trackingNumber, notes
orderItems  orderId, pieceId, titleSnapshot, priceCents
settings    singleton: shipping rates, pickup, tax toggle, notify email,
            from email, next order number
inquiries   name, email, type, budget, message, status, notes
```

Availability is still derived, never stored:

```
available = stock - paid items - active pending items
```

counted over `orderItems` joined to their order's status and `expiresAt`.

## Buying flow

```
Add to cart (localStorage)  →  Checkout button
   │
Convex action checkout.start(lines, shippingMethod)
   ├─ mutation reserve: verify every line available, create pending order
   │   + orderItems in ONE transaction (all or nothing), expiresAt = now+30m
   ├─ Stripe Checkout Session (inline line items, shipping option, metadata.orderId,
   │   expires_at = order.expiresAt)
   └─ patch order with sessionId; return session URL → browser redirects
   │
Webhook (Convex HTTP action → node action verifies signature → mutation)
   ├─ checkout.session.completed → order paid, emails owner + buyer
   ├─ checkout.session.expired   → order expired (hold released)
   └─ charge.refunded            → order refunded
   │
Cron every 5 minutes: expire pending orders past expiresAt
```

Every webhook mutation is idempotent: a re-delivered `completed` on an
already-paid order is a no-op.

## Dashboard

- **Overview**: revenue this month, orders to ship, pieces available, new
  inquiries, recent orders.
- **Orders**: filter by status, open one, mark shipped with carrier and
  tracking, mark delivered, add notes.
- **Pieces**: table with tag and status filters, publish/unpublish, archive,
  mark sold, reorder. Form with mode-driven fields and photos.
- **Tags**: create, rename, reorder, feature on homepage.
- **Inquiries**: pipeline (new, replied, quoted, in progress, done, declined),
  notes.
- **Customers**: derived from orders.
- **Settings**: store contact, shipping rates, pickup, tax toggle, emails.

## Launch checklist

- [ ] Verify a sending domain in Resend; set `RESEND_FROM_EMAIL`
- [ ] Set Convex env: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
      `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `ADMIN_EMAIL`, `SITE_URL`
- [ ] Add Stripe webhook endpoint `https://<deployment>.convex.site/stripe/webhook`
      for `checkout.session.completed`, `checkout.session.expired`, `charge.refunded`
- [ ] Run `npx convex run admin/maintenance:migrateLegacyCatalog` once on prod
- [ ] Run `npx convex run admin/seed:tags` to create the starter tags
- [ ] Fill real shipping rates and pickup details in Settings
- [ ] Decide Stripe Tax; enable in Settings if collecting
- [ ] Swap Stripe test keys for live keys
