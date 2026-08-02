# Convex Catalog + Admin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give Georgia a private admin where she can build a product catalog in Convex, one piece at a time, with photo uploads and publish control — before any Stripe or public shop code exists.

**Architecture:** Convex holds the catalog as a single `pieces` table with a `mode` discriminator covering all four sale modes. An `orders` table exists from the start because availability is derived from it, but nothing writes to it until Plan 2. Availability is computed by a pure function, never stored. The admin is a Convex Auth magic-link-protected area under `/admin`.

**Tech Stack:** Next.js 16 (App Router, src/ dir), React 19.2, TypeScript, Tailwind v4 + shadcn/ui, Convex (database + file storage + auth), Resend (already installed), Vitest + convex-test.

**Source spec:** `docs/superpowers/specs/2026-07-31-convex-catalog-stripe-checkout-design.md`

## Global Constraints

- **Next.js 16.2.10.** `params` and `searchParams` in pages are `Promise`s — synchronous access was removed in v16. Use `await props.params`.
- **`middleware.ts` is deprecated in Next 16 in favour of `proxy.ts`**, but Convex Auth ships `convexAuthNextjsMiddleware` for `middleware.ts`. **Use `middleware.ts`.** Deprecated still functions; renaming it is not supported by Convex Auth and would silently break admin auth. Revisit when Convex Auth documents Next 16 support.
- **`images.domains` is removed** — use `images.remotePatterns` in `next.config.ts` for Convex-served images.
- **Do not modify** `src/lib/site.ts` content, `src/app/page.tsx`, any component in `src/components/site/`, or any image in `/public`. The existing homepage must keep working byte-for-byte throughout this plan.
- **Convex adds `_creationTime` and `_id` automatically.** Do not add a `createdAt` field.
- **Money is always integer cents.** Never floats.
- Package manager is **npm** (`package-lock.json` present).
- Existing code style: double quotes, semicolons, 2-space indent, named exports for components.

### Convex 1.41 API corrections (authoritative — overrides training data)

`convex/_generated/ai/guidelines.md` is the source of truth and `AGENTS.md`
mandates reading it. These differ from older Convex and from what a model is
likely to write unprompted:

1. **`ctx.db` takes the table name as the first argument.**
   `ctx.db.get("pieces", id)`, `ctx.db.patch("pieces", id, patch)`,
   `ctx.db.replace("pieces", id, doc)`, `ctx.db.delete("pieces", id)`.
   The single-argument form is wrong.
2. **Never read the wall clock inside a query.** No `Date.now()` or
   `new Date()` in any `query` handler — queries do not re-run as time passes,
   so the result goes stale and query-cache reuse collapses. Pass `now` in as
   an argument. `Date.now()` remains fine in mutations and actions.
3. **Never `.collect()` an unbounded query.** Use `.take(n)` with a named
   limit constant, or paginate. Never `.collect().length` to count.
4. **Index names must list every field**: an index on `["status","sortOrder"]`
   is named `by_status_and_sortOrder`, not `by_status_sort`.
5. **Object validators compose** — `.pick()`, `.omit()`, `.partial()`,
   `.extend()`, and `.fields` to supply function `args`. Derive variants
   instead of retyping a field list.
6. **Test files using `import.meta.glob` need `/// <reference types="vite/client" />`**
   as their first line. Do NOT add a `compilerOptions.types` allowlist to
   `tsconfig.json`.
7. Always include `args` validators on every Convex function, including
   internal ones.

---

### Task 1: Provision Convex and wire the client provider

**Files:**
- Create: `src/app/ConvexClientProvider.tsx`
- Create: `convex/schema.ts` (minimal placeholder, replaced in Task 2)
- Modify: `src/app/layout.tsx:56-72` (wrap children)
- Modify: `next.config.ts`
- Modify: `.env.local.example`

**Interfaces:**
- Consumes: nothing
- Produces: `ConvexClientProvider` React component; `NEXT_PUBLIC_CONVEX_URL` available at runtime; `convex/_generated/api` importable.

> **This task requires the user at a terminal.** Both `vercel integration add` and `npx convex dev` open a browser for authentication. Do not attempt to automate past them — run the command, and if it hands off to a browser, stop and ask the user to complete it.

- [ ] **Step 1: Install dependencies**

`@auth/core` is pinned to satisfy `@convex-dev/auth`'s peer range `^0.41.1` (verified 2026-08-02 against @convex-dev/auth@0.0.94). Do NOT use --force or --legacy-peer-deps.

```bash
npm install convex @convex-dev/auth @auth/core@0.41.3
```

- [ ] **Step 2: (superseded — do not run)**

The original plan provisioned Convex via `vercel integration add convex`.
**Do not.** The Convex project is created by the CLI in Step 3 instead, under
the Smith & Grain team, named `georgia-perkins-pottery`.

Running the marketplace integration *as well* mints a SECOND, unrelated Convex
project and splits the deployment in two. At deploy time, wire the existing
project into Vercel by setting `CONVEX_DEPLOY_KEY` and `NEXT_PUBLIC_CONVEX_URL`
as Vercel env vars — do not use the marketplace for this project.

- [ ] **Step 3: Initialise the Convex dev deployment**

```bash
npx convex dev --once
```

This opens a browser to log in, creates the deployment, writes
`CONVEX_DEPLOYMENT` and `NEXT_PUBLIC_CONVEX_URL` into `.env.local`, and generates
`convex/_generated/`. Ask the user to complete the browser step.

- [ ] **Step 4: Create a minimal schema so codegen succeeds**

```ts
// convex/schema.ts
import { defineSchema } from "convex/server";

export default defineSchema({});
```

- [ ] **Step 5: Create the client provider**

```tsx
// src/app/ConvexClientProvider.tsx
"use client";

import { ConvexReactClient } from "convex/react";
import { ConvexAuthNextjsProvider } from "@convex-dev/auth/nextjs";
import type { ReactNode } from "react";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  return (
    <ConvexAuthNextjsProvider client={convex}>
      {children}
    </ConvexAuthNextjsProvider>
  );
}
```

- [ ] **Step 6: Wrap the app**

In `src/app/layout.tsx`, add the import and wrap `{children}` **and** `<Toaster />`:

```tsx
import { ConvexClientProvider } from "./ConvexClientProvider";
```

```tsx
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <ConvexClientProvider>
          {children}
          <Toaster />
        </ConvexClientProvider>
      </body>
```

- [ ] **Step 7: Allow Convex-hosted images**

In `next.config.ts`, add to the config object (`images.domains` no longer
exists in Next 16 — `remotePatterns` only):

```ts
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.convex.cloud" },
    ],
  },
```

- [ ] **Step 8: Add a path alias for generated Convex code**

`convex/` sits outside `src/`, so without this every client import reads
`@convex/_generated/api`. In `tsconfig.json`, extend `"paths"`:

```json
    "paths": {
      "@/*": ["./src/*"],
      "@convex/*": ["./convex/*"]
    }
```

All client-side imports in later tasks use `@convex/_generated/api` and
`@convex/_generated/dataModel`. Convex's own function files keep using relative
imports (`./_generated/server`) — the alias is not available inside the Convex
runtime.

- [ ] **Step 9: Document the new env vars**

Append to `.env.local.example`:

```bash
# Convex — written automatically by `npx convex dev`
CONVEX_DEPLOYMENT=
NEXT_PUBLIC_CONVEX_URL=

# Admin — the only email allowed to sign in to /admin
ADMIN_EMAIL=
```

- [ ] **Step 10: Verify the existing site is untouched**

Run: `npm run build`
Expected: build succeeds. Then `npm run dev` and load `http://localhost:3000` —
the homepage must render exactly as before, with no console errors.

- [ ] **Step 11: Commit**

```bash
git add package.json package-lock.json tsconfig.json convex/ src/app/ConvexClientProvider.tsx src/app/layout.tsx next.config.ts .env.local.example
git commit -m "feat(convex): provision Convex and wire the client provider"
```

---

### Task 2: Schema — pieces and orders

**Files:**
- Modify: `convex/schema.ts` (replace the placeholder from Task 1)

**Interfaces:**
- Consumes: nothing
- Produces: tables `pieces` and `orders`; exported validators `pieceMode`, `pieceStatus`, `pieceCollection`, `shippingTier`, `orderStatus`; indexes `pieces.by_slug`, `pieces.by_status_and_sortOrder`, `orders.by_pieceId_and_status`, `orders.by_stripeSessionId`.

- [ ] **Step 1: Write the schema**

```ts
// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export const pieceCollection = v.union(
  v.literal("wildlife"),
  v.literal("heirloom"),
);

export const pieceMode = v.union(
  v.literal("oneoff"),
  v.literal("madeToOrder"),
  v.literal("deposit"),
  v.literal("drop"),
);

export const pieceStatus = v.union(
  v.literal("draft"),
  v.literal("published"),
  v.literal("archived"),
);

export const shippingTier = v.union(v.literal("plate"), v.literal("platter"));

export const orderStatus = v.union(
  v.literal("pending"),
  v.literal("paid"),
  v.literal("expired"),
  v.literal("fulfilled"),
  v.literal("refunded"),
);

export default defineSchema({
  ...authTables,

  pieces: defineTable({
    title: v.string(),
    slug: v.string(),
    description: v.string(),
    size: v.union(v.string(), v.null()),
    collection: pieceCollection,
    mode: pieceMode,
    priceCents: v.number(),
    // null = unlimited (madeToOrder, deposit)
    stock: v.union(v.number(), v.null()),
    // drops only — epoch ms before which the piece is not purchasable
    releaseAt: v.union(v.number(), v.null()),
    // madeToOrder only
    leadTimeWeeks: v.union(v.number(), v.null()),
    shippingTier,
    images: v.array(v.id("_storage")),
    status: pieceStatus,
    sortOrder: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_status_and_sortOrder", ["status", "sortOrder"]),

  orders: defineTable({
    pieceId: v.id("pieces"),
    stripeSessionId: v.union(v.string(), v.null()),
    stripePaymentIntentId: v.union(v.string(), v.null()),
    status: orderStatus,
    // the reservation hold; only meaningful while status is "pending"
    expiresAt: v.number(),
    email: v.union(v.string(), v.null()),
    name: v.union(v.string(), v.null()),
    shippingAddress: v.union(v.string(), v.null()),
    amountCents: v.number(),
    shippingCents: v.number(),
    paidAt: v.union(v.number(), v.null()),
  })
    .index("by_pieceId_and_status", ["pieceId", "status"])
    .index("by_stripeSessionId", ["stripeSessionId"]),
});
```

Note there is no `createdAt` — Convex provides `_creationTime` on every document.
Note `status` has no `"sold"` value; that state is derived (Task 3).

- [ ] **Step 2: Verify the schema compiles and pushes**

Run: `npx convex dev --once`
Expected: completes with no schema errors and regenerates `convex/_generated/`.

- [ ] **Step 3: Commit**

```bash
git add convex/schema.ts
git commit -m "feat(convex): pieces and orders schema"
```

---

### Task 3: Availability derivation (pure function)

This is the correctness core of the whole feature. It is deliberately a pure
function with no Convex dependency so it can be exhaustively unit-tested.

**Files:**
- Create: `convex/lib/availability.ts`
- Create: `convex/lib/availability.test.ts`
- Create: `vitest.config.ts`
- Modify: `package.json` (add `test` script)

**Interfaces:**
- Consumes: nothing
- Produces:
  - `type Availability = { state: "hidden" } | { state: "unreleased"; releaseAt: number } | { state: "sold" } | { state: "available"; remaining: number | null }`
  - `computeAvailability(input: AvailabilityInput): Availability`
  - `type AvailabilityInput = { status: "draft" | "published" | "archived"; stock: number | null; releaseAt: number | null; paidCount: number; activeHoldCount: number; now: number }`

- [ ] **Step 1: Install test tooling**

```bash
npm install -D vitest convex-test @edge-runtime/vm
```

- [ ] **Step 2: Add the vitest config**

```ts
// vitest.config.ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "edge-runtime",
    server: { deps: { inline: ["convex-test"] } },
  },
});
```

- [ ] **Step 3: Add the test script**

In `package.json`, add to `"scripts"`:

```json
    "test": "vitest run",
```

- [ ] **Step 4: Write the failing tests**

```ts
// convex/lib/availability.test.ts
import { describe, expect, test } from "vitest";
import { computeAvailability } from "./availability";

const NOW = 1_800_000_000_000;

// Defaults describe a published, in-stock one-off with no holds.
const base = {
  status: "published" as const,
  stock: 1 as number | null,
  releaseAt: null as number | null,
  paidCount: 0,
  activeHoldCount: 0,
  now: NOW,
};

describe("computeAvailability", () => {
  test("a draft piece is hidden", () => {
    expect(computeAvailability({ ...base, status: "draft" })).toEqual({
      state: "hidden",
    });
  });

  test("an archived piece is hidden", () => {
    expect(computeAvailability({ ...base, status: "archived" })).toEqual({
      state: "hidden",
    });
  });

  test("a drop before its release time is unreleased", () => {
    expect(
      computeAvailability({ ...base, stock: 5, releaseAt: NOW + 1000 }),
    ).toEqual({ state: "unreleased", releaseAt: NOW + 1000 });
  });

  test("a drop at exactly its release time is available", () => {
    expect(
      computeAvailability({ ...base, stock: 5, releaseAt: NOW }),
    ).toEqual({ state: "available", remaining: 5 });
  });

  test("an unsold one-off is available with one remaining", () => {
    expect(computeAvailability(base)).toEqual({
      state: "available",
      remaining: 1,
    });
  });

  test("a one-off with a paid order is sold", () => {
    expect(computeAvailability({ ...base, paidCount: 1 })).toEqual({
      state: "sold",
    });
  });

  test("a one-off held by an in-progress checkout is sold to everyone else", () => {
    expect(computeAvailability({ ...base, activeHoldCount: 1 })).toEqual({
      state: "sold",
    });
  });

  test("a drop counts paid and held against its stock", () => {
    expect(
      computeAvailability({
        ...base,
        stock: 5,
        paidCount: 2,
        activeHoldCount: 1,
      }),
    ).toEqual({ state: "available", remaining: 2 });
  });

  test("a fully claimed drop is sold", () => {
    expect(
      computeAvailability({
        ...base,
        stock: 5,
        paidCount: 4,
        activeHoldCount: 1,
      }),
    ).toEqual({ state: "sold" });
  });

  test("oversold stock never reports negative remaining", () => {
    expect(computeAvailability({ ...base, stock: 1, paidCount: 3 })).toEqual({
      state: "sold",
    });
  });

  test("null stock (made-to-order) is always available with no limit", () => {
    expect(
      computeAvailability({ ...base, stock: null, paidCount: 99 }),
    ).toEqual({ state: "available", remaining: null });
  });

  test("hidden takes precedence over unreleased", () => {
    expect(
      computeAvailability({
        ...base,
        status: "draft",
        releaseAt: NOW + 1000,
      }),
    ).toEqual({ state: "hidden" });
  });
});
```

- [ ] **Step 5: Run the tests to verify they fail**

Run: `npm test -- availability`
Expected: FAIL — cannot resolve `./availability`.

- [ ] **Step 6: Write the implementation**

```ts
// convex/lib/availability.ts

/**
 * Commercial state of a piece, derived — never stored.
 *
 * `status` on the piece is editorial (what Georgia controls). Whether a piece
 * is sold, held, or not yet released is computed from stock, releaseAt, and
 * live orders. Storing it in both places guarantees they eventually disagree.
 */
export type Availability =
  | { state: "hidden" }
  | { state: "unreleased"; releaseAt: number }
  | { state: "sold" }
  | { state: "available"; remaining: number | null };

export type AvailabilityInput = {
  status: "draft" | "published" | "archived";
  /** null means unlimited — made-to-order pieces and commission deposits. */
  stock: number | null;
  releaseAt: number | null;
  /** Orders with status "paid" or "fulfilled". */
  paidCount: number;
  /** Orders with status "pending" whose expiresAt is still in the future. */
  activeHoldCount: number;
  now: number;
};

export function computeAvailability(input: AvailabilityInput): Availability {
  if (input.status !== "published") {
    return { state: "hidden" };
  }

  if (input.releaseAt !== null && input.now < input.releaseAt) {
    return { state: "unreleased", releaseAt: input.releaseAt };
  }

  if (input.stock === null) {
    return { state: "available", remaining: null };
  }

  const remaining = input.stock - input.paidCount - input.activeHoldCount;
  return remaining > 0
    ? { state: "available", remaining }
    : { state: "sold" };
}
```

- [ ] **Step 7: Run the tests to verify they pass**

Run: `npm test -- availability`
Expected: PASS, 12 tests.

- [ ] **Step 8: Commit**

```bash
git add vitest.config.ts package.json package-lock.json convex/lib/availability.ts convex/lib/availability.test.ts
git commit -m "feat(convex): derive piece availability from stock, release time, and holds"
```

---

### Task 4: Public catalog queries

**Files:**
- Create: `convex/pieces.ts`
- Create: `convex/pieces.test.ts`
- Create: `src/lib/catalog-time.ts`

**Interfaces:**
- Consumes: `computeAvailability`, `Availability` from `./lib/availability`; schema from Task 2.
- Produces:
  - `api.pieces.listPublished` — query, args `{ now: number }`, returns `PublicPiece[]` sorted by `sortOrder` ascending, excluding `hidden` pieces.
  - `api.pieces.getBySlug` — query, args `{ slug: string, now: number }`, returns `PublicPiece | null`.
  - `nowForCatalog(): number` from `src/lib/catalog-time.ts` — `Date.now()` quantised down to the minute. Every caller of the two queries uses it.
  - `type PublicPiece = { _id: Id<"pieces">; title: string; slug: string; description: string; size: string | null; collection: "wildlife" | "heirloom"; mode: "oneoff" | "madeToOrder" | "deposit" | "drop"; priceCents: number; leadTimeWeeks: number | null; imageUrls: string[]; availability: Availability }`

- [ ] **Step 1: Write the failing tests**

```ts
// convex/pieces.test.ts
/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import schema from "./schema";
import { api } from "./_generated/api";

// convex-test needs to find the function modules in this directory.
const modules = import.meta.glob("./**/*.ts");

// Time is an argument, never the wall clock — see convex/pieces.ts.
const NOW = 1_800_000_000_000;

function pieceFields(overrides: Record<string, unknown> = {}) {
  return {
    title: "Kingfisher Plate",
    slug: "kingfisher-plate",
    description: "A sacred kingfisher in blue-and-green watercolor.",
    size: '10" plate',
    collection: "wildlife" as const,
    mode: "oneoff" as const,
    priceCents: 18000,
    stock: 1 as number | null,
    releaseAt: null as number | null,
    leadTimeWeeks: null as number | null,
    shippingTier: "plate" as const,
    images: [],
    status: "published" as const,
    sortOrder: 0,
    ...overrides,
  };
}

describe("pieces.listPublished", () => {
  test("returns published pieces", async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      await ctx.db.insert("pieces", pieceFields());
    });

    const pieces = await t.query(api.pieces.listPublished, { now: NOW });
    expect(pieces).toHaveLength(1);
    expect(pieces[0].title).toBe("Kingfisher Plate");
    expect(pieces[0].availability).toEqual({
      state: "available",
      remaining: 1,
    });
  });

  test("omits draft and archived pieces", async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      await ctx.db.insert("pieces", pieceFields({ status: "draft" }));
      await ctx.db.insert(
        "pieces",
        pieceFields({ slug: "b", status: "archived" }),
      );
    });

    expect(await t.query(api.pieces.listPublished, { now: NOW })).toEqual([]);
  });

  test("orders by sortOrder ascending", async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      await ctx.db.insert(
        "pieces",
        pieceFields({ slug: "second", title: "Second", sortOrder: 2 }),
      );
      await ctx.db.insert(
        "pieces",
        pieceFields({ slug: "first", title: "First", sortOrder: 1 }),
      );
    });

    const pieces = await t.query(api.pieces.listPublished, { now: NOW });
    expect(pieces.map((p) => p.title)).toEqual(["First", "Second"]);
  });

  test("a piece with a paid order reports sold", async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      const pieceId = await ctx.db.insert("pieces", pieceFields());
      await ctx.db.insert("orders", {
        pieceId,
        stripeSessionId: null,
        stripePaymentIntentId: null,
        status: "paid",
        expiresAt: 0,
        email: "buyer@example.com",
        name: "Buyer",
        shippingAddress: null,
        amountCents: 18000,
        shippingCents: 900,
        paidAt: NOW - 1000,
      });
    });

    const pieces = await t.query(api.pieces.listPublished, { now: NOW });
    expect(pieces[0].availability).toEqual({ state: "sold" });
  });

  test("an expired pending order does not hold stock", async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      const pieceId = await ctx.db.insert("pieces", pieceFields());
      await ctx.db.insert("orders", {
        pieceId,
        stripeSessionId: null,
        stripePaymentIntentId: null,
        status: "pending",
        expiresAt: NOW - 60_000, // expired a minute ago
        email: null,
        name: null,
        shippingAddress: null,
        amountCents: 18000,
        shippingCents: 900,
        paidAt: null,
      });
    });

    const pieces = await t.query(api.pieces.listPublished, { now: NOW });
    expect(pieces[0].availability).toEqual({
      state: "available",
      remaining: 1,
    });
  });
});

describe("pieces.getBySlug", () => {
  test("finds a published piece by slug", async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      await ctx.db.insert("pieces", pieceFields());
    });

    const piece = await t.query(api.pieces.getBySlug, {
      slug: "kingfisher-plate",
      now: NOW,
    });
    expect(piece?.title).toBe("Kingfisher Plate");
  });

  test("returns null for an unknown slug", async () => {
    const t = convexTest(schema, modules);
    expect(await t.query(api.pieces.getBySlug, { slug: "nope", now: NOW })).toBeNull();
  });

  test("returns null for a draft piece", async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      await ctx.db.insert("pieces", pieceFields({ status: "draft" }));
    });

    expect(
      await t.query(api.pieces.getBySlug, { slug: "kingfisher-plate", now: NOW }),
    ).toBeNull();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- pieces`
Expected: FAIL — `api.pieces` does not exist.

- [ ] **Step 3: Write the caller-side clock helper**

```ts
// src/lib/catalog-time.ts

/**
 * The timestamp to pass to the catalog queries.
 *
 * Convex forbids reading the wall clock inside a query, so callers supply it.
 * Quantising down to the minute means every visitor in the same minute shares
 * one cache entry instead of each minting their own, and a minute of drift is
 * irrelevant against a 30-minute hold.
 */
export function nowForCatalog(): number {
  const MINUTE = 60_000;
  return Math.floor(Date.now() / MINUTE) * MINUTE;
}
```

- [ ] **Step 4: Write the query implementation**

```ts
// convex/pieces.ts
import { v } from "convex/values";
import { query } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";
import { computeAvailability, type Availability } from "./lib/availability";

export type PublicPiece = {
  _id: Id<"pieces">;
  title: string;
  slug: string;
  description: string;
  size: string | null;
  collection: "wildlife" | "heirloom";
  mode: "oneoff" | "madeToOrder" | "deposit" | "drop";
  priceCents: number;
  leadTimeWeeks: number | null;
  imageUrls: string[];
  availability: Availability;
};

/**
 * Convex forbids unbounded `.collect()`. A single piece can never legitimately
 * accumulate more claims than a generous batch, so we bound the read and treat
 * exceeding it as sold out rather than silently undercounting.
 */
const MAX_CLAIMS_PER_PIECE = 256;

/** Pieces shown on the shop at once. Georgia's catalog is nowhere near this. */
const MAX_PUBLISHED_PIECES = 200;

/**
 * Counts the orders that consume stock: settled sales, plus checkouts that are
 * still live. An expired pending order holds nothing.
 */
async function countClaims(ctx: QueryCtx, pieceId: Id<"pieces">, now: number) {
  const orders = await ctx.db
    .query("orders")
    .withIndex("by_pieceId_and_status", (q) => q.eq("pieceId", pieceId))
    .take(MAX_CLAIMS_PER_PIECE);

  let paidCount = 0;
  let activeHoldCount = 0;
  for (const order of orders) {
    if (order.status === "paid" || order.status === "fulfilled") {
      paidCount += 1;
    } else if (order.status === "pending" && order.expiresAt > now) {
      activeHoldCount += 1;
    }
  }
  return { paidCount, activeHoldCount };
}

async function toPublicPiece(
  ctx: QueryCtx,
  piece: Doc<"pieces">,
  now: number,
): Promise<PublicPiece> {
  const { paidCount, activeHoldCount } = await countClaims(ctx, piece._id, now);
  const imageUrls = (
    await Promise.all(piece.images.map((id) => ctx.storage.getUrl(id)))
  ).filter((url): url is string => url !== null);

  return {
    _id: piece._id,
    title: piece.title,
    slug: piece.slug,
    description: piece.description,
    size: piece.size,
    collection: piece.collection,
    mode: piece.mode,
    priceCents: piece.priceCents,
    leadTimeWeeks: piece.leadTimeWeeks,
    imageUrls,
    availability: computeAvailability({
      status: piece.status,
      stock: piece.stock,
      releaseAt: piece.releaseAt,
      paidCount,
      activeHoldCount,
      now,
    }),
  };
}

/**
 * `now` is an argument, never `Date.now()`.
 *
 * Convex queries do not re-run as the clock advances, so a query that read the
 * wall clock would serve a stale "available" long after a hold expired, and
 * every read would miss the query cache. The caller passes the time, quantised
 * to the minute (see `nowForCatalog`), which keeps cache reuse high while
 * staying well inside the 30-minute hold window.
 *
 * This makes displayed availability advisory. That is correct: the authoritative
 * check happens in the reserve mutation (Plan 2), where `Date.now()` is allowed.
 */
export const listPublished = query({
  args: { now: v.number() },
  handler: async (ctx, args) => {
    const pieces = await ctx.db
      .query("pieces")
      .withIndex("by_status_and_sortOrder", (q) => q.eq("status", "published"))
      .order("asc")
      .take(MAX_PUBLISHED_PIECES);

    return Promise.all(
      pieces.map((piece) => toPublicPiece(ctx, piece, args.now)),
    );
  },
});

export const getBySlug = query({
  args: { slug: v.string(), now: v.number() },
  handler: async (ctx, args) => {
    const piece = await ctx.db
      .query("pieces")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();

    if (piece === null || piece.status !== "published") return null;
    return toPublicPiece(ctx, piece, args.now);
  },
});
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test -- pieces`
Expected: PASS, 8 tests.

- [ ] **Step 6: Run the whole suite**

Run: `npm test`
Expected: PASS, 21 tests total.

- [ ] **Step 7: Commit**

```bash
git add convex/pieces.ts convex/pieces.test.ts src/lib/catalog-time.ts
git commit -m "feat(convex): public catalog queries with derived availability"
```

---

### Task 5: Admin authentication

**Files:**
- Create: `convex/auth.ts`
- Create: `convex/auth.config.ts`
- Create: `convex/http.ts`
- Create: `convex/lib/adminGuard.ts`
- Create: `src/middleware.ts`
- Create: `src/app/admin/layout.tsx`
- Create: `src/app/admin/page.tsx` (placeholder, replaced in Task 8)
- Create: `src/components/admin/sign-in.tsx`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `requireAdmin(ctx): Promise<void>` from `convex/lib/adminGuard.ts` — throws if the caller is not the admin. Used by every mutation in Tasks 6 and 7.

> **Design note:** Georgia is the only user. Rather than build roles, the guard
> compares the authenticated email against the `ADMIN_EMAIL` environment
> variable. Anyone else who completes a magic link gets an account that can do
> nothing.

- [ ] **Step 1: Run the Convex Auth initialiser**

```bash
npx @convex-dev/auth
```

This generates `convex/auth.config.ts` and sets `JWT_PRIVATE_KEY` / `JWKS` on
the Convex deployment. Ask the user to complete any browser step.

- [ ] **Step 2: Set the auth environment variables on Convex**

```bash
npx convex env set AUTH_RESEND_KEY <the existing RESEND_API_KEY value>
npx convex env set ADMIN_EMAIL <Georgia's email>
```

Ask the user for both values. **Never print them back.**

- [ ] **Step 3: Configure the Resend magic-link provider**

```ts
// convex/auth.ts
import Resend from "@auth/core/providers/resend";
import { convexAuth } from "@convex-dev/auth/server";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Resend({
      from: process.env.AUTH_EMAIL_FROM ?? "Georgia Perkins Pottery <onboarding@resend.dev>",
    }),
  ],
});
```

- [ ] **Step 4: Expose the auth HTTP routes**

```ts
// convex/http.ts
import { httpRouter } from "convex/server";
import { auth } from "./auth";

const http = httpRouter();
auth.addHttpRoutes(http);

export default http;
```

- [ ] **Step 5: Write the failing test for the admin guard**

```ts
// convex/lib/adminGuard.test.ts
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import schema from "../schema";
import { api } from "../_generated/api";

const modules = import.meta.glob("../**/*.ts");

describe("requireAdmin", () => {
  test("rejects an unauthenticated caller", async () => {
    const t = convexTest(schema, modules);
    await expect(
      t.mutation(api.admin.pieces.create, {
        title: "X",
        slug: "x",
        description: "",
        size: null,
        collection: "wildlife",
        mode: "oneoff",
        priceCents: 1000,
        stock: 1,
        releaseAt: null,
        leadTimeWeeks: null,
        shippingTier: "plate",
      }),
    ).rejects.toThrow("Not authorised");
  });
});
```

> This test depends on `api.admin.pieces.create` from Task 6. Write it now, watch
> it fail for the right reason, and it turns green when Task 6 lands. If working
> strictly task-by-task, expect this single test to fail at the end of Task 5.

- [ ] **Step 6: Write the guard**

```ts
// convex/lib/adminGuard.ts
import { getAuthUserId } from "@convex-dev/auth/server";
import type { MutationCtx, QueryCtx } from "../_generated/server";

/**
 * Georgia is the only user. Rather than a role system, we compare the signed-in
 * email against ADMIN_EMAIL. Anyone else who completes a magic link gets an
 * account with no capabilities.
 */
export async function requireAdmin(ctx: QueryCtx | MutationCtx): Promise<void> {
  const userId = await getAuthUserId(ctx);
  if (userId === null) throw new Error("Not authorised");

  const user = await ctx.db.get("users", userId);
  const adminEmail = process.env.ADMIN_EMAIL;

  if (!adminEmail) {
    throw new Error("ADMIN_EMAIL is not configured on the Convex deployment");
  }
  if (!user || user.email?.toLowerCase() !== adminEmail.toLowerCase()) {
    throw new Error("Not authorised");
  }
}
```

- [ ] **Step 7: Add the route middleware**

Next 16 deprecates `middleware.ts` in favour of `proxy.ts`, but Convex Auth only
ships a `middleware.ts` helper. **Use `middleware.ts` — see Global Constraints.**

```ts
// src/middleware.ts
import {
  convexAuthNextjsMiddleware,
  createRouteMatcher,
  nextjsMiddlewareRedirect,
} from "@convex-dev/auth/nextjs/server";

const isAdminRoute = createRouteMatcher(["/admin(.*)"]);

export default convexAuthNextjsMiddleware(async (request, { convexAuth }) => {
  if (isAdminRoute(request) && !(await convexAuth.isAuthenticated())) {
    return nextjsMiddlewareRedirect(request, "/admin/signin");
  }
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
```

- [ ] **Step 8: Build the sign-in form**

```tsx
// src/components/admin/sign-in.tsx
"use client";

import { useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function SignIn() {
  const { signIn } = useAuthActions();
  const [sent, setSent] = useState(false);

  if (sent) {
    return (
      <p className="text-sm text-muted-foreground">
        Check your email for a sign-in link.
      </p>
    );
  }

  return (
    <form
      className="flex w-full max-w-sm flex-col gap-3"
      onSubmit={async (event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        await signIn("resend", formData);
        setSent(true);
      }}
    >
      <Label htmlFor="email">Email</Label>
      <Input id="email" name="email" type="email" required />
      <Button type="submit" className="rounded-full">
        Send sign-in link
      </Button>
    </form>
  );
}
```

- [ ] **Step 9: Add the admin shell and sign-in page**

```tsx
// src/app/admin/layout.tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export default function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-12">
      <h1 className="font-display text-3xl">Georgia Perkins Pottery</h1>
      <p className="mt-1 text-sm text-muted-foreground">Catalog admin</p>
      <div className="mt-8">{children}</div>
    </div>
  );
}
```

```tsx
// src/app/admin/signin/page.tsx
import { SignIn } from "@/components/admin/sign-in";

export default function SignInPage() {
  return <SignIn />;
}
```

```tsx
// src/app/admin/page.tsx
export default function AdminHomePage() {
  return <p className="text-sm text-muted-foreground">Pieces list lands in Task 8.</p>;
}
```

- [ ] **Step 10: Verify sign-in end to end**

Run: `npm run dev`, then visit `http://localhost:3000/admin`.
Expected: redirected to `/admin/signin`. Enter Georgia's email, receive the
magic link, click it, and land on `/admin`. Then visit `/` and confirm the
public homepage still renders unchanged and does not redirect.

- [ ] **Step 11: Commit**

```bash
git add convex/auth.ts convex/auth.config.ts convex/http.ts convex/lib/adminGuard.ts convex/lib/adminGuard.test.ts src/middleware.ts src/app/admin src/components/admin
git commit -m "feat(admin): magic-link auth restricted to the admin email"
```

---

### Task 6: Admin catalog mutations

**Files:**
- Create: `convex/admin/pieces.ts`
- Create: `convex/admin/pieces.test.ts`

**Interfaces:**
- Consumes: `requireAdmin` from `../lib/adminGuard`; validators from `../schema`.
- Produces:
  - `api.admin.pieces.list` — query, no args, returns `Doc<"pieces">[]` (all statuses) sorted by `sortOrder`.
  - `api.admin.pieces.create` — mutation, args `{ title, slug, description, size, collection, mode, priceCents, stock, releaseAt, leadTimeWeeks, shippingTier }`, returns `Id<"pieces">`. Creates with `status: "draft"`, `images: []`, and `sortOrder` one higher than the current maximum.
  - `api.admin.pieces.update` — mutation, args `{ id }` plus any of the create fields as optionals, returns `null`.
  - `api.admin.pieces.setStatus` — mutation, args `{ id, status }`, returns `null`.
  - `api.admin.pieces.markSold` — mutation, args `{ id }`, returns `null`. Sets `stock: 0`.
  - `api.admin.pieces.reorder` — mutation, args `{ orderedIds: Id<"pieces">[] }`, returns `null`.

- [ ] **Step 1: Write the failing tests**

```ts
// convex/admin/pieces.test.ts
/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import schema from "../schema";
import { api } from "../_generated/api";

const modules = import.meta.glob("../**/*.ts");

const ADMIN = { email: "georgia@example.com" };

// Signs the caller in as an admin user and returns the authenticated handle.
async function asAdmin(t: ReturnType<typeof convexTest>) {
  const userId = await t.run(async (ctx) =>
    ctx.db.insert("users", { email: ADMIN.email }),
  );
  return t.withIdentity({ subject: userId, email: ADMIN.email });
}

const newPieceArgs = {
  title: "Kingfisher Plate",
  slug: "kingfisher-plate",
  description: "A sacred kingfisher.",
  size: '10" plate',
  collection: "wildlife" as const,
  mode: "oneoff" as const,
  priceCents: 18000,
  stock: 1,
  releaseAt: null,
  leadTimeWeeks: null,
  shippingTier: "plate" as const,
};

describe("admin.pieces.create", () => {
  test("creates a piece as a draft", async () => {
    process.env.ADMIN_EMAIL = ADMIN.email;
    const t = convexTest(schema, modules);
    const admin = await asAdmin(t);

    const id = await admin.mutation(api.admin.pieces.create, newPieceArgs);
    const piece = await t.run(async (ctx) => ctx.db.get("pieces", id));

    expect(piece?.status).toBe("draft");
    expect(piece?.images).toEqual([]);
    expect(piece?.sortOrder).toBe(0);
  });

  test("assigns increasing sortOrder", async () => {
    process.env.ADMIN_EMAIL = ADMIN.email;
    const t = convexTest(schema, modules);
    const admin = await asAdmin(t);

    await admin.mutation(api.admin.pieces.create, newPieceArgs);
    const second = await admin.mutation(api.admin.pieces.create, {
      ...newPieceArgs,
      slug: "owl-plate",
    });

    const piece = await t.run(async (ctx) => ctx.db.get(second));
    expect(piece?.sortOrder).toBe(1);
  });

  test("rejects a duplicate slug", async () => {
    process.env.ADMIN_EMAIL = ADMIN.email;
    const t = convexTest(schema, modules);
    const admin = await asAdmin(t);

    await admin.mutation(api.admin.pieces.create, newPieceArgs);
    await expect(
      admin.mutation(api.admin.pieces.create, newPieceArgs),
    ).rejects.toThrow("slug");
  });

  test("rejects a non-admin caller", async () => {
    process.env.ADMIN_EMAIL = ADMIN.email;
    const t = convexTest(schema, modules);
    const userId = await t.run(async (ctx) =>
      ctx.db.insert("users", { email: "stranger@example.com" }),
    );
    const stranger = t.withIdentity({
      subject: userId,
      email: "stranger@example.com",
    });

    await expect(
      stranger.mutation(api.admin.pieces.create, newPieceArgs),
    ).rejects.toThrow("Not authorised");
  });
});

describe("admin.pieces.setStatus", () => {
  test("publishes a draft", async () => {
    process.env.ADMIN_EMAIL = ADMIN.email;
    const t = convexTest(schema, modules);
    const admin = await asAdmin(t);

    const id = await admin.mutation(api.admin.pieces.create, newPieceArgs);
    await admin.mutation(api.admin.pieces.setStatus, {
      id,
      status: "published",
    });

    const pieces = await t.query(api.pieces.listPublished, { now: NOW });
    expect(pieces).toHaveLength(1);
  });
});

describe("admin.pieces.markSold", () => {
  test("a manually sold piece disappears from the public list", async () => {
    process.env.ADMIN_EMAIL = ADMIN.email;
    const t = convexTest(schema, modules);
    const admin = await asAdmin(t);

    const id = await admin.mutation(api.admin.pieces.create, newPieceArgs);
    await admin.mutation(api.admin.pieces.setStatus, {
      id,
      status: "published",
    });
    await admin.mutation(api.admin.pieces.markSold, { id });

    const pieces = await t.query(api.pieces.listPublished, { now: NOW });
    expect(pieces[0].availability).toEqual({ state: "sold" });
  });
});

describe("admin.pieces.reorder", () => {
  test("rewrites sortOrder to match the given order", async () => {
    process.env.ADMIN_EMAIL = ADMIN.email;
    const t = convexTest(schema, modules);
    const admin = await asAdmin(t);

    const first = await admin.mutation(api.admin.pieces.create, newPieceArgs);
    const second = await admin.mutation(api.admin.pieces.create, {
      ...newPieceArgs,
      slug: "owl-plate",
      title: "Owl Plate",
    });

    await admin.mutation(api.admin.pieces.reorder, {
      orderedIds: [second, first],
    });

    const all = await admin.query(api.admin.pieces.list, {});
    expect(all.map((p) => p.title)).toEqual(["Owl Plate", "Kingfisher Plate"]);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- admin`
Expected: FAIL — `api.admin.pieces` does not exist.

- [ ] **Step 3: Write the implementation**

```ts
// convex/admin/pieces.ts
import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import type { MutationCtx } from "../_generated/server";
import { requireAdmin } from "../lib/adminGuard";
import {
  pieceCollection,
  pieceMode,
  pieceStatus,
  shippingTier,
} from "../schema";

/** Convex forbids unbounded .collect(); the catalog is far below this. */
const MAX_PIECES = 500;

const editableFields = {
  title: v.string(),
  slug: v.string(),
  description: v.string(),
  size: v.union(v.string(), v.null()),
  collection: pieceCollection,
  mode: pieceMode,
  priceCents: v.number(),
  stock: v.union(v.number(), v.null()),
  releaseAt: v.union(v.number(), v.null()),
  leadTimeWeeks: v.union(v.number(), v.null()),
  shippingTier,
};

async function assertSlugFree(
  ctx: MutationCtx,
  slug: string,
  ignoreId?: string,
) {
  const existing = await ctx.db
    .query("pieces")
    .withIndex("by_slug", (q) => q.eq("slug", slug))
    .unique();

  if (existing && existing._id !== ignoreId) {
    throw new Error(`A piece with the slug "${slug}" already exists`);
  }
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const pieces = await ctx.db
      .query("pieces")
      .withIndex("by_status_and_sortOrder")
      .take(MAX_PIECES);
    return pieces.sort((a, b) => a.sortOrder - b.sortOrder);
  },
});

export const create = mutation({
  args: editableFields,
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await assertSlugFree(ctx, args.slug);

    const existing = await ctx.db.query("pieces").take(MAX_PIECES);
    const sortOrder =
      existing.length === 0
        ? 0
        : Math.max(...existing.map((p) => p.sortOrder)) + 1;

    return ctx.db.insert("pieces", {
      ...args,
      images: [],
      status: "draft",
      sortOrder,
    });
  },
});

export const update = mutation({
  // Derived from editableFields rather than retyped — Convex object validators
  // compose, and a hand-copied list drifts the moment a field is added.
  args: {
    id: v.id("pieces"),
    ...v.object(editableFields).partial().fields,
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const { id, ...patch } = args;
    if (patch.slug !== undefined) await assertSlugFree(ctx, patch.slug, id);
    await ctx.db.patch("pieces", id, patch);
    return null;
  },
});

export const setStatus = mutation({
  args: { id: v.id("pieces"), status: pieceStatus },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.patch("pieces", args.id, { status: args.status });
    return null;
  },
});

/**
 * For pieces sold in person at a market. Sets stock to zero so the derived
 * availability reports "sold" without touching the editorial status.
 */
export const markSold = mutation({
  args: { id: v.id("pieces") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.patch("pieces", args.id, { stock: 0 });
    return null;
  },
});

export const reorder = mutation({
  args: { orderedIds: v.array(v.id("pieces")) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await Promise.all(
      args.orderedIds.map((id, index) =>
        ctx.db.patch("pieces", id, { sortOrder: index }),
      ),
    );
    return null;
  },
});
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- admin`
Expected: PASS. The `adminGuard.test.ts` case from Task 5 now also passes.

- [ ] **Step 5: Run the whole suite**

Run: `npm test`
Expected: PASS, all tests green.

- [ ] **Step 6: Commit**

```bash
git add convex/admin/pieces.ts convex/admin/pieces.test.ts
git commit -m "feat(admin): catalog mutations with slug uniqueness and admin guard"
```

---

### Task 7: Photo uploads

**Files:**
- Create: `convex/admin/uploads.ts`
- Create: `src/components/admin/photo-upload.tsx`

**Interfaces:**
- Consumes: `requireAdmin` from `../lib/adminGuard`.
- Produces:
  - `api.admin.uploads.generateUploadUrl` — mutation, no args, returns `string`.
  - `api.admin.uploads.attachImage` — mutation, args `{ pieceId: Id<"pieces">, storageId: Id<"_storage"> }`, returns `null`. Appends to `images`.
  - `api.admin.uploads.removeImage` — mutation, args `{ pieceId: Id<"pieces">, storageId: Id<"_storage"> }`, returns `null`. Removes from `images` and deletes the stored file.
  - `<PhotoUpload pieceId={...} imageUrls={...} />` React component.

- [ ] **Step 1: Write the upload mutations**

```ts
// convex/admin/uploads.ts
import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { requireAdmin } from "../lib/adminGuard";

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return ctx.storage.generateUploadUrl();
  },
});

export const attachImage = mutation({
  args: { pieceId: v.id("pieces"), storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const piece = await ctx.db.get("pieces", args.pieceId);
    if (!piece) throw new Error("Piece not found");
    await ctx.db.patch("pieces", args.pieceId, {
      images: [...piece.images, args.storageId],
    });
    return null;
  },
});

export const removeImage = mutation({
  args: { pieceId: v.id("pieces"), storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const piece = await ctx.db.get("pieces", args.pieceId);
    if (!piece) throw new Error("Piece not found");
    await ctx.db.patch("pieces", args.pieceId, {
      images: piece.images.filter((id) => id !== args.storageId),
    });
    await ctx.storage.delete(args.storageId);
    return null;
  },
});
```

- [ ] **Step 2: Write the upload component**

```tsx
// src/components/admin/photo-upload.tsx
"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Button } from "@/components/ui/button";

export function PhotoUpload({
  pieceId,
  imageUrls,
}: {
  pieceId: Id<"pieces">;
  imageUrls: string[];
}) {
  const generateUploadUrl = useMutation(api.admin.uploads.generateUploadUrl);
  const attachImage = useMutation(api.admin.uploads.attachImage);
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File) {
    setUploading(true);
    try {
      const uploadUrl = await generateUploadUrl();
      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!response.ok) throw new Error("Upload failed");
      const { storageId } = (await response.json()) as {
        storageId: Id<"_storage">;
      };
      await attachImage({ pieceId, storageId });
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-3">
        {imageUrls.map((url) => (
          <div
            key={url}
            className="relative h-24 w-24 overflow-hidden rounded-lg border border-border"
          >
            <Image src={url} alt="" fill sizes="96px" className="object-cover" />
          </div>
        ))}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />
      <Button
        type="button"
        variant="outline"
        className="w-fit rounded-full"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? "Uploading…" : "Add photo"}
      </Button>
    </div>
  );
}
```

- [ ] **Step 3: Verify manually**

Run: `npm run dev`. Sign in at `/admin`. There is no form yet (Task 9), so
verify by creating a piece from the Convex dashboard function runner, then
temporarily rendering `<PhotoUpload>` on `/admin` with that id. Upload a JPEG
and confirm it appears, then confirm the file exists under Files in the Convex
dashboard.

- [ ] **Step 4: Commit**

```bash
git add convex/admin/uploads.ts src/components/admin/photo-upload.tsx
git commit -m "feat(admin): photo upload to Convex file storage"
```

---

### Task 8: Admin pieces list

**Files:**
- Modify: `src/app/admin/page.tsx` (replace the Task 5 placeholder)
- Create: `src/components/admin/pieces-table.tsx`

**Interfaces:**
- Consumes: `api.admin.pieces.list`, `api.admin.pieces.setStatus`, `api.admin.pieces.markSold`.
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Write the table component**

```tsx
// src/components/admin/pieces-table.tsx
"use client";

import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Button } from "@/components/ui/button";

const money = (cents: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);

export function PiecesTable() {
  const pieces = useQuery(api.admin.pieces.list);
  const setStatus = useMutation(api.admin.pieces.setStatus);
  const markSold = useMutation(api.admin.pieces.markSold);

  if (pieces === undefined) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  if (pieces.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-8 text-center">
        <p className="text-sm text-muted-foreground">
          No pieces yet. Add your first one to get started.
        </p>
        <Button asChild className="mt-4 rounded-full">
          <Link href="/admin/pieces/new">Add a piece</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button asChild className="rounded-full">
          <Link href="/admin/pieces/new">Add a piece</Link>
        </Button>
      </div>

      <ul className="divide-y divide-border rounded-2xl border border-border">
        {pieces.map((piece) => (
          <li
            key={piece._id}
            className="flex flex-wrap items-center gap-3 p-4"
          >
            <div className="flex-1">
              <Link
                href={`/admin/pieces/${piece._id}`}
                className="font-display text-lg hover:underline"
              >
                {piece.title}
              </Link>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                {piece.status} · {piece.mode} · {money(piece.priceCents)}
                {piece.stock !== null && ` · stock ${piece.stock}`}
              </p>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="rounded-full"
              onClick={() =>
                setStatus({
                  id: piece._id,
                  status: piece.status === "published" ? "draft" : "published",
                })
              }
            >
              {piece.status === "published" ? "Unpublish" : "Publish"}
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="rounded-full"
              disabled={piece.stock === 0}
              onClick={() => markSold({ id: piece._id })}
            >
              Mark sold
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 2: Render it**

```tsx
// src/app/admin/page.tsx
import { PiecesTable } from "@/components/admin/pieces-table";

export default function AdminHomePage() {
  return <PiecesTable />;
}
```

- [ ] **Step 3: Verify manually**

Run: `npm run dev`, sign in, visit `/admin`.
Expected: the empty state renders. Create a piece via the Convex dashboard and
confirm it appears **without a refresh** — this proves the live subscription
works. Toggle Publish and Mark sold and confirm the row updates instantly.

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/page.tsx src/components/admin/pieces-table.tsx
git commit -m "feat(admin): pieces list with publish and mark-sold controls"
```

---

### Task 9: Admin piece form

**Files:**
- Create: `src/components/admin/piece-form.tsx`
- Create: `src/app/admin/pieces/new/page.tsx`
- Create: `src/app/admin/pieces/[id]/page.tsx`
- Create: `src/lib/slug.ts`
- Create: `src/lib/slug.test.ts`

**Interfaces:**
- Consumes: `api.admin.pieces.create`, `api.admin.pieces.update`, `api.admin.pieces.list`, `PhotoUpload` from Task 7.
- Produces: `slugify(input: string): string` from `src/lib/slug.ts`.

> **Next 16:** `params` is a `Promise`. `src/app/admin/pieces/[id]/page.tsx`
> must `await props.params`.

- [ ] **Step 1: Write the failing slug tests**

```ts
// src/lib/slug.test.ts
import { describe, expect, test } from "vitest";
import { slugify } from "./slug";

describe("slugify", () => {
  test("lowercases and hyphenates", () => {
    expect(slugify("Kingfisher Plate")).toBe("kingfisher-plate");
  });

  test("strips punctuation", () => {
    expect(slugify('Sardine Fish Platter — 14"')).toBe(
      "sardine-fish-platter-14",
    );
  });

  test("collapses repeated separators", () => {
    expect(slugify("Owl   //  Plate")).toBe("owl-plate");
  });

  test("trims leading and trailing hyphens", () => {
    expect(slugify("  -Hole in One-  ")).toBe("hole-in-one");
  });

  test("returns an empty string for input with no word characters", () => {
    expect(slugify("!!!")).toBe("");
  });

  test("folds accents rather than splitting on them", () => {
    expect(slugify("Naïve Plate")).toBe("naive-plate");
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test -- slug`
Expected: FAIL — cannot resolve `./slug`.

- [ ] **Step 3: Implement slugify**

```ts
// src/lib/slug.ts

/** Turns a piece title into a URL-safe slug. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    // Drop combining marks left by NFKD, so "naïve" becomes "naive" rather
    // than "nai-ve" once the next rule turns unmatched characters into hyphens.
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test -- slug`
Expected: PASS, 6 tests.

- [ ] **Step 5: Write the form**

The `mode` select drives which fields appear: made-to-order asks for lead time,
a drop asks for release date and stock, a one-off asks for neither.

```tsx
// src/components/admin/piece-form.tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import { api } from "@convex/_generated/api";
import type { Doc, Id } from "@convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PhotoUpload } from "@/components/admin/photo-upload";
import { slugify } from "@/lib/slug";

type Mode = "oneoff" | "madeToOrder" | "deposit" | "drop";

const MODE_LABELS: Record<Mode, string> = {
  oneoff: "One-off finished piece",
  madeToOrder: "Made to order",
  deposit: "Commission deposit",
  drop: "Small batch / drop",
};

/** Stock semantics differ per mode; null means unlimited. */
function defaultStockFor(mode: Mode): number | null {
  if (mode === "oneoff") return 1;
  if (mode === "drop") return 6;
  return null; // madeToOrder and deposit are unlimited
}

export function PieceForm({
  piece,
  imageUrls,
}: {
  piece?: Doc<"pieces">;
  imageUrls?: string[];
}) {
  const router = useRouter();
  const create = useMutation(api.admin.pieces.create);
  const update = useMutation(api.admin.pieces.update);

  const [title, setTitle] = useState(piece?.title ?? "");
  const [slug, setSlug] = useState(piece?.slug ?? "");
  const [description, setDescription] = useState(piece?.description ?? "");
  const [size, setSize] = useState(piece?.size ?? "");
  const [collection, setCollection] = useState<"wildlife" | "heirloom">(
    piece?.collection ?? "wildlife",
  );
  const [mode, setMode] = useState<Mode>((piece?.mode as Mode) ?? "oneoff");
  const [price, setPrice] = useState(
    piece ? (piece.priceCents / 100).toFixed(2) : "",
  );
  const [stock, setStock] = useState(
    piece?.stock !== undefined && piece.stock !== null
      ? String(piece.stock)
      : "",
  );
  const [releaseAt, setReleaseAt] = useState(
    piece?.releaseAt ? new Date(piece.releaseAt).toISOString().slice(0, 16) : "",
  );
  const [leadTimeWeeks, setLeadTimeWeeks] = useState(
    piece?.leadTimeWeeks !== undefined && piece.leadTimeWeeks !== null
      ? String(piece.leadTimeWeeks)
      : "",
  );
  const [shippingTier, setShippingTier] = useState<"plate" | "platter">(
    piece?.shippingTier ?? "plate",
  );
  const [saving, setSaving] = useState(false);

  function changeMode(next: Mode) {
    setMode(next);
    const fallback = defaultStockFor(next);
    setStock(fallback === null ? "" : String(fallback));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);

    const fields = {
      title: title.trim(),
      slug: (slug.trim() || slugify(title)).trim(),
      description: description.trim(),
      size: size.trim() === "" ? null : size.trim(),
      collection,
      mode,
      priceCents: Math.round(Number(price) * 100),
      stock: mode === "madeToOrder" || mode === "deposit"
        ? null
        : Number(stock || 0),
      releaseAt:
        mode === "drop" && releaseAt !== ""
          ? new Date(releaseAt).getTime()
          : null,
      leadTimeWeeks:
        mode === "madeToOrder" && leadTimeWeeks !== ""
          ? Number(leadTimeWeeks)
          : null,
      shippingTier,
    };

    try {
      if (piece) {
        await update({ id: piece._id, ...fields });
        toast.success("Saved");
      } else {
        await create(fields);
        toast.success("Piece created as a draft");
      }
      router.push("/admin");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="flex max-w-xl flex-col gap-5" onSubmit={handleSubmit}>
      <div className="flex flex-col gap-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          value={title}
          required
          onChange={(event) => {
            setTitle(event.target.value);
            if (!piece) setSlug(slugify(event.target.value));
          }}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="slug">URL slug</Label>
        <Input
          id="slug"
          value={slug}
          required
          onChange={(event) => setSlug(event.target.value)}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          rows={4}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="mode">Sale type</Label>
        <select
          id="mode"
          className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
          value={mode}
          onChange={(event) => changeMode(event.target.value as Mode)}
        >
          {Object.entries(MODE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="collection">Collection</Label>
        <select
          id="collection"
          className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
          value={collection}
          onChange={(event) =>
            setCollection(event.target.value as "wildlife" | "heirloom")
          }
        >
          <option value="wildlife">Wildlife</option>
          <option value="heirloom">Heirloom</option>
        </select>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="price">Price (USD)</Label>
        <Input
          id="price"
          type="number"
          step="0.01"
          min="0"
          required
          value={price}
          onChange={(event) => setPrice(event.target.value)}
        />
      </div>

      {(mode === "oneoff" || mode === "drop") && (
        <div className="flex flex-col gap-2">
          <Label htmlFor="stock">
            {mode === "oneoff" ? "Stock (one-offs are 1)" : "Batch size"}
          </Label>
          <Input
            id="stock"
            type="number"
            min="0"
            value={stock}
            onChange={(event) => setStock(event.target.value)}
          />
        </div>
      )}

      {mode === "drop" && (
        <div className="flex flex-col gap-2">
          <Label htmlFor="releaseAt">Release date and time</Label>
          <Input
            id="releaseAt"
            type="datetime-local"
            value={releaseAt}
            onChange={(event) => setReleaseAt(event.target.value)}
          />
        </div>
      )}

      {mode === "madeToOrder" && (
        <div className="flex flex-col gap-2">
          <Label htmlFor="leadTimeWeeks">Lead time (weeks)</Label>
          <Input
            id="leadTimeWeeks"
            type="number"
            min="0"
            value={leadTimeWeeks}
            onChange={(event) => setLeadTimeWeeks(event.target.value)}
          />
        </div>
      )}

      <div className="flex flex-col gap-2">
        <Label htmlFor="size">Size</Label>
        <Input
          id="size"
          placeholder='e.g. 14" platter'
          value={size}
          onChange={(event) => setSize(event.target.value)}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="shippingTier">Shipping tier</Label>
        <select
          id="shippingTier"
          className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
          value={shippingTier}
          onChange={(event) =>
            setShippingTier(event.target.value as "plate" | "platter")
          }
        >
          <option value="plate">Plate</option>
          <option value="platter">Platter (larger)</option>
        </select>
      </div>

      {piece && (
        <div className="flex flex-col gap-2">
          <Label>Photos</Label>
          <PhotoUpload pieceId={piece._id} imageUrls={imageUrls ?? []} />
        </div>
      )}

      <div className="flex gap-3">
        <Button type="submit" disabled={saving} className="rounded-full">
          {saving ? "Saving…" : piece ? "Save changes" : "Create piece"}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="rounded-full"
          onClick={() => router.push("/admin")}
        >
          Cancel
        </Button>
      </div>

      {!piece && (
        <p className="text-xs text-muted-foreground">
          Photos can be added once the piece is created.
        </p>
      )}
    </form>
  );
}
```

- [ ] **Step 6: Add the new-piece page**

```tsx
// src/app/admin/pieces/new/page.tsx
import { PieceForm } from "@/components/admin/piece-form";

export default function NewPiecePage() {
  return <PieceForm />;
}
```

- [ ] **Step 7: Add the edit page**

`params` is a Promise in Next 16 — this must be awaited.

```tsx
// src/app/admin/pieces/[id]/page.tsx
import { EditPiece } from "@/components/admin/edit-piece";

export default async function EditPiecePage(
  props: PageProps<"/admin/pieces/[id]">,
) {
  const { id } = await props.params;
  return <EditPiece id={id} />;
}
```

```tsx
// src/components/admin/edit-piece.tsx
"use client";

import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { PieceForm } from "@/components/admin/piece-form";

export function EditPiece({ id }: { id: string }) {
  const pieces = useQuery(api.admin.pieces.list);
  if (pieces === undefined) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  const piece = pieces.find((p) => p._id === (id as Id<"pieces">));
  if (!piece) {
    return <p className="text-sm text-muted-foreground">Piece not found.</p>;
  }

  return <PieceForm piece={piece} imageUrls={[]} />;
}
```

> **Known limitation, resolved in Plan 2:** `api.admin.pieces.list` returns raw
> documents with `images` as storage ids, not URLs, so the edit page passes
> `imageUrls={[]}` and uploaded photos are not previewed back. Plan 2 adds an
> `api.admin.pieces.get` query that resolves URLs. Do not paper over this by
> calling `ctx.storage.getUrl` from the client — it is a server-side API.

- [ ] **Step 8: Generate route types and typecheck**

```bash
npx next typegen
npx tsc --noEmit
```

Expected: no errors. `PageProps<"/admin/pieces/[id]">` is provided globally by
`next typegen`.

- [ ] **Step 9: Verify manually, end to end**

Run: `npm run dev`, sign in at `/admin`.
1. Click **Add a piece**, fill in a one-off, save. Confirm it lands as a draft.
2. Open it, upload a photo, confirm the thumbnail appears.
3. Switch the sale type to **Small batch / drop** — confirm batch size and
   release date appear, and lead time does not.
4. Switch to **Made to order** — confirm lead time appears and stock disappears.
5. Publish it from the list.
6. **Load `/` and confirm the public homepage is completely unchanged.**

- [ ] **Step 10: Run the full suite and build**

```bash
npm test
npm run build
```

Expected: all tests pass; build succeeds.

- [ ] **Step 11: Commit**

```bash
git add src/lib/slug.ts src/lib/slug.test.ts src/components/admin src/app/admin
git commit -m "feat(admin): piece create and edit form with mode-driven fields"
```

---

## Done when

- Georgia can sign in at `/admin` with a magic link, and nobody else can.
- She can create, edit, photograph, reorder, publish, unpublish, and manually
  mark sold — all four sale modes.
- `npm test` passes; `npm run build` succeeds.
- The public site is byte-for-byte unchanged: no shop link, no Convex data on
  screen, homepage still rendering from `site.ts` and `/public`.

## Deliberately not in this plan

Plan 2 (`public shop + Stripe checkout`) covers: `/shop` and `/shop/[slug]`,
`preloadQuery`/`usePreloadedQuery` rendering, the `reservePiece` mutation,
Stripe Checkout Sessions, the webhook, the hold-expiry cron, the orders admin
screen with the fulfilled toggle, `Product` JSON-LD, and sitemap entries.
