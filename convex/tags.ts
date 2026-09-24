import { query } from "./_generated/server";

/** Tags are a short curated list; a bound this size is never reached. */
export const MAX_TAGS = 100;

export type PublicTag = {
  slug: string;
  name: string;
  description: string;
  featured: boolean;
};

/** Visible tags in Georgia's order, for the shop filter bar and homepage. */
export const listVisible = query({
  args: {},
  handler: async (ctx): Promise<PublicTag[]> => {
    const tags = await ctx.db
      .query("tags")
      .withIndex("by_sortOrder")
      .order("asc")
      .take(MAX_TAGS);
    return tags
      .filter((tag) => tag.visible)
      .map((tag) => ({
        slug: tag.slug,
        name: tag.name,
        description: tag.description,
        featured: tag.featured,
      }));
  },
});
