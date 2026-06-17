"use client";

import { Star } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";

import { rateTradeRequestAction } from "@/app/actions";
import { initialActionState } from "@/lib/action-state";
import type { TradeRating } from "@/lib/types";

type TradeRatingFormProps = {
  tradeRequestId: string;
  reviewedUserId: string;
  reviewedUserName: string;
  existingRating?: TradeRating | null;
};

export function TradeRatingForm({
  tradeRequestId,
  reviewedUserId,
  reviewedUserName,
  existingRating,
}: TradeRatingFormProps) {
  const router = useRouter();
  const [rating, setRating] = useState(existingRating?.rating ?? 5);
  const [state, action, pending] = useActionState(rateTradeRequestAction, initialActionState);

  useEffect(() => {
    if (state.ok) {
      router.refresh();
    }
  }, [router, state.ok]);

  if (existingRating) {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-5">
        <p className="text-sm font-semibold text-emerald-950">Ya calificaste este trueque</p>
        <div className="mt-3 flex gap-1 text-amber-600">
          {[1, 2, 3, 4, 5].map((value) => (
            <Star
              key={value}
              aria-hidden="true"
              size={18}
              fill={value <= existingRating.rating ? "currentColor" : "none"}
            />
          ))}
        </div>
        {existingRating.comment ? (
          <p className="mt-3 text-sm leading-6 text-emerald-950">{existingRating.comment}</p>
        ) : null}
      </div>
    );
  }

  return (
    <form action={action} className="grid gap-4 rounded-lg border border-stone-200 bg-white p-5">
      <div>
        <p className="text-sm font-semibold text-stone-950">Calificar a {reviewedUserName}</p>
        <p className="mt-1 text-sm leading-6 text-stone-600">
          Tu calificación ayuda a que otras personas sepan si el intercambio fue claro y confiable.
        </p>
      </div>

      <input type="hidden" name="tradeRequestId" value={tradeRequestId} />
      <input type="hidden" name="reviewedUserId" value={reviewedUserId} />
      <input type="hidden" name="rating" value={rating} />

      <div className="flex gap-2" aria-label="Calificación">
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            type="button"
            aria-label={`${value} de 5`}
            aria-pressed={rating === value}
            onClick={() => setRating(value)}
            className={`grid size-10 place-items-center rounded-md border transition ${
              value <= rating
                ? "border-amber-200 bg-amber-50 text-amber-600"
                : "border-stone-200 bg-white text-stone-400 hover:bg-stone-50"
            }`}
          >
            <Star aria-hidden="true" size={18} fill={value <= rating ? "currentColor" : "none"} />
          </button>
        ))}
      </div>

      <div className="grid gap-2 text-sm text-stone-700">
        <label className="flex items-start gap-2 rounded-md border border-stone-200 p-3">
          <input
            type="checkbox"
            name="itemMatchedDescription"
            defaultChecked
            className="mt-1 accent-emerald-700"
          />
          El artículo coincidía con la descripción y fotos.
        </label>
        <label className="flex items-start gap-2 rounded-md border border-stone-200 p-3">
          <input
            type="checkbox"
            name="userWasReliable"
            defaultChecked
            className="mt-1 accent-emerald-700"
          />
          La persona fue confiable durante el intercambio.
        </label>
      </div>

      <label className="grid gap-2 text-sm font-semibold text-stone-700">
        Comentario opcional
        <textarea
          name="comment"
          rows={3}
          maxLength={600}
          placeholder="Ej. Todo claro, el artículo estaba como se describió."
          className="rounded-md border border-stone-200 px-3 py-3 text-sm font-normal outline-none focus:border-emerald-600"
        />
      </label>

      <button
        disabled={pending}
        className="rounded-md bg-emerald-700 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-800 disabled:bg-stone-300 disabled:text-stone-600"
      >
        {pending ? "Guardando..." : "Guardar calificación"}
      </button>

      {state.message ? (
        <p className={`rounded-md p-3 text-sm ${state.ok ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900"}`}>
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
