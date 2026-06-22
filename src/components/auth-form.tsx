"use client";

import { Mail } from "lucide-react";
import { useActionState, useEffect } from "react";

import { signInWithEmailAction, signUpWithEmailAction } from "@/app/actions";
import { initialActionState } from "@/lib/action-state";

export function AuthForm({ next = "/items" }: { next?: string }) {
  const [signInState, signInAction, signInPending] = useActionState(
    signInWithEmailAction,
    initialActionState,
  );
  const [signUpState, signUpAction, signUpPending] = useActionState(
    signUpWithEmailAction,
    initialActionState,
  );

  useEffect(() => {
    const href = signInState.href ?? signUpState.href;

    if ((signInState.ok || signUpState.ok) && href) {
      window.location.href = href;
    }
  }, [signInState.href, signInState.ok, signUpState.href, signUpState.ok]);

  const message = signInState.message || signUpState.message;
  const isOk = signInState.ok || signUpState.ok;

  return (
    <form className="grid gap-4">
      <input type="hidden" name="next" value={next} />
      <label className="grid gap-2">
        <span className="text-sm font-semibold text-stone-800">Correo</span>
        <div className="grid grid-cols-[48px_1fr] rounded-md border border-stone-200 bg-white focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-100">
          <span className="grid place-items-center">
            <span className="grid size-8 place-items-center rounded-md bg-emerald-50 text-emerald-800">
              <Mail aria-hidden="true" size={17} strokeWidth={2.2} />
            </span>
          </span>
          <input
            name="email"
            type="email"
            placeholder="tu@email.com"
            className="min-h-11 bg-transparent pr-3 outline-none"
          />
        </div>
      </label>
      <label className="grid gap-2">
        <span className="text-sm font-semibold text-stone-800">Contraseña</span>
        <input
          name="password"
          type="password"
          className="min-h-11 rounded-md border border-stone-200 px-3 outline-none focus:border-emerald-600"
        />
      </label>
      {message ? (
        <p className={`rounded-md p-3 text-sm ${isOk ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900"}`}>
          {message}
        </p>
      ) : null}
      <button
        formAction={signInAction}
        disabled={signInPending || signUpPending}
        className="rounded-md bg-emerald-700 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-800"
      >
        {signInPending ? "Entrando..." : "Entrar"}
      </button>
      <button
        formAction={signUpAction}
        disabled={signInPending || signUpPending}
        className="rounded-md border border-stone-300 px-4 py-3 text-sm font-semibold text-stone-700 hover:bg-stone-50"
      >
        {signUpPending ? "Creando..." : "Crear cuenta"}
      </button>
    </form>
  );
}
