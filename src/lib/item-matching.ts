import type { Item, Tag } from "./types";

export function getViewerInterestSlugs(items: Item[], profileInterestTags: Tag[] = []) {
  const slugs = new Set<string>();

  for (const tag of profileInterestTags) {
    if (tag.slug) {
      slugs.add(tag.slug);
    }
  }

  for (const item of items) {
    if (item.category.slug) {
      slugs.add(item.category.slug);
    }

    for (const tag of item.publicTags) {
      if (tag.slug) {
        slugs.add(tag.slug);
      }
    }

    for (const tag of item.privateInterestTags ?? []) {
      if (tag.slug) {
        slugs.add(tag.slug);
      }
    }
  }

  return [...slugs];
}

export function hasInterestOverlap(item: Item, viewerInterestSlugs: string[]) {
  const itemSlugs = new Set([
    item.category.slug,
    ...item.publicTags.map((tag) => tag.slug),
  ]);

  return viewerInterestSlugs.some((slug) => itemSlugs.has(slug));
}
