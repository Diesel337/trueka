"use client";

import { Ban, Flag, RotateCcw } from "lucide-react";
import { useActionState } from "react";

import { blockUserAction, reportContentAction, unblockUserAction } from "@/app/actions";
import { initialActionState } from "@/lib/action-state";

type ReportReason =
  | "prohibited_item"
  | "false_information"
  | "suspicious_user"
  | "possible_scam"
  | "harassment"
  | "stolen_item"
  | "misleading_photos"
  | "other";

const reportReasons: { value: ReportReason; label: string }[] = [
  { value: "false_information", label: "Información falsa" },
  { value: "misleading_photos", label: "Fotos engañosas" },
  { value: "prohibited_item", label: "Artículo prohibido" },
  { value: "suspicious_user", label: "Usuario sospechoso" },
  { value: "possible_scam", label: "Posible fraude" },
  { value: "harassment", label: "Acoso" },
  { value: "stolen_item", label: "Posible artículo robado" },
  { value: "other", label: "Otro motivo" },
];

type ReportFormProps = {
  reportedUserId?: string;
  reportedItemId?: string;
  tradeRequestId?: string;
  defaultReason?: ReportReason;
  buttonLabel?: string;
};

export function ReportForm({
  reportedUserId,
  reportedItemId,
  tradeRequestId,
  defaultReason = "false_information",
  buttonLabel = "Reportar",
}: ReportFormProps) {
  const [state, action, pending] = useActionState(reportContentAction, initialActionState);

  return (
    <form action={action} className="grid gap-3">
      {reportedUserId ? <input type="hidden" name="reportedUserId" value={reportedUserId} /> : null}
      {reportedItemId ? <input type="hidden" name="reportedItemId" value={reportedItemId} /> : null}
      {tradeRequestId ? <input type="hidden" name="tradeRequestId" value={tradeRequestId} /> : null}
      <label className="sr-only" htmlFor={`reason-${reportedItemId ?? reportedUserId ?? tradeRequestId}`}>
        Motivo del reporte
      </label>
      <select
        id={`reason-${reportedItemId ?? reportedUserId ?? tradeRequestId}`}
        name="reason"
        defaultValue={defaultReason}
        className="min-h-11 rounded-md border border-stone-200 px-3 text-sm outline-none focus:border-emerald-600"
      >
        {reportReasons.map((reason) => (
          <option key={reason.value} value={reason.value}>
            {reason.label}
          </option>
        ))}
      </select>
      <textarea
        name="details"
        rows={3}
        maxLength={1000}
        placeholder="Detalle opcional"
        className="rounded-md border border-stone-200 px-3 py-3 text-sm outline-none focus:border-emerald-600"
      />
      <button
        disabled={pending}
        className="inline-flex items-center justify-center gap-2 rounded-md border border-red-200 px-4 py-3 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Flag aria-hidden="true" size={16} />
        {pending ? "Enviando..." : buttonLabel}
      </button>
      {state.message ? <SafetyMessage ok={state.ok} message={state.message} /> : null}
    </form>
  );
}

export function BlockUserForm({
  blockedUserId,
  buttonLabel = "Bloquear usuario",
}: {
  blockedUserId: string;
  buttonLabel?: string;
}) {
  const [state, action, pending] = useActionState(blockUserAction, initialActionState);

  return (
    <form action={action} className="grid gap-2">
      <input type="hidden" name="blockedUserId" value={blockedUserId} />
      <button
        disabled={pending}
        className="inline-flex items-center justify-center gap-2 rounded-md border border-stone-300 px-4 py-3 text-sm font-semibold text-stone-700 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Ban aria-hidden="true" size={16} />
        {pending ? "Bloqueando..." : buttonLabel}
      </button>
      {state.message ? <SafetyMessage ok={state.ok} message={state.message} /> : null}
    </form>
  );
}

export function UnblockUserForm({
  blockedUserId,
  buttonLabel = "Desbloquear",
}: {
  blockedUserId: string;
  buttonLabel?: string;
}) {
  const [state, action, pending] = useActionState(unblockUserAction, initialActionState);

  return (
    <form action={action} className="grid gap-2">
      <input type="hidden" name="blockedUserId" value={blockedUserId} />
      <button
        disabled={pending}
        className="inline-flex items-center justify-center gap-2 rounded-md border border-stone-300 px-4 py-2.5 text-sm font-semibold text-stone-700 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <RotateCcw aria-hidden="true" size={16} />
        {pending ? "Desbloqueando..." : buttonLabel}
      </button>
      {state.message ? <SafetyMessage ok={state.ok} message={state.message} /> : null}
    </form>
  );
}

function SafetyMessage({ ok, message }: { ok: boolean; message: string }) {
  return (
    <p className={`rounded-md p-3 text-sm ${ok ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900"}`}>
      {message}
    </p>
  );
}
