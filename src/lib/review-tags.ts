export const reviewTagOptions = [
  { slug: "amable", label: "Amable" },
  { slug: "buena_comunicacion", label: "Buena comunicación" },
  { slug: "articulo_como_descrito", label: "Artículo como lo describió" },
  { slug: "buen_negociador", label: "Buen negociador" },
  { slug: "intercambio_justo", label: "Intercambio justo" },
  { slug: "puntual", label: "Puntual" },
  { slug: "excelente_negociador", label: "Excelente negociador" },
  { slug: "recomendado", label: "Recomendado" },
] as const;

export type ReviewTagSlug = (typeof reviewTagOptions)[number]["slug"];

export const reviewTagSlugs = reviewTagOptions.map((tag) => tag.slug) as [
  ReviewTagSlug,
  ...ReviewTagSlug[],
];

export const reviewTagLabels = Object.fromEntries(
  reviewTagOptions.map((tag) => [tag.slug, tag.label]),
) as Record<ReviewTagSlug, string>;

export function getReviewTagLabel(slug: string) {
  return reviewTagLabels[slug as ReviewTagSlug] ?? slug;
}
