"use client";

import Link from "next/link";
import { useEffect } from "react";

import { supportEmail } from "@/lib/app-config";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(JSON.stringify({
      event: "client_route_error",
      digest: error.digest,
      message: error.message,
    }));
  }, [error.digest, error.message]);

  const subject = encodeURIComponent(`Error en Trueka${error.digest ? ` ${error.digest}` : ""}`);

  return (
    <main className="mx-auto grid min-h-[60vh] w-full max-w-3xl place-items-center px-4 py-16 sm:px-6 lg:px-8">
      <section className="w-full rounded-lg border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
          Algo no cargo bien
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-normal text-stone-950">
          Intenta de nuevo en un momento.
        </h1>
        <p className="mt-3 text-sm leading-6 text-stone-600">
          Guardamos una senal tecnica para revisar el fallo. Tus trueques no cambian por abrir esta pantalla.
        </p>
        {error.digest ? (
          <p className="mt-4 rounded-md bg-stone-50 px-3 py-2 text-xs font-semibold text-stone-600">
            ID de error: {error.digest}
          </p>
        ) : null}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={reset}
            className="inline-flex min-h-11 items-center justify-center rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white hover:bg-emerald-800"
          >
            Intentar de nuevo
          </button>
          <Link
            href="/items"
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-stone-300 px-4 text-sm font-semibold text-stone-800 hover:bg-stone-50"
          >
            Ir a Explorar
          </Link>
          <a
            href={`mailto:${supportEmail}?subject=${subject}`}
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-stone-300 px-4 text-sm font-semibold text-stone-800 hover:bg-stone-50"
          >
            Reportar
          </a>
        </div>
      </section>
    </main>
  );
}
