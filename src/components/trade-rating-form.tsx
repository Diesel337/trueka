"use client";

import { CheckCircle2, Star } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useMemo, useState } from "react";

import { rateTradeRequestAction } from "@/app/actions";
import { initialActionState } from "@/lib/action-state";
import { getReviewTagLabel, reviewTagOptions } from "@/lib/review-tags";
import type { TradeRating } from "@/lib/types";

type TradeRatingFormProps = {
  tradeRequestId: string;
  reviewedUserId: string;
  reviewedUserName: string;
  existingRating?: TradeRating | null;
};

const ratingCriteria = [
  {
    name: "itemDescriptionRating",
    label: "Descripción del artículo",
    description: "Fotos, defectos y detalles coincidieron con lo publicado.",
  },
  {
    name: "communicationRating",
    label: "Comunicación clara",
    description: "Respondió con claridad y ayudó a acordar detalles.",
  },
  {
    name: "fairExchangeRating",
    label: "Intercambio justo",
    description: "La propuesta se sintió equilibrada para ambas personas.",
  },
  {
    name: "reliabilityRating",
    label: "Cumplimiento",
    description: "La persona cumplió lo acordado para cerrar el trueque.",
  },
] as const;

type RatingCriterionName = (typeof ratingCriteria)[number]["name"];
type RatingState = Record<RatingCriterionName, number>;

export function TradeRatingForm({
  tradeRequestId,
  reviewedUserId,
  reviewedUserName,
  existingRating,
}: TradeRatingFormProps) {
  const router = useRouter();
  const [ratings, setRatings] = useState<RatingState>(() => ({
    itemDescriptionRating: existingRating?.itemDescriptionRating ?? existingRating?.rating ?? 5,
    communicationRating: existingRating?.communicationRating ?? existingRating?.rating ?? 5,
    fairExchangeRating: existingRating?.fairExchangeRating ?? existingRating?.rating ?? 5,
    reliabilityRating: existingRating?.reliabilityRating ?? existingRating?.rating ?? 5,
  }));
  const [state, action, pending] = useActionState(rateTradeRequestAction, initialActionState);
  const overallRating = useMemo(() => getOverallRating(ratings), [ratings]);

  useEffect(() => {
    if (state.ok) {
      router.refresh();
    }
  }, [router, state.ok]);

  if (existingRating) {
    const visibleTags = existingRating.reviewTags.length > 0
      ? existingRating.reviewTags
      : [
          existingRating.itemMatchedDescription ? "articulo_como_descrito" : "",
          existingRating.userWasReliable ? "recomendado" : "",
        ].filter(Boolean);

    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-5">
        <p className="text-sm font-semibold text-emerald-950">Ya calificaste este trueque</p>
        <div className="mt-3 flex items-center gap-3">
          <Stars value={existingRating.rating} />
          <span className="text-sm font-semibold text-emerald-950">
            {existingRating.rating}/5 promedio
          </span>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {ratingCriteria.map((criterion) => (
            <RatingPill
              key={criterion.name}
              label={criterion.label}
              value={existingRating[criterion.name] ?? existingRating.rating}
            />
          ))}
        </div>
        {visibleTags.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {visibleTags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 rounded-md bg-white px-2.5 py-1 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-100"
              >
                <CheckCircle2 aria-hidden="true" size={14} />
                {getReviewTagLabel(tag)}
              </span>
            ))}
          </div>
        ) : null}
        {existingRating.comment ? (
          <p className="mt-3 text-sm leading-6 text-emerald-950">{existingRating.comment}</p>
        ) : null}
      </div>
    );
  }

  return (
    <form action={action} className="grid gap-5 rounded-lg border border-stone-200 bg-white p-5">
      <div>
        <p className="text-sm font-semibold text-stone-950">Calificar a {reviewedUserName}</p>
        <p className="mt-1 text-sm leading-6 text-stone-600">
          Tu reseña ayuda a que otras personas sepan si el artículo fue claro, la comunicación fue
          buena y el intercambio se cerró de forma confiable.
        </p>
      </div>

      <input type="hidden" name="tradeRequestId" value={tradeRequestId} />
      <input type="hidden" name="reviewedUserId" value={reviewedUserId} />
      {ratingCriteria.map((criterion) => (
        <input
          key={criterion.name}
          type="hidden"
          name={criterion.name}
          value={ratings[criterion.name]}
        />
      ))}

      <div className="rounded-md bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">
        Promedio: {overallRating}/5
      </div>

      <div className="grid gap-3">
        {ratingCriteria.map((criterion) => (
          <div
            key={criterion.name}
            className="grid gap-3 rounded-md border border-stone-200 p-3 sm:grid-cols-[1fr_auto] sm:items-center"
          >
            <div>
              <p className="text-sm font-semibold text-stone-950">{criterion.label}</p>
              <p className="mt-1 text-sm leading-5 text-stone-500">{criterion.description}</p>
            </div>
            <StarPicker
              value={ratings[criterion.name]}
              label={criterion.label}
              onChange={(value) => setRatings((current) => ({
                ...current,
                [criterion.name]: value,
              }))}
            />
          </div>
        ))}
      </div>

      <fieldset className="grid gap-3">
        <legend className="text-sm font-semibold text-stone-950">
          Elige señales positivas
        </legend>
        <p className="text-sm leading-6 text-stone-600">
          Son públicas en el perfil y ayudan a reconocer buenas formas de negociar. Usa hasta 6.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {reviewTagOptions.map((tag) => (
            <label
              key={tag.slug}
              className="flex items-start gap-2 rounded-md border border-stone-200 p-3 text-sm font-semibold text-stone-700"
            >
              <input
                type="checkbox"
                name="reviewTags"
                value={tag.slug}
                className="mt-1 accent-emerald-700"
              />
              {tag.label}
            </label>
          ))}
        </div>
      </fieldset>

      <label className="grid gap-2 text-sm font-semibold text-stone-700">
        Comentario opcional
        <textarea
          name="comment"
          rows={3}
          maxLength={600}
          placeholder="Ej. Todo claro, el artículo estaba como se describió. Evita datos personales o ataques."
          className="rounded-md border border-stone-200 px-3 py-3 text-sm font-normal outline-none focus:border-emerald-600"
        />
      </label>

      <button
        disabled={pending}
        className="rounded-md bg-emerald-700 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-800 disabled:bg-stone-300 disabled:text-stone-600"
      >
        {pending ? "Guardando..." : "Guardar reseña"}
      </button>

      {state.message ? (
        <p className={`rounded-md p-3 text-sm ${state.ok ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900"}`}>
          {state.message}
        </p>
      ) : null}
    </form>
  );
}

function StarPicker({
  value,
  label,
  onChange,
}: {
  value: number;
  label: string;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex gap-2" aria-label={label}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          aria-label={`${label}: ${star} de 5`}
          aria-pressed={value === star}
          onClick={() => onChange(star)}
          className={`grid size-10 place-items-center rounded-md border transition ${
            star <= value
              ? "border-amber-200 bg-amber-50 text-amber-600"
              : "border-stone-200 bg-white text-stone-400 hover:bg-stone-50"
          }`}
        >
          <Star aria-hidden="true" size={18} fill={star <= value ? "currentColor" : "none"} />
        </button>
      ))}
    </div>
  );
}

function Stars({ value }: { value: number }) {
  return (
    <div className="flex gap-0.5 text-amber-600" aria-label={`${value} de 5`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          aria-hidden="true"
          size={16}
          fill={star <= value ? "currentColor" : "none"}
        />
      ))}
    </div>
  );
}

function RatingPill({ label, value }: { label: string; value: number }) {
  return (
    <span className="inline-flex items-center justify-between gap-2 rounded-md bg-white px-2.5 py-1 text-xs font-semibold text-stone-700 ring-1 ring-emerald-100">
      {label}
      <span className="text-amber-700">{value}/5</span>
    </span>
  );
}

function getOverallRating(ratings: RatingState) {
  return Math.round((
    ratings.itemDescriptionRating
    + ratings.communicationRating
    + ratings.fairExchangeRating
    + ratings.reliabilityRating
  ) / ratingCriteria.length);
}
