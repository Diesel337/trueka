import { CheckCircle2, Star } from "lucide-react";

import { UserAvatar } from "@/components/user-avatar";
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
  return (
    <section className={className}>
      <div>
        <h2 className="text-2xl font-semibold text-stone-950">{title}</h2>
        <p className="mt-2 text-stone-600">{description}</p>
      </div>

      {reviews.length > 0 ? (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {reviews.map((review) => (
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
              {review.comment ? (
                <p className="mt-4 text-sm leading-6 text-stone-700">{review.comment}</p>
              ) : null}
              <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
                {review.itemMatchedDescription ? (
                  <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-emerald-800">
                    <CheckCircle2 aria-hidden="true" size={14} />
                    Artículo coincidía
                  </span>
                ) : null}
                {review.userWasReliable ? (
                  <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-emerald-800">
                    <CheckCircle2 aria-hidden="true" size={14} />
                    Persona confiable
                  </span>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="mt-6 rounded-lg border border-dashed border-stone-300 bg-white p-6 text-sm text-stone-600">
          {emptyMessage}
        </div>
      )}
    </section>
  );
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
