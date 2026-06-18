"use client";

import { Check, Share2 } from "lucide-react";
import { useState } from "react";

type ShareItemButtonProps = {
  title: string;
  shareUrl: string;
};

export function ShareItemButton({ title, shareUrl }: ShareItemButtonProps) {
  const [feedback, setFeedback] = useState("");

  async function shareItem() {
    setFeedback("");

    try {
      if (navigator.share) {
        await navigator.share({
          title,
          text: `${title} en Trueka`,
          url: shareUrl,
        });
        setFeedback("Listo para compartir.");
        return;
      }

      await navigator.clipboard.writeText(shareUrl);
      setFeedback("Link copiado.");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }

      setFeedback("No se pudo copiar el link.");
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={shareItem}
        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-stone-200 bg-white px-4 text-sm font-semibold text-stone-700 transition hover:bg-stone-50"
      >
        {feedback === "Link copiado." || feedback === "Listo para compartir." ? (
          <Check aria-hidden="true" size={17} className="text-emerald-700" />
        ) : (
          <Share2 aria-hidden="true" size={17} />
        )}
        Compartir publicación
      </button>
      {feedback ? (
        <p className="mt-2 text-xs font-medium text-emerald-800">{feedback}</p>
      ) : null}
    </div>
  );
}
