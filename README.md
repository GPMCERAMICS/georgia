# Georgia Perkins Pottery

A storefront and dashboard for one-of-a-kind ceramics. Next.js 16 on Vercel,
Convex for the database, auth, file storage, and scheduled jobs, Stripe
Checkout for payment, Resend for email.

- `docs/superpowers/plans/2026-09-24-shop-checkout-dashboard.md` — the
  current plan, locked decisions, and data model.
- `docs/superpowers/specs/` — earlier design notes.

## Running locally

```bash
npm install
cp .env.local.example .env.local   # fill in the values it describes
npx convex dev                      # provisions/connects a dev deployment
npm run dev                         # http://localhost:3000
```

Set the backend variables on the Convex deployment, not in `.env.local`:

```bash
npx convex env set ADMIN_EMAIL you@example.com
npx convex env set STRIPE_SECRET_KEY sk_test_…
npx convex env set STRIPE_WEBHOOK_SECRET whsec_…
npx convex env set RESEND_API_KEY re_…
npx convex env set RESEND_FROM_EMAIL "Georgia Perkins Pottery <onboarding@resend.dev>"
npx convex env set SITE_URL http://localhost:3000
```

Seed starter data, then sign in at `/admin/signin` and create your password:

```bash
npx convex run admin/seed:tags     # the starter tags and default settings
npx convex run admin/seed:demo     # a dozen sample pieces (optional)
```

For Stripe webhooks in development, forward events to your dev deployment:

```bash
stripe listen --forward-to https://<dev-deployment>.convex.site/stripe/webhook
```

and set the `whsec_…` it prints as `STRIPE_WEBHOOK_SECRET`.

## Checks

```bash
npm test          # convex-test + vitest
npm run lint
npx tsc --noEmit
npm run build
```

## How it fits together

- **Catalog** lives in Convex (`pieces`, `tags`). Availability is derived
  from stock and live order items, never stored.
- **Cart** is a list of piece ids in the browser. Checkout reserves every
  line in one Convex transaction, then hands off to Stripe Checkout.
- **Webhook** at `/stripe/webhook` on the Convex site URL settles orders and
  sends email. A cron expires abandoned holds every five minutes.
- **Dashboard** at `/admin`: Overview, Orders, Pieces, Tags, Inquiries,
  Customers, Settings. Gated by an email allowlist (`ADMIN_EMAIL`).

## Deploying

Merging to `main` deploys everything: Vercel's production build runs
`npx convex deploy` first (see `vercel.json`), then builds the site against
the freshly deployed functions. This needs `CONVEX_DEPLOY_KEY` (a production
deploy key from the Convex dashboard) set in Vercel for **Production only**.
Preview builds skip the Convex deploy, so an unmerged branch can never
change the live backend.

## Launch checklist

- [ ] Verify a sending domain in Resend and set `RESEND_FROM_EMAIL` to it
- [ ] Set every Convex env var above on the **production** deployment
- [ ] Add the production webhook endpoint in Stripe for
      `checkout.session.completed`, `checkout.session.expired`, `charge.refunded`
- [ ] `npx convex run admin/maintenance:migrateLegacyCatalog --prod` once,
      if the production catalog predates tags
- [ ] `npx convex run admin/seed:tags --prod`
- [ ] Fill real shipping rates and pickup details in Settings
- [ ] Decide on sales tax; register in Stripe and flip the Settings toggle if collecting
- [ ] Swap Stripe test keys for live keys
