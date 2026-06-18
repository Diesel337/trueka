"use client";

import { Heart } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { toggleSavedItemAction } from "@/app/actions";
import type { Profile } from "@/lib/types";

type SaveItemButtonProps = {
  itemId: string;
  isOwnItem: boolean;
  isSaved?: boolean;
  currentProfile?: Profile | null;
  nextPath: string;
  variant?: "floating" | "inline";
  compact?: boolean;
};

export function SaveItemButton({
  itemId,
  isOwnItem,
  isSaved = false,
  currentProfile,
  nextPath,
  variant = "floating",
  compact = false,
}: SaveItemButtonProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [optimisticSaved, setOptimisticSaved] = useState(isSaved);
  const [feedback, setFeedback] = useState("");

  if (isOwnItem) {
    return null;
  }

  const label = optimisticSaved ? "Quitar de guardados" : "Guardar";
  const className = getButtonClassName({ isSaved: optimisticSaved, pending, variant, compact });
  const iconSize = variant === "inline" ? 17 : compact ? 15 : 18;

  if (!currentProfile) {
    return (
      <Link
        href={`/auth?next=${encodeURIComponent(nextPath)}`}
        aria-label="Inicia sesión para guardar"
        className={className}
      >
        <Heart aria-hidden="true" size={iconSize} />
        {variant === "inline" ? <span>Guardar</span> : null}
      </Link>
    );
  }

  return (
    <form
      action={(formData) => {
        const nextSavedState = !optimisticSaved;
        const previousSavedState = optimisticSaved;

        startTransition(async () => {
          setFeedback("");
          setOptimisticSaved(nextSavedState);
          const result = await toggleSavedItemAction(formData);

          if (!result.ok) {
            setOptimisticSaved(previousSavedState);
            setFeedback(result.message);
            return;
          }

          setOptimisticSaved(result.saved ?? nextSavedState);
          router.refresh();
        });
      }}
    >
      <input type="hidden" name="itemId" value={itemId} />
      <input type="hidden" name="next" value={nextPath} />
      <button
        type="submit"
        aria-label={label}
        aria-pressed={optimisticSaved}
        disabled={pending}
        className={className}
      >
        <Heart
          aria-hidden="true"
          size={iconSize}
          fill={optimisticSaved ? "currentColor" : "none"}
        />
        {variant === "inline" ? <span>{optimisticSaved ? "Guardado" : "Guardar"}</span> : null}
      </button>
      {feedback ? <SaveItemFeedback message={feedback} variant={variant} /> : null}
    </form>
  );
}

function SaveItemFeedback({
  message,
  variant,
}: {
  message: string;
  variant: NonNullable<SaveItemButtonProps["variant"]>;
}) {
  if (variant === "inline") {
    return <p className="mt-2 text-xs font-medium text-amber-800">{message}</p>;
  }

  return (
    <span className="absolute right-3 top-14 z-10 w-56 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium leading-5 text-amber-900 shadow-sm">
      {message}
    </span>
  );
}

function getButtonClassName({
  isSaved,
  pending,
  variant,
  compact,
}: {
  isSaved: boolean;
  pending?: boolean;
  variant: NonNullable<SaveItemButtonProps["variant"]>;
  compact: boolean;
}) {
  const color = isSaved
    ? "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
    : "border-stone-200 bg-white/95 text-stone-700 hover:bg-white hover:text-rose-700";
  const pendingClassName = pending ? "opacity-80" : "";

  if (variant === "inline") {
    return `inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md border px-4 text-sm font-semibold transition ${color} ${pendingClassName}`;
  }

  return compact
    ? `absolute right-2 top-2 z-10 inline-flex size-8 items-center justify-center rounded-full border shadow-sm transition ${color} ${pendingClassName}`
    : `absolute right-3 top-3 z-10 inline-flex size-10 items-center justify-center rounded-full border shadow-sm transition ${color} ${pendingClassName}`;
}
