/** Turns a piece title into a URL-safe slug. */
export function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .normalize("NFKD")
      // Drop combining marks left by NFKD, so "naïve" becomes "naive" rather
      // than "nai-ve" once the next rule turns unmatched characters into hyphens.
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
  );
}
