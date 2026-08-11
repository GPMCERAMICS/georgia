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
