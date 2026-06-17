"use client";

import { Trash2 } from "lucide-react";
import { useActionState, useEffect, useState } from "react";

import { retireItemAction } from "@/app/actions";
import { initialActionState } from "@/lib/action-state";

export function RetireItemForm({ itemId }: { itemId: string }) {
  const [confirmed, setConfirmed] = useState(false);
  const [state, action, pending] = useActionState(retireItemAction, initialActionState);

  useEffect(() => {
    if (state.ok && state.href) {
      window.location.href = state.href;
    }
  }, [state.href, state.ok]);

  return (
    <form action={action} className="grid gap-3 rounded-md border border-red-200 bg-red-50 p-4">
      <input type="hidden" name="itemId" value={itemId} />
      <label className="flex items-start gap-2 text-sm leading-6 text-red-950">
        <input
          type="checkbox"
          name="confirmRetire"
          checked={confirmed}
          onChange={(event) => setConfirmed(event.target.checked)}
          className="mt-1 accent-red-700"
        />
        Retirar esta publicación de Explorar y expirar sus solicitudes abiertas.
      </label>
      <button
        disabled={!confirmed || pending}
        className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-red-200 bg-white px-4 py-3 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:bg-stone-100 disabled:text-stone-400"
      >
        <Trash2 aria-hidden="true" size={16} />
        {pending ? "Retirando..." : "Retirar publicación"}
      </button>
      {state.message ? (
        <p className={`rounded-md p-2 text-xs ${state.ok ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900"}`}>
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
