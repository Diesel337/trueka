"use client";

import { ShieldCheck } from "lucide-react";
import { useActionState } from "react";

import { requestDataDeletionAction } from "@/app/actions";
import { initialActionState } from "@/lib/action-state";

export function DataDeletionRequestForm() {
  const [state, action, pending] = useActionState(
    requestDataDeletionAction,
    initialActionState,
  );

  return (
    <form action={action} className="mt-4 grid gap-4 rounded-lg border border-stone-200 bg-stone-50 p-4">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-md bg-emerald-50 text-emerald-800">
          <ShieldCheck aria-hidden="true" size={20} />
        </span>
        <div>
          <h3 className="font-semibold text-stone-950">Solicitud desde tu cuenta</h3>
          <p className="mt-1 text-sm leading-6 text-stone-600">
            No borraremos nada automaticamente; queda en revision para proteger trueques,
            reportes y seguridad.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2">
          <span className="text-sm font-semibold text-stone-800">Correo de la cuenta</span>
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="correo@ejemplo.com"
            className="min-h-11 rounded-md border border-stone-200 bg-white px-3 outline-none focus:border-emerald-600"
          />
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-semibold text-stone-800">Proveedor usado</span>
          <select
            name="provider"
            defaultValue="email"
            className="min-h-11 rounded-md border border-stone-200 bg-white px-3 outline-none focus:border-emerald-600"
          >
            <option value="email">Correo y contrasena</option>
            <option value="google">Google</option>
            <option value="facebook">Facebook</option>
            <option value="other">Otro o no recuerdo</option>
          </select>
        </label>
      </div>

      <label className="grid gap-2">
        <span className="text-sm font-semibold text-stone-800">Notas para revisar la cuenta</span>
        <textarea
          name="details"
          rows={4}
          maxLength={1000}
          placeholder="Ej. Quiero eliminar mi cuenta despues de cerrar mis publicaciones abiertas."
          className="rounded-md border border-stone-200 bg-white px-3 py-3 outline-none focus:border-emerald-600"
        />
      </label>

      <label className="flex items-start gap-2 rounded-md border border-stone-200 bg-white p-3 text-sm leading-6 text-stone-700">
        <input
          name="acknowledgeManualReview"
          type="checkbox"
          required
          className="mt-1 size-4 accent-emerald-700"
        />
        <span>Entiendo que la solicitud sera revisada manualmente antes de procesarse.</span>
      </label>

      {state.message ? (
        <p className={`rounded-md p-3 text-sm ${state.ok ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900"}`}>
          {state.message}
        </p>
      ) : null}

      <button
        disabled={pending}
        className="min-h-11 w-fit rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white hover:bg-emerald-800 disabled:bg-stone-300 disabled:text-stone-600"
      >
        {pending ? "Enviando..." : "Enviar solicitud"}
      </button>
    </form>
  );
}
