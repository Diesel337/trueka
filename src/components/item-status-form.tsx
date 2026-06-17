"use client";

import { PauseCircle, RotateCcw, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";

import { updateItemStatusAction } from "@/app/actions";
import { initialActionState } from "@/lib/action-state";
import type { Item, ItemStatus } from "@/lib/types";

type ItemStatusFormProps = {
  itemId: string;
  status: ItemStatus;
  moderationStatus?: Item["moderationStatus"];
  hasPhotos?: boolean;
};

export function ItemStatusForm({
  itemId,
  status,
  moderationStatus = "active",
  hasPhotos = true,
}: ItemStatusFormProps) {
  const router = useRouter();
  const [state, action, pending] = useActionState(updateItemStatusAction, initialActionState);

  useEffect(() => {
    if (state.ok) {
      router.refresh();
    }
  }, [router, state.ok]);

  if (!["active", "paused", "draft"].includes(status)) {
    return null;
  }

  const nextStatus = status === "active" ? "paused" : "active";
  const isPausing = nextStatus === "paused";
  const isDraft = status === "draft";
  const needsPhotoBeforePublishing = isDraft && !hasPhotos;
  const isWaitingForModeration = isDraft && moderationStatus !== "active";

  return (
    <form action={action} className="grid gap-2">
      <input type="hidden" name="itemId" value={itemId} />
      <input type="hidden" name="status" value={nextStatus} />
      <button
        disabled={pending || needsPhotoBeforePublishing || isWaitingForModeration}
        className={`inline-flex w-full items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-semibold transition disabled:bg-stone-100 disabled:text-stone-400 ${
          isDraft
            ? "bg-emerald-700 text-white hover:bg-emerald-800"
            : isPausing
              ? "border border-stone-300 text-stone-700 hover:bg-stone-50"
              : "bg-emerald-700 text-white hover:bg-emerald-800"
        }`}
      >
        {isDraft ? (
          <Upload aria-hidden="true" size={16} />
        ) : isPausing ? (
          <PauseCircle aria-hidden="true" size={16} />
        ) : (
          <RotateCcw aria-hidden="true" size={16} />
        )}
        {pending
          ? "Actualizando..."
          : isDraft
            ? isWaitingForModeration
              ? "En revisión"
              : needsPhotoBeforePublishing
              ? "Agrega foto para publicar"
              : "Publicar borrador"
            : isPausing
              ? "Pausar publicación"
              : "Reactivar publicación"}
      </button>
      {isWaitingForModeration ? (
        <p className="rounded-md bg-amber-50 p-2 text-xs text-amber-900">
          Esta publicación está en revisión de moderación antes de aparecer en Explorar.
        </p>
      ) : needsPhotoBeforePublishing ? (
        <p className="rounded-md bg-amber-50 p-2 text-xs text-amber-900">
          Agrega al menos una foto real desde Editar para publicar este borrador.
        </p>
      ) : state.message ? (
        <p className={`rounded-md p-2 text-xs ${state.ok ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900"}`}>
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
