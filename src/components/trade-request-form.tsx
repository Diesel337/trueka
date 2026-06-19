"use client";

import { Check, LockKeyhole, Send } from "lucide-react";
import Image from "next/image";
import { useActionState, useEffect, useState } from "react";

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
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const selectedCount = selectedItemIds.length;
  const canSubmit = selectedCount > 0 && !isOwnItem && !pending;

  useEffect(() => {
    if (state.ok && state.href) {
      window.location.href = state.href;
    }
  }, [state.href, state.ok]);

  const toggleItem = (itemId: string) => {
    setSelectedItemIds((currentItemIds) =>
      currentItemIds.includes(itemId)
        ? currentItemIds.filter((currentItemId) => currentItemId !== itemId)
        : [...currentItemIds, itemId],
    );
  };

  return (
    <form action={action} className="mt-6 rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
      <input type="hidden" name="requestedItemId" value={requestedItemId} />
      <section>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-stone-950">Elige qué ofreces</h2>
            <p className="mt-1 text-sm leading-6 text-stone-600">
              Puedes elegir uno o varios artículos propios para armar una propuesta clara.
            </p>
          </div>
          <span
            aria-live="polite"
            className="inline-flex w-fit items-center rounded-md bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-900 ring-1 ring-emerald-100"
          >
            {selectedCount === 0
              ? "Nada seleccionado"
              : `${selectedCount} seleccionado${selectedCount === 1 ? "" : "s"}`}
          </span>
        </div>

        <div className="mt-4 grid gap-3">
          {offeredItems.map((item) => {
            const isSelected = selectedItemIds.includes(item.id);

            return (
              <label
                key={item.id}
                className={`grid cursor-pointer grid-cols-[84px_minmax(0,1fr)_auto] items-start gap-3 rounded-lg border p-3 transition sm:grid-cols-[120px_1fr_auto] ${
                  isSelected
                    ? "border-emerald-300 bg-emerald-50 ring-1 ring-emerald-200"
                    : "border-stone-200 bg-white hover:border-emerald-200 hover:bg-emerald-50/40"
                }`}
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
                  <p className="mt-1 line-clamp-2 text-sm leading-6 text-stone-600">
                    {item.knownDefects}
                  </p>
                  <span
                    className={`mt-3 inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold ${
                      isSelected
                        ? "bg-emerald-700 text-white"
                        : "bg-stone-100 text-stone-600"
                    }`}
                  >
                    {isSelected ? <Check aria-hidden="true" size={13} /> : null}
                    {isSelected ? "Seleccionado" : "Tocar para ofrecer"}
                  </span>
                </div>
                <input
                  name="offeredItemIds"
                  value={item.id}
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleItem(item.id)}
                  className="mt-1 size-5 shrink-0 accent-emerald-700 sm:mt-2"
                />
              </label>
            );
          })}
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
        <p
          className={`mt-4 rounded-md p-3 text-sm ${
            state.ok ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900"
          }`}
        >
          {state.message}
        </p>
      ) : null}

      <div className="sticky bottom-3 z-10 mt-5 rounded-lg border border-stone-200 bg-white/95 p-2 shadow-[0_-8px_24px_rgba(28,25,23,0.10)] backdrop-blur lg:static lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none">
        <button
          type="submit"
          disabled={!canSubmit}
          className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-stone-300 disabled:text-stone-600"
        >
          <Send aria-hidden="true" size={17} />
          {pending
            ? "Enviando..."
            : selectedCount > 0
              ? `Enviar solicitud con ${selectedCount} artículo${selectedCount === 1 ? "" : "s"}`
              : "Elige al menos uno"}
        </button>
      </div>
    </form>
  );
}
