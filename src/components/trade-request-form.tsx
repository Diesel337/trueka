"use client";

import { LockKeyhole, Send } from "lucide-react";
import Image from "next/image";
import { useActionState, useEffect } from "react";

import { createTradeRequestAction } from "@/app/actions";
import { initialActionState } from "@/lib/action-state";
import type { Item } from "@/lib/types";

export function TradeRequestForm({
  requestedItemId,
  offeredItems,
  isOwnItem,
}: {
  requestedItemId: string;
  offeredItems: Item[];
  isOwnItem: boolean;
}) {
  const [state, action, pending] = useActionState(createTradeRequestAction, initialActionState);

  useEffect(() => {
    if (state.ok && state.href) {
      window.location.href = state.href;
    }
  }, [state.href, state.ok]);

  return (
    <form action={action} className="mt-6 rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
      <input type="hidden" name="requestedItemId" value={requestedItemId} />
      <section>
        <h2 className="text-lg font-semibold text-stone-950">Elige qué ofreces</h2>
        <div className="mt-4 grid gap-3">
          {offeredItems.map((item) => (
            <label
              key={item.id}
              className="grid grid-cols-[84px_minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-stone-200 p-3 sm:grid-cols-[120px_1fr_auto] sm:items-start"
            >
              <div className="relative aspect-square overflow-hidden rounded-md bg-stone-100 sm:aspect-[4/3]">
                <Image
                  src={item.photoUrls[0]}
                  alt={item.title}
                  fill
                  sizes="(min-width: 640px) 120px, 84px"
                  className="object-cover"
                  unoptimized
                />
              </div>
              <div className="min-w-0">
                <p className="line-clamp-2 font-semibold text-stone-950">{item.title}</p>
                <p className="mt-1 line-clamp-2 text-sm leading-6 text-stone-600">{item.knownDefects}</p>
              </div>
              <input
                name="offeredItemIds"
                value={item.id}
                type="checkbox"
                className="size-5 self-center accent-emerald-700"
              />
            </label>
          ))}
        </div>
      </section>

      <label className="mt-6 grid gap-2">
        <span className="text-sm font-semibold text-stone-800">Mensaje opcional</span>
        <textarea
          name="message"
          rows={4}
          placeholder="Cuenta por qué crees que el intercambio puede hacer sentido."
          className="rounded-md border border-stone-200 px-3 py-3 outline-none focus:border-emerald-600"
        />
      </label>

      <div className="mt-5 flex gap-2 rounded-md bg-stone-50 p-3 text-sm leading-6 text-stone-600">
        <LockKeyhole aria-hidden="true" size={16} className="mt-1 shrink-0" />
        <p>
          La solicitud solo guarda artículos ofrecidos y mensaje. No existe campo de pago, monto,
          paquetería ni envío gestionado.
        </p>
      </div>

      <label className="mt-4 flex items-start gap-3 rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-950">
        <input
          name="acknowledgeNoManagedExchange"
          type="checkbox"
          required
          className="mt-1 size-4 accent-emerald-700"
        />
        <span>
          Entiendo que Trueka no maneja pagos, no gestiona envíos ni entregas, y que esta solicitud
          es solo para ofrecer artículos propios por otro artículo.
        </span>
      </label>

      {state.message ? (
        <p className={`mt-4 rounded-md p-3 text-sm ${state.ok ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900"}`}>
          {state.message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isOwnItem || pending}
        className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-md bg-emerald-700 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-800 disabled:hover:bg-emerald-700"
      >
        <Send aria-hidden="true" size={17} />
        {pending ? "Enviando..." : "Enviar solicitud"}
      </button>
    </form>
  );
}
