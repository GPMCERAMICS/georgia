/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import schema from "../schema";
import { api } from "../_generated/api";

// import.meta.glob("../**/*.ts") from this file also matches its own sibling
// files (convex/admin/*.ts, via "up-to-convex/-then-back-down"), and Vite
// keys those with a "./" prefix (same directory) rather than "../admin/"
// (computed by directory distance, not by the pattern's own "../" text).
// convex-test's module resolver expects one uniform prefix — the one next to
// its "_generated" entry, which is "../" here — so remap the "./" siblings
// to "../admin/" before handing the module map to convexTest.
const rawModules = import.meta.glob("../**/*.ts");
const modules = Object.fromEntries(
  Object.entries(rawModules).map(([path, mod]) => [
    path.startsWith("./") ? `../admin/${path.slice(2)}` : path,
    mod,
  ]),
);

// Time is an argument, never the wall clock — see convex/pieces.ts.
const NOW = 1_800_000_000_000;

const ADMIN = { email: "georgia@example.com" };

// Signs the caller in as an admin user and returns the authenticated handle.
// requireAdmin() resolves the caller via getAuthUserId(ctx), which reads
// identity.subject (splitting on "|", the @convex-dev/auth session divider —
// a bare userId with no divider survives that split unchanged) and then
// looks up that id in the "users" table, comparing its email against
// process.env.ADMIN_EMAIL. So the test must insert a real "users" row and
// set the identity's `subject` to that row's _id for the lookup to resolve.
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

    const piece = await t.run(async (ctx) => ctx.db.get("pieces", second));
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

  // Task 5 Step 5's deferred case: admin.pieces.create didn't exist until this
  // task, so it belongs here rather than in convex/lib/adminGuard.test.ts.
  test("rejects an unauthenticated caller", async () => {
    process.env.ADMIN_EMAIL = ADMIN.email;
    const t = convexTest(schema, modules);

    await expect(
      t.mutation(api.admin.pieces.create, newPieceArgs),
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

  test("rejects a non-admin caller", async () => {
    process.env.ADMIN_EMAIL = ADMIN.email;
    const t = convexTest(schema, modules);
    const admin = await asAdmin(t);
    const id = await admin.mutation(api.admin.pieces.create, newPieceArgs);

    const strangerId = await t.run(async (ctx) =>
      ctx.db.insert("users", { email: "stranger@example.com" }),
    );
    const stranger = t.withIdentity({
      subject: strangerId,
      email: "stranger@example.com",
    });

    await expect(
      stranger.mutation(api.admin.pieces.setStatus, {
        id,
        status: "published",
      }),
    ).rejects.toThrow("Not authorised");
  });
});

describe("admin.pieces.update", () => {
  test("rejects a rename to an existing slug", async () => {
    process.env.ADMIN_EMAIL = ADMIN.email;
    const t = convexTest(schema, modules);
    const admin = await asAdmin(t);

    await admin.mutation(api.admin.pieces.create, newPieceArgs);
    const second = await admin.mutation(api.admin.pieces.create, {
      ...newPieceArgs,
      slug: "owl-plate",
    });

    await expect(
      admin.mutation(api.admin.pieces.update, {
        id: second,
        slug: "kingfisher-plate",
      }),
    ).rejects.toThrow("slug");
  });

  test("allows updating a piece without changing its slug", async () => {
    process.env.ADMIN_EMAIL = ADMIN.email;
    const t = convexTest(schema, modules);
    const admin = await asAdmin(t);

    const id = await admin.mutation(api.admin.pieces.create, newPieceArgs);
    await admin.mutation(api.admin.pieces.update, {
      id,
      title: "Kingfisher Plate (Revised)",
    });

    const piece = await t.run(async (ctx) => ctx.db.get("pieces", id));
    expect(piece?.title).toBe("Kingfisher Plate (Revised)");
    expect(piece?.slug).toBe("kingfisher-plate");
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
