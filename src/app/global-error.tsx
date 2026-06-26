"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(JSON.stringify({
      event: "client_global_error",
      digest: error.digest,
      message: error.message,
    }));
  }, [error.digest, error.message]);

  return (
    <html lang="es-MX">
      <body className="bg-[#fbfaf7] font-sans text-stone-950">
        <main className="mx-auto grid min-h-screen w-full max-w-3xl place-items-center px-4 py-16">
          <section className="w-full rounded-lg border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
            <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
              Trueka necesita recargar
            </p>
            <h1 className="mt-3 text-3xl font-bold tracking-normal">
              Hubo un error inesperado.
            </h1>
            <p className="mt-3 text-sm leading-6 text-stone-600">
              Puedes intentar de nuevo. Si se repite, revisaremos el ID del error en los logs.
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
                href="/"
                className="inline-flex min-h-11 items-center justify-center rounded-md border border-stone-300 px-4 text-sm font-semibold text-stone-800 hover:bg-stone-50"
              >
                Volver al inicio
              </Link>
            </div>
          </section>
        </main>
      </body>
    </html>
  );
}
