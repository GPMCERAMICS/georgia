/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin_customers from "../admin/customers.js";
import type * as admin_dashboard from "../admin/dashboard.js";
import type * as admin_inquiries from "../admin/inquiries.js";
import type * as admin_maintenance from "../admin/maintenance.js";
import type * as admin_orders from "../admin/orders.js";
import type * as admin_pieces from "../admin/pieces.js";
import type * as admin_seed from "../admin/seed.js";
import type * as admin_settings from "../admin/settings.js";
import type * as admin_tags from "../admin/tags.js";
import type * as admin_uploads from "../admin/uploads.js";
import type * as auth from "../auth.js";
import type * as checkout from "../checkout.js";
import type * as crons from "../crons.js";
import type * as emails from "../emails.js";
import type * as http from "../http.js";
import type * as inquiries from "../inquiries.js";
import type * as lib_adminEmails from "../lib/adminEmails.js";
import type * as lib_adminGuard from "../lib/adminGuard.js";
import type * as lib_availability from "../lib/availability.js";
import type * as lib_claims from "../lib/claims.js";
import type * as lib_pieceShape from "../lib/pieceShape.js";
import type * as lib_shipping from "../lib/shipping.js";
import type * as orders from "../orders.js";
import type * as pieces from "../pieces.js";
import type * as settings from "../settings.js";
import type * as stripe from "../stripe.js";
import type * as tags from "../tags.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "admin/customers": typeof admin_customers;
  "admin/dashboard": typeof admin_dashboard;
  "admin/inquiries": typeof admin_inquiries;
  "admin/maintenance": typeof admin_maintenance;
  "admin/orders": typeof admin_orders;
  "admin/pieces": typeof admin_pieces;
  "admin/seed": typeof admin_seed;
  "admin/settings": typeof admin_settings;
  "admin/tags": typeof admin_tags;
  "admin/uploads": typeof admin_uploads;
  auth: typeof auth;
  checkout: typeof checkout;
  crons: typeof crons;
  emails: typeof emails;
  http: typeof http;
  inquiries: typeof inquiries;
  "lib/adminEmails": typeof lib_adminEmails;
  "lib/adminGuard": typeof lib_adminGuard;
  "lib/availability": typeof lib_availability;
  "lib/claims": typeof lib_claims;
  "lib/pieceShape": typeof lib_pieceShape;
  "lib/shipping": typeof lib_shipping;
  orders: typeof orders;
  pieces: typeof pieces;
  settings: typeof settings;
  stripe: typeof stripe;
  tags: typeof tags;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
