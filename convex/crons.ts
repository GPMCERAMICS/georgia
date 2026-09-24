import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Backstop for a missed `checkout.session.expired` webhook: no abandoned
// checkout can lock a piece up for longer than the hold plus one sweep.
crons.interval(
  "expire stale checkout holds",
  { minutes: 5 },
  internal.orders.expireStaleHolds,
  {},
);

export default crons;
