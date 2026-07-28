"use client";

import { CheckCircle2, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";

import { updateTradeRequestStatusAction } from "@/app/actions";
import { initialActionState } from "@/lib/action-state";
import { rejectionReasons } from "@/lib/constants";

type StatusFormProps = {
  tradeRequestId: string;
};

type CompletionFormProps = StatusFormProps & {
  currentUserConfirmed: boolean;
  otherUserConfirmed: boolean;
};

export function AcceptTradeRequestForm({ tradeRequestId }: StatusFormProps) {
  const router = useRouter();
  const [state, action, pending] = useActionState(updateTradeRequestStatusAction, initialActionState);

  useEffect(() => {
    if (state.ok) {
      router.refresh();
    }
  }, [router, state.ok]);

  return (
    <form action={action} className="grid gap-2">
      <input type="hidden" name="tradeRequestId" value={tradeRequestId} />
      <input type="hidden" name="status" value="accepted" />
      <button
        disabled={pending}
        className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-emerald-700 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:bg-stone-300 disabled:text-stone-600"
      >
        <CheckCircle2 aria-hidden="true" size={16} />
        {pending ? "Aceptando..." : "Aceptar"}
      </button>
      <StatusMessage ok={state.ok} message={state.message} />
    </form>
  );
}

export function RejectTradeRequestForm({ tradeRequestId }: StatusFormProps) {
  const router = useRouter();
  const [state, action, pending] = useActionState(updateTradeRequestStatusAction, initialActionState);

  useEffect(() => {
    if (state.ok) {
      router.refresh();
    }
  }, [router, state.ok]);

  return (
    <form action={action} className="grid gap-2">
      <input type="hidden" name="tradeRequestId" value={tradeRequestId} />
      <input type="hidden" name="status" value="rejected" />
      <label className="grid gap-1 text-xs font-semibold text-stone-600">
        Elige el motivo de rechazo
        <select
          name="rejectionReason"
          defaultValue="No me interesa"
          className="min-h-9 rounded-md border border-stone-200 bg-white px-2 text-sm font-normal text-stone-700 outline-none focus:border-emerald-600"
        >
          {rejectionReasons.map((reason) => (
            <option key={reason} value={reason}>
              {reason}
            </option>
          ))}
        </select>
      </label>
      <button
        disabled={pending}
        className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-stone-300 px-3 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50 disabled:bg-stone-100 disabled:text-stone-400"
      >
        <XCircle aria-hidden="true" size={16} />
        {pending ? "Rechazando..." : "Rechazar con este motivo"}
      </button>
      <StatusMessage ok={state.ok} message={state.message} />
    </form>
  );
}

export function CancelTradeRequestForm({ tradeRequestId }: StatusFormProps) {
  const router = useRouter();
  const [state, action, pending] = useActionState(updateTradeRequestStatusAction, initialActionState);

  useEffect(() => {
    if (state.ok) {
      router.refresh();
    }
  }, [router, state.ok]);

  return (
    <form action={action} className="grid gap-2">
      <input type="hidden" name="tradeRequestId" value={tradeRequestId} />
      <input type="hidden" name="status" value="cancelled" />
      <button
        disabled={pending}
        className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-stone-300 px-3 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50 disabled:bg-stone-100 disabled:text-stone-400"
      >
        <XCircle aria-hidden="true" size={16} />
        {pending ? "Cancelando..." : "Cancelar solicitud"}
      </button>
      <StatusMessage ok={state.ok} message={state.message} />
    </form>
  );
}

export function EndTradeNegotiationForm({ tradeRequestId }: StatusFormProps) {
  const router = useRouter();
  const [state, action, pending] = useActionState(updateTradeRequestStatusAction, initialActionState);

  useEffect(() => {
    if (state.ok) {
      router.refresh();
    }
  }, [router, state.ok]);

  return (
    <form action={action} className="grid gap-3">
      <input type="hidden" name="tradeRequestId" value={tradeRequestId} />
      <input type="hidden" name="status" value="cancelled" />
      <label className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-950">
        <input
          required
          type="checkbox"
          name="acknowledgeCancellation"
          className="mt-0.5 size-4 shrink-0 accent-emerald-700"
        />
        <span>
          Confirmo que el intercambio no se realizó. La negociación terminará y los artículos
          volverán a estar disponibles.
        </span>
      </label>
      <button
        disabled={pending}
        className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-red-300 px-3 py-2 text-sm font-semibold text-red-800 hover:bg-red-50 disabled:bg-stone-100 disabled:text-stone-400"
      >
        <XCircle aria-hidden="true" size={16} />
        {pending ? "Terminando..." : "Terminar negociación"}
      </button>
      <StatusMessage ok={state.ok} message={state.message} />
    </form>
  );
}

export function CompleteTradeRequestForm({
  tradeRequestId,
  currentUserConfirmed,
  otherUserConfirmed,
}: CompletionFormProps) {
  const router = useRouter();
  const [state, action, pending] = useActionState(updateTradeRequestStatusAction, initialActionState);

  useEffect(() => {
    if (state.ok) {
      router.refresh();
    }
  }, [router, state.ok]);

  return (
    <div className="grid gap-3">
      {otherUserConfirmed && !currentUserConfirmed ? (
        <p className="rounded-md bg-emerald-50 p-3 text-sm leading-6 text-emerald-900">
          La otra persona ya confirmó que el intercambio sí se hizo. Confirma solo si tú también lo realizaste.
        </p>
      ) : null}

      {currentUserConfirmed ? (
        <p className="rounded-md bg-stone-50 p-3 text-sm leading-6 text-stone-600">
          Ya marcaste que sí se hizo. Falta la confirmación de la otra persona para que cuente en las estadísticas.
        </p>
      ) : (
        <form action={action} className="grid gap-2">
          <input type="hidden" name="tradeRequestId" value={tradeRequestId} />
          <input type="hidden" name="status" value="completed" />
          <button
            disabled={pending}
            className="w-full rounded-md bg-emerald-700 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-800 disabled:bg-stone-300 disabled:text-stone-600"
          >
            {pending ? "Confirmando..." : "Sí se hizo el intercambio"}
          </button>
        </form>
      )}

      <StatusMessage ok={state.ok} message={state.message} />
    </div>
  );
}

function StatusMessage({ ok, message }: { ok: boolean; message: string }) {
  if (!message) {
    return null;
  }

  return (
    <p className={`rounded-md p-2 text-xs ${ok ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900"}`}>
      {message}
    </p>
  );
}
