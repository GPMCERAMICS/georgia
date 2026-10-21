/**
 * How long a checkout holds its pieces before they go back on sale.
 *
 * Stripe will not let a Checkout Session expire sooner than 30 minutes after
 * creation, so the session is given that minimum and then expired early by a
 * scheduled action at the hold deadline (see `checkout.releaseCheckout`).
 *
 * Lives on its own so the storefront can quote it without pulling server code
 * into the client bundle.
 */
export const HOLD_MINUTES = 10;
export const HOLD_MS = HOLD_MINUTES * 60_000;

/** Stripe's floor for `expires_at`, plus a minute of slack for clock skew. */
export const STRIPE_SESSION_MS = 31 * 60_000;
