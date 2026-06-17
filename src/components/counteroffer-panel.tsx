"use client";

import { CheckCircle2, RefreshCcw, Send, XCircle } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";

import { createCounterofferAction, respondCounterofferAction } from "@/app/actions";
import { initialActionState } from "@/lib/action-state";
import type { Item, TradeCounteroffer } from "@/lib/types";

type CounterofferFormProps = {
  tradeRequestId: string;
  requesterItems: Item[];
  requesterName: string;
};

type CounterofferSummaryProps = {
  counteroffer: TradeCounteroffer;
  canRespond?: boolean;
};

export function CounterofferForm({
  tradeRequestId,
  requesterItems,
  requesterName,
}: CounterofferFormProps) {
  const router = useRouter();
  const [state, action, pending] = useActionState(createCounterofferAction, initialActionState);

  useEffect(() => {
    if (state.ok) {
      router.refresh();
    }
  }, [router, state.ok]);

  return (
    <form action={action} className="grid gap-4 rounded-lg border border-amber-200 bg-amber-50 p-5">
      <input type="hidden" name="tradeRequestId" value={tradeRequestId} />
      <div className="flex items-center gap-2 text-sm font-semibold text-amber-950">
        <RefreshCcw aria-hidden="true" size={18} />
        Proponer contraoferta
      </div>
      <p className="text-sm leading-6 text-amber-950">
        Pide uno o varios artículos activos de {requesterName}. Si acepta, la solicitud queda en negociación y se abre el chat.
      </p>

      <div className="grid gap-3">
        {requesterItems.length > 0 ? (
          requesterItems.map((item) => (
            <label
              key={item.id}
              className="grid cursor-pointer gap-3 rounded-md border border-amber-200 bg-white p-3 sm:grid-cols-[72px_1fr_auto]"
            >
              <ItemThumb item={item} size="72px" />
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-stone-950">{item.title}</span>
                <span className="mt-1 line-clamp-2 block text-xs leading-5 text-stone-600">
                  {item.knownDefects}
                </span>
              </span>
              <input
                name="requestedOfferedItemIds"
                value={item.id}
                type="checkbox"
                className="size-5 self-center accent-emerald-700"
              />
            </label>
          ))
        ) : (
          <p className="rounded-md border border-amber-200 bg-white p-3 text-sm leading-6 text-amber-950">
            {requesterName} no tiene otros artículos activos disponibles para armar una contraoferta.
          </p>
        )}
      </div>

      <label className="grid gap-2">
        <span className="text-sm font-semibold text-stone-800">Mensaje opcional</span>
        <textarea
          name="message"
          rows={3}
          maxLength={1000}
          placeholder="Ej. Me interesa, pero prefiero este otro artículo."
          className="rounded-md border border-amber-200 bg-white px-3 py-3 outline-none focus:border-emerald-600"
        />
      </label>

      <label className="flex items-start gap-3 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm leading-6 text-emerald-950">
        <input
          name="acknowledgeNoManagedExchange"
          type="checkbox"
          required
          className="mt-1 size-4 accent-emerald-700"
        />
        <span>Entiendo que Trueka no maneja pagos, no gestiona envíos ni entregas.</span>
      </label>

      <ActionMessage ok={state.ok} message={state.message} />

      <button
        disabled={pending || requesterItems.length === 0}
        className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-amber-600 px-4 py-3 text-sm font-semibold text-white hover:bg-amber-700 disabled:bg-stone-300 disabled:text-stone-600"
      >
        <Send aria-hidden="true" size={16} />
        {pending ? "Enviando..." : "Enviar contraoferta"}
      </button>
    </form>
  );
}

export function CounterofferSummary({ counteroffer, canRespond = false }: CounterofferSummaryProps) {
  return (
    <section className="rounded-lg border border-amber-200 bg-white p-5">
      <div className="flex items-center gap-2 text-sm font-semibold text-amber-900">
        <RefreshCcw aria-hidden="true" size={18} />
        Contraoferta pendiente
      </div>
      <p className="mt-2 text-sm leading-6 text-stone-600">
        {counteroffer.createdBy.displayName} propuso ajustar los artículos antes de abrir la negociación.
      </p>

      <div className="mt-4 grid gap-4">
        <CounterofferItems label="Artículo base" items={counteroffer.requestedItems} />
        <CounterofferItems label="Artículos pedidos a cambio" items={counteroffer.offeredItems} />
      </div>

      {counteroffer.message ? (
        <p className="mt-4 rounded-md bg-stone-50 p-3 text-sm leading-6 text-stone-700">
          {counteroffer.message}
        </p>
      ) : null}

      {canRespond ? <RespondCounterofferForm counterofferId={counteroffer.id} /> : null}
    </section>
  );
}

function RespondCounterofferForm({ counterofferId }: { counterofferId: string }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(respondCounterofferAction, initialActionState);

  useEffect(() => {
    if (state.ok) {
      router.refresh();
    }
  }, [router, state.ok]);

  return (
    <div className="mt-4 grid gap-3 border-t border-stone-100 pt-4">
      <div className="grid gap-2 sm:grid-cols-2">
        <form action={action}>
          <input type="hidden" name="counterofferId" value={counterofferId} />
          <input type="hidden" name="status" value="accepted" />
          <button
            disabled={pending}
            className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-emerald-700 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:bg-stone-300 disabled:text-stone-600"
          >
            <CheckCircle2 aria-hidden="true" size={16} />
            {pending ? "Guardando..." : "Aceptar contraoferta"}
          </button>
        </form>
        <form action={action}>
          <input type="hidden" name="counterofferId" value={counterofferId} />
          <input type="hidden" name="status" value="rejected" />
          <button
            disabled={pending}
            className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-stone-300 px-3 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50 disabled:bg-stone-100 disabled:text-stone-400"
          >
            <XCircle aria-hidden="true" size={16} />
            Rechazar
          </button>
        </form>
      </div>
      <ActionMessage ok={state.ok} message={state.message} />
    </div>
  );
}

function CounterofferItems({ label, items }: { label: string; items: Item[] }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase text-stone-500">{label}</p>
      <div className="mt-2 grid gap-2">
        {items.map((item) => (
          <div key={item.id} className="grid grid-cols-[56px_1fr] gap-3 rounded-md bg-stone-50 p-2">
            <ItemThumb item={item} size="56px" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-stone-950">{item.title}</p>
              <p className="mt-1 line-clamp-2 text-xs leading-5 text-stone-600">{item.knownDefects}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ItemThumb({ item, size }: { item: Item; size: string }) {
  return (
    <div className="relative aspect-square overflow-hidden rounded-md bg-stone-100" style={{ width: size }}>
      <Image
        src={item.photoUrls[0] ?? "/window.svg"}
        alt={item.title}
        fill
        sizes={size}
        className="object-cover"
        unoptimized
      />
    </div>
  );
}

function ActionMessage({ ok, message }: { ok: boolean; message: string }) {
  if (!message) {
    return null;
  }

  return (
    <p className={`rounded-md p-3 text-sm ${ok ? "bg-emerald-50 text-emerald-800" : "bg-amber-100 text-amber-950"}`}>
      {message}
    </p>
  );
}
