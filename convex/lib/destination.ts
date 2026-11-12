/**
 * Where an order may ship: the 48 contiguous states and DC.
 *
 * A pure module shared by the cart form (to explain a problem as the shopper
 * types) and the reserve mutation (the check that actually counts), so the
 * two can never disagree about an address.
 */

export const CONTIGUOUS_STATES = [
  ["AL", "Alabama"], ["AZ", "Arizona"], ["AR", "Arkansas"], ["CA", "California"],
  ["CO", "Colorado"], ["CT", "Connecticut"], ["DE", "Delaware"],
  ["DC", "District of Columbia"], ["FL", "Florida"], ["GA", "Georgia"],
  ["ID", "Idaho"], ["IL", "Illinois"], ["IN", "Indiana"], ["IA", "Iowa"],
  ["KS", "Kansas"], ["KY", "Kentucky"], ["LA", "Louisiana"], ["ME", "Maine"],
  ["MD", "Maryland"], ["MA", "Massachusetts"], ["MI", "Michigan"],
  ["MN", "Minnesota"], ["MS", "Mississippi"], ["MO", "Missouri"],
  ["MT", "Montana"], ["NE", "Nebraska"], ["NV", "Nevada"], ["NH", "New Hampshire"],
  ["NJ", "New Jersey"], ["NM", "New Mexico"], ["NY", "New York"],
  ["NC", "North Carolina"], ["ND", "North Dakota"], ["OH", "Ohio"],
  ["OK", "Oklahoma"], ["OR", "Oregon"], ["PA", "Pennsylvania"],
  ["RI", "Rhode Island"], ["SC", "South Carolina"], ["SD", "South Dakota"],
  ["TN", "Tennessee"], ["TX", "Texas"], ["UT", "Utah"], ["VT", "Vermont"],
  ["VA", "Virginia"], ["WA", "Washington"], ["WV", "West Virginia"],
  ["WI", "Wisconsin"], ["WY", "Wyoming"],
] as const;

const STATE_CODES = new Set<string>(CONTIGUOUS_STATES.map(([code]) => code));

export const SHIPPING_AREA_MESSAGE =
  "We ship within the continental US only (the lower 48 states and DC).";

/**
 * ZIP codes outside the lower 48, by their first three digits. A state picked
 * from the list above with one of these ZIPs is a mismatch, not a loophole.
 */
function zipIsOutsideLower48(zip: string): boolean {
  const prefix = Number(zip.slice(0, 3));
  return (
    (prefix >= 6 && prefix <= 9) || // Puerto Rico, US Virgin Islands
    (prefix >= 90 && prefix <= 98) || // military mail, Europe
    prefix === 340 || // military mail, Americas
    (prefix >= 962 && prefix <= 966) || // military mail, Pacific
    prefix === 967 || prefix === 968 || // Hawaii
    prefix === 969 || // Guam and Pacific territories
    (prefix >= 995 && prefix <= 999) // Alaska
  );
}

export type ShipTo = {
  name: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  postalCode: string;
};

/**
 * Returns the address tidied up, or the reason it cannot be shipped to.
 * Callers show `error` to the shopper as-is.
 */
export function checkShipTo(
  input: ShipTo,
): { ok: true; shipTo: ShipTo } | { ok: false; error: string } {
  const name = input.name.trim();
  const line1 = input.line1.trim();
  const line2 = input.line2?.trim() || null;
  const city = input.city.trim();
  const state = input.state.trim().toUpperCase();
  const postalCode = input.postalCode.trim();

  if (!name) return { ok: false, error: "Enter the name the package is going to." };
  if (!line1) return { ok: false, error: "Enter a street address." };
  if (!city) return { ok: false, error: "Enter a city." };
  if (!state) return { ok: false, error: "Choose a state." };
  if (!STATE_CODES.has(state)) return { ok: false, error: SHIPPING_AREA_MESSAGE };
  if (!/^\d{5}(-\d{4})?$/.test(postalCode)) {
    return { ok: false, error: "Enter a 5-digit ZIP code." };
  }
  if (zipIsOutsideLower48(postalCode)) return { ok: false, error: SHIPPING_AREA_MESSAGE };
  if ([name, line1, line2 ?? "", city].some((field) => field.length > 200)) {
    return { ok: false, error: "That address is too long. Please shorten it." };
  }

  return { ok: true, shipTo: { name, line1, line2, city, state, postalCode } };
}
