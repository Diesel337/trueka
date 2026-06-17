"use client";

import { CheckCircle2, CircleDashed, Smartphone, X } from "lucide-react";
import { useActionState, useEffect, useRef, useState } from "react";

import {
  confirmPhoneVerificationAction,
  startPhoneVerificationAction,
} from "@/app/actions";
import { initialActionState } from "@/lib/action-state";
import type { Profile } from "@/lib/types";

const defaultPhonePrefix = "+52 ";

export function PhoneVerificationForm({ profile }: { profile: Profile }) {
  const [isOpen, setIsOpen] = useState(false);
  const [phone, setPhone] = useState(defaultPhonePrefix);
  const [token, setToken] = useState("");
  const phoneInputRef = useRef<HTMLInputElement>(null);
  const [requestState, requestAction, requestPending] = useActionState(
    startPhoneVerificationAction,
    initialActionState,
  );
  const [confirmState, confirmAction, confirmPending] = useActionState(
    confirmPhoneVerificationAction,
    initialActionState,
  );

  const statusMessage = confirmState.message || requestState.message;
  const statusOk = confirmState.message ? confirmState.ok : requestState.ok;
  const phoneDigitCount = phone.replace(/\D/g, "").length;
  const canRequestCode = phoneDigitCount >= 10;

  useEffect(() => {
    function openPhoneVerification() {
      if (
        window.location.hash === "#phone-verification"
        || window.location.hash === "#phone-verification-phone"
      ) {
        setIsOpen(true);
      }
    }

    openPhoneVerification();
    window.addEventListener("hashchange", openPhoneVerification);

    return () => window.removeEventListener("hashchange", openPhoneVerification);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeModal();
      }
    }

    const focusTimer = window.setTimeout(() => phoneInputRef.current?.focus(), 50);
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen]);

  function closeModal() {
    setIsOpen(false);

    if (
      window.location.hash === "#phone-verification"
      || window.location.hash === "#phone-verification-phone"
    ) {
      window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
    }
  }

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/45 px-4 py-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          closeModal();
        }
      }}
    >
      <section
        id="phone-verification"
        role="dialog"
        aria-modal="true"
        aria-labelledby="phone-verification-title"
        className="max-h-[calc(100vh-48px)] w-full max-w-2xl overflow-y-auto rounded-lg border border-stone-200 bg-white p-5 shadow-xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span
              className={`grid size-10 shrink-0 place-items-center rounded-md ${
                profile.phoneVerified ? "bg-emerald-50 text-emerald-800" : "bg-stone-100 text-stone-600"
              }`}
            >
              {profile.phoneVerified ? (
                <CheckCircle2 aria-hidden="true" size={20} />
              ) : (
                <Smartphone aria-hidden="true" size={20} />
              )}
            </span>
            <div>
              <h2 id="phone-verification-title" className="text-lg font-semibold text-stone-950">
                Verificación telefónica
              </h2>
              <p className="mt-1 text-sm leading-6 text-stone-600">
                Agrega una señal de confianza. Trueka no muestra tu número completo.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={closeModal}
            aria-label="Cerrar"
            className="grid size-9 shrink-0 place-items-center rounded-md border border-stone-200 text-stone-600 hover:bg-stone-50"
          >
            <X aria-hidden="true" size={18} />
          </button>
        </div>

        <p className="mt-4 inline-flex items-center gap-2 rounded-md bg-stone-50 px-3 py-2 text-sm font-medium text-stone-700">
          {profile.phoneVerified ? (
            <CheckCircle2 aria-hidden="true" size={16} className="text-emerald-700" />
          ) : (
            <CircleDashed aria-hidden="true" size={16} className="text-stone-500" />
          )}
          {profile.phoneVerified
            ? `Teléfono verificado${profile.phoneLast4 ? ` · termina en ${profile.phoneLast4}` : ""}`
            : "Teléfono pendiente de verificar"}
        </p>

        <div className="mt-5 grid gap-4">
          <form action={requestAction} className="grid gap-3 rounded-lg border border-stone-200 p-4">
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-stone-800">Teléfono</span>
              <input
                ref={phoneInputRef}
                id="phone-verification-phone"
                name="phone"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                inputMode="tel"
                autoComplete="tel"
                placeholder="+52 33 1234 5678"
                className="min-h-11 rounded-md border border-stone-200 px-3 outline-none focus:border-emerald-600"
              />
              <span className="text-xs leading-5 text-stone-500">
                Usa lada de México. Ejemplo: +52 33 1234 5678.
              </span>
            </label>
            <button
              disabled={requestPending || !canRequestCode}
              className="min-h-11 rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white hover:bg-emerald-800 disabled:bg-stone-300 disabled:text-stone-600"
            >
              {requestPending ? "Enviando..." : profile.phoneVerified ? "Cambiar teléfono" : "Enviar código"}
            </button>
          </form>

          <form action={confirmAction} className="grid gap-3 rounded-lg border border-stone-200 p-4">
            <input type="hidden" name="phone" value={phone} />
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-stone-800">Código SMS</span>
              <input
                name="token"
                value={token}
                onChange={(event) => setToken(event.target.value)}
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="123456"
                className="min-h-11 rounded-md border border-stone-200 px-3 outline-none focus:border-emerald-600"
              />
            </label>
            <button
              disabled={confirmPending || !canRequestCode}
              className="min-h-11 rounded-md border border-emerald-700 px-4 text-sm font-semibold text-emerald-800 hover:bg-emerald-50 disabled:border-stone-200 disabled:text-stone-400"
            >
              {confirmPending ? "Confirmando..." : "Confirmar teléfono"}
            </button>
          </form>
        </div>

        {statusMessage ? (
          <p className={`mt-4 rounded-md p-3 text-sm ${statusOk ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900"}`}>
            {statusMessage}
          </p>
        ) : null}
      </section>
    </div>
  );
}
