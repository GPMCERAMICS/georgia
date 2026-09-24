import { unstable_rethrow } from "next/navigation";
import { fetchQuery } from "convex/nextjs";
import { api } from "@convex/_generated/api";
import type { PublicTag } from "@convex/tags";

/**
 * Tags for server components. A missing or failing tags query must never
 * take the homepage or shop down with it — the catalog still renders, just
 * without sections and filters — so this degrades to an empty list.
 */
export async function fetchVisibleTags(): Promise<PublicTag[]> {
  try {
    return await fetchQuery(api.tags.listVisible);
  } catch (error) {
    unstable_rethrow(error);
    console.error("tags: could not list visible tags", error);
    return [];
  }
}
