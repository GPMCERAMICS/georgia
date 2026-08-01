# Shop: Convex Catalog + Stripe Checkout (Design)

Date: 2026-07-31

Picks up the two items deferred by `2026-07-08-pottery-one-pager-design.md`:
"real Stripe checkout" and "CMS / admin".

## Goal

Let Georgia sell pottery directly from the site. She manages a product catalog
herself through a small admin; the public shop renders from that catalog; Stripe
handles nothing but taking the money.

## The decision

Two options were weighed: Stripe as the catalog (Products + Payment Links), or
Convex as the catalog with Stripe used only for checkout. Shopify was considered
and rejected.

**Chosen: Convex holds the catalog, Stripe only takes payment.**

The deciding factor is that four different sale modes are needed at once, and
they are four different contracts with the buyer, not variations on a product:

| Mode | What the site must know |
|---|---|
| One-off finished piece | Stock of 1; must show "Sold" the instant it sells |
| Repeatable made-to-order | Unlimited stock, but a lead time to display |
| Commission deposit | A fixed booking payment, not a stocked item |
| Small batch / drop | Stock of N plus a release time |

Stripe's catalog has one shape — a Product with Prices and metadata strings. It
has no sold-out state, no release scheduling, and no transactional guard against
two buyers claiming the same object. Encoding all four modes as
`metadata.type = "..."` means writing the real logic in the app anyway, against a
store that cannot be queried properly and costs a network hop per page load.

**Shopify** handles all four modes with a good admin and no build cost, and would
be the right answer if speed to market were the only goal. Rejected because its
inventory model assumes fungible SKUs (40 identical mugs), whereas one-of-a-kind
work means one product per physical object — which breaks variants, collections,
and reporting. Each resulting gap is filled by a paid app with its own data model,
and those apps do not compose: two of them will disagree about what "sold out"
means and neither is yours to fix. It also does not serve the stated reason for
choosing Convex, which is room to build on later.

## The core mechanic: no overselling

This is the capability that justifies the whole decision.

```
Buyer clicks Buy
   |
Convex mutation: reservePiece(pieceId)      <- serializable transaction
   |-- available <= 0, or not yet released? -> reject, show "Just sold"
   +-- else: create pending order with expiresAt
   |
Stripe Checkout Session (metadata: orderId, expiry == hold window)
   |
Webhook  checkout.session.completed -> order paid, stock decremented
         checkout.session.expired   -> order expired, hold released
   |
Convex cron expires stale pending orders (backstop for a missed webhook)
```

Convex mutations are serializable transactions, so two buyers clicking the same
piece in the same second cannot both succeed — exactly one wins, and the other is
told before entering card details. With Stripe Payment Links both reach checkout
and the loser finds out after paying.

Because Convex queries are live, the moment the webhook lands, every browser
currently on the shop flips that card to "Sold" with no refresh.

**Hold duration** equals the Stripe Checkout Session expiry, set to Stripe's
minimum (believed to be 30 minutes; confirm against current Stripe docs during
planning). The design is invariant to the exact value — it is one constant.

## Scope

### In

- Convex-backed product catalog with the four sale modes
- Public shop grid at `/shop`, detail page at `/shop/[slug]`
- Stripe Checkout: shipping address collection, flat-rate shipping by tier,
  free local-pickup option
- Admin at `/admin`: manage pieces, upload photos, publish/unpublish, view
  orders, mark fulfilled, mark sold manually
- Webhook handler + reconciliation cron

### Out (deliberately)

- **Deposit-then-balance.** A commission deposit is a single one-shot payment.
  The balance is settled later by Georgia sending a Stripe invoice by hand from
  the dashboard. Avoids saved payment methods, half-paid orders open for weeks,
  and an entire second payment flow.
- **Personalisation fields at checkout.** Names, dates, and the brief arrive
  through the existing Resend commission form *before* any money moves. The
  heirloom flow is: brief -> Georgia quotes -> she points them at a deposit.
- **Stripe Tax.** Flag for Georgia depending on her state nexus; not built now.
- **Customer accounts, cart, discount codes, waitlists, "notify me".** Single
  item, single checkout. Convex makes all of these cheap to add later.
- **Migrating the existing nine pieces.** See below.
- **Homepage integration.** See below.

## What is NOT touched

The existing site keeps working untouched throughout. No migration, no cutover,
no window where the live site is half-converted.

- `src/lib/site.ts` **stays** and remains the one file for copy: name, tagline,
  about text, email, socials, commission types. Brand text changes twice a year;
  a database is the wrong home for it.
- The homepage keeps rendering `collections[].pieces` from `site.ts`, keeps
  serving the nine PNGs from `/public`, and keeps its "Inquire to buy" buttons.
  Those cards are **portfolio** — showing what Georgia can make — which is a
  different job from selling a specific object.
- The nine existing images are **not** migrated into Convex. They stay on disk
  serving the homepage.

The shop is built alongside, starts empty, and fills up as Georgia adds pieces
one at a time. `status: draft -> published` is her control over when each piece
surfaces.

**Known future decision, deliberately deferred:** eventually a piece will exist
both as a portfolio card on the homepage and as a real product in the shop, and
the two will need to reconcile. Not designed now. Revisited once pieces are
actually appearing on the shop page.

## Data model

### `pieces`

```
title, slug, description, size
collection      "wildlife" | "heirloom"
mode            "oneoff" | "madeToOrder" | "deposit" | "drop"
priceCents
stock           number | null      // null = unlimited (made-to-order, deposit)
releaseAt       number | null      // drops only
leadTimeWeeks   number | null      // made-to-order only
shippingTier    "plate" | "platter"
images          storage ids
status          "draft" | "published" | "archived"
sortOrder       number
```

**`status` has no `"sold"` value, by design.** `status` is *editorial* — what
Georgia controls from the admin. Sold / held / unreleased is *commercial* —
derived from `stock`, `releaseAt`, and live holds. If "sold" lived in both
places they would eventually disagree, producing a piece that is purchasable on
one page and sold on another. The card's badge is computed, never stored.

**There is no `heldUntil` on a piece, by design.** A single hold timestamp works
for a one-off but cannot represent a drop with stock of 5, which needs five
independent holds. Instead:

```
available = stock - paidOrders - activePendingOrders
```

where an active pending order is one with `status: "pending"` and
`expiresAt > now`. Holds live on `orders`, where they naturally support any
stock count, and one-offs are just the `stock = 1` case of the same rule. A
`null` stock (made-to-order, deposits) is always available.

### `orders`

```
pieceId, stripeSessionId, stripePaymentIntentId
status        "pending" | "paid" | "expired" | "fulfilled" | "refunded"
expiresAt     number             // the hold; only meaningful while pending
email, name, shippingAddress
amountCents, shippingCents
createdAt, paidAt
```

`fulfilled` is Georgia ticking "posted it". At this volume that is the whole
order-management system.

## Stripe integration

**No product mirror.** Stripe never holds a catalog. Checkout Sessions are
created with inline price data — name, amount, photo, and `metadata.pieceId`.

A mirrored catalog is a sync problem forever: Georgia edits a price in the admin
and two systems disagree until something reconciles them. Skipping the mirror
deletes that entire class of bug. The cost is that Stripe's dashboard reports
revenue by line-item name rather than per-product analytics — near-meaningless
for one-of-a-kind work, where every product sells exactly once.

- Shipping: `shipping_address_collection` plus two `shipping_options` — a
  flat rate by `shippingTier`, and local pickup at zero.
- Webhook at `/api/stripe/webhook`, signature-verified against the raw body,
  handling `checkout.session.completed` and `checkout.session.expired`.
  **Must be idempotent** — Stripe retries, and a re-delivered `completed` event
  must not double-process an order.

## Rendering

```
Server component:  preloadQuery(api.pieces.listPublished)   -> real, indexable HTML
Client component:  usePreloadedQuery(...)                   -> live subscription
```

Search engines and Instagram link previews get fully-rendered product HTML with
no loading spinner or layout shift, while the sold-out flip still happens live.
This is the documented Convex + Next.js pattern.

- `/shop` ships with a real empty state ("new work coming soon"), not a blank grid.
- The shop nav link stays hidden until at least one piece is published.
- `Product` JSON-LD with `offers.availability` on detail pages; `sitemap.ts`
  extended to include published piece URLs.

## Admin

`/admin`, behind a magic link emailed to Georgia. **Resend is already a
dependency** for the commission form, so authentication adds an integration point
rather than a service.

Three screens:

1. **Pieces** — list, create, edit, publish/unpublish, reorder, upload photos.
2. **One piece** — the form. The `mode` picker drives which fields appear: a
   made-to-order piece asks for lead time, a drop asks for release date, a
   one-off asks for neither.
3. **Orders** — buyer, piece, address, and a "posted it" toggle.

Plus **mark as sold manually**. Georgia sells at markets and fairs; without it
the site will happily sell a plate already in someone's tote bag.

## Error handling

- **Reservation lost** (someone else got there first): the piece is already
  reserved, so the buyer is told before checkout, not after. The card updates in
  place.
- **Missed webhook**: the Convex cron expiring stale pending orders is the
  backstop. Stock can never be permanently locked up by an abandoned checkout.
- **Payment succeeded but write failed**: Stripe is the source of truth for money.
  The webhook is idempotent and Stripe retries, so the order reconciles on retry.
- **Admin upload failure**: piece stays in `draft`; nothing half-published ever
  reaches the shop.

## Testing

- `convex-test` for mutations. **The critical test is concurrent `reservePiece`
  calls on the same piece — for a one-off exactly one must succeed, and for a
  drop with stock N exactly N must succeed.**
- Derived-state tests: the `available` calculation across all four modes,
  including expired holds returning stock and `null` stock always available.
- Webhook handler: signature rejection, idempotent replay of `completed`, and
  `expired` releasing the hold.
- Local webhook development via `stripe listen --forward-to`.
- Manual pass in Stripe test mode covering each of the four modes end to end.

## New environment variables

```
CONVEX_DEPLOYMENT
NEXT_PUBLIC_CONVEX_URL
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
```

To be added to `.env.local.example` alongside the existing Resend keys.

## Open items for planning

- Confirm the current Stripe Checkout Session minimum expiry (drives the hold
  window constant).
- Confirm Convex is provisioned via the Vercel Marketplace integration so env
  vars are wired automatically.
- Per `AGENTS.md`, read the relevant guides in `node_modules/next/dist/docs/`
  before writing route handlers or dynamic routes — this Next.js version has
  breaking changes from prior conventions.
- Georgia to supply: flat shipping rates per tier, deposit amount(s), and the
  real location values still marked `PLACEHOLDER` in `site.ts`.
