import { useState } from "react";

/**
 * Holds on to the last loaded value of a query while it reloads.
 *
 * A Convex query whose arguments change (the dashboard's queries take the
 * current minute, so that is once a minute) reports `undefined` until the new
 * result arrives. Rendering a loading state for that instant throws away
 * whatever was on screen — including a form someone is halfway through
 * typing into. This returns the previous value instead, and only ever
 * reports `undefined` before the first result.
 */
export function useSettled<T>(value: T | undefined): T | undefined {
  const [settled, setSettled] = useState(value);
  // Adjusting state during render is React's documented way to derive state
  // from a changing input without an effect.
  if (value !== undefined && value !== settled) setSettled(value);
  return value ?? settled;
}
