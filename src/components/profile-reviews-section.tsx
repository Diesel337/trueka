import { CheckCircle2, Star } from "lucide-react";

import { UserAvatar } from "@/components/user-avatar";
import { getReviewTagLabel } from "@/lib/review-tags";
import type { ProfileReview } from "@/lib/types";

export function ProfileReviewsSection({
  reviews,
  title = "Reseñas recientes",
  description = "Comentarios de trueques que ambas personas marcaron como realizados.",
  emptyMessage = "Todavía no hay reseñas públicas de trueques completados.",
  className = "",
}: {
  reviews: ProfileReview[];
  title?: string;
  description?: string;
  emptyMessage?: string;
  className?: string;
}) {
  const topTags = getTopReviewTags(reviews);

  return (
    <section className={className}>
      <div>
        <h2 className="text-2xl font-semibold text-stone-950">{title}</h2>
        <p className="mt-2 text-stone-600">{description}</p>
      </div>

      {reviews.length > 0 ? (
        <>
          {topTags.length > 0 ? (
            <div className="mt-5 rounded-lg border border-emerald-100 bg-emerald-50 p-4">
              <p className="text-sm font-semibold text-emerald-950">Señales más repetidas</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {topTags.map((tag) => (
                  <span
                    key={tag.slug}
                    className="rounded-md bg-white px-2.5 py-1 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-100"
                  >
                    {getReviewTagLabel(tag.slug)} · {tag.count}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {reviews.map((review) => {
              const criteria = getReviewCriteria(review);
              const visibleTags = review.reviewTags.length > 0
                ? review.reviewTags
                : [
                    review.itemMatchedDescription ? "articulo_como_descrito" : "",
                    review.userWasReliable ? "recomendado" : "",
                  ].filter(Boolean);

              return (
                <article key={review.id} className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <UserAvatar src={review.reviewerAvatarUrl} alt={review.reviewerName} size={40} />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-stone-950">{review.reviewerName}</p>
                        <p className="text-xs text-stone-500">
                          {new Date(review.createdAt).toLocaleDateString("es-MX")}
                        </p>
                      </div>
                    </div>
                    <Stars value={review.rating} />
                  </div>
                  {criteria.length > 0 ? (
                    <div className="mt-4 grid gap-2 text-xs font-semibold text-stone-600 sm:grid-cols-2">
                      {criteria.map((criterion) => (
                        <span
                          key={criterion.label}
                          className="inline-flex items-center justify-between gap-2 rounded-md bg-stone-50 px-2.5 py-1 ring-1 ring-stone-100"
                        >
                          {criterion.label}
                          <span className="text-amber-700">{criterion.value}/5</span>
                        </span>
                      ))}
                    </div>
                  ) : null}
                  {review.comment ? (
                    <p className="mt-4 text-sm leading-6 text-stone-700">{review.comment}</p>
                  ) : null}
                  {visibleTags.length > 0 ? (
                    <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
                      {visibleTags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-emerald-800"
                        >
                          <CheckCircle2 aria-hidden="true" size={14} />
                          {getReviewTagLabel(tag)}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        </>
      ) : (
        <div className="mt-6 rounded-lg border border-dashed border-stone-300 bg-white p-6 text-sm text-stone-600">
          {emptyMessage}
        </div>
      )}
    </section>
  );
}

function getReviewCriteria(review: ProfileReview) {
  return [
    { label: "Descripción", value: review.itemDescriptionRating },
    { label: "Comunicación", value: review.communicationRating },
    { label: "Justicia", value: review.fairExchangeRating },
    { label: "Cumplimiento", value: review.reliabilityRating },
  ].filter((criterion): criterion is { label: string; value: number } => typeof criterion.value === "number");
}

function getTopReviewTags(reviews: ProfileReview[]) {
  const counts = new Map<string, number>();

  reviews.forEach((review) => {
    review.reviewTags.forEach((tag) => {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    });
  });

  return Array.from(counts.entries())
    .map(([slug, count]) => ({ slug, count }))
    .sort((first, second) => second.count - first.count || first.slug.localeCompare(second.slug))
    .slice(0, 5);
}

function Stars({ value }: { value: number }) {
  return (
    <div className="flex gap-0.5 text-amber-600" aria-label={`${value} de 5`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          aria-hidden="true"
          size={15}
          fill={star <= value ? "currentColor" : "none"}
        />
      ))}
    </div>
  );
}
