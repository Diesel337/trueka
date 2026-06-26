import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto grid min-h-[60vh] w-full max-w-3xl place-items-center px-4 py-16 sm:px-6 lg:px-8">
      <section className="w-full rounded-lg border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
          No encontramos esta pagina
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-normal text-stone-950">
          Puede que la publicacion ya no este disponible.
        </h1>
        <p className="mt-3 text-sm leading-6 text-stone-600">
          Si era un articulo, pudo pausarse, intercambiarse, eliminarse o quedar oculto por seguridad.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/items"
            className="inline-flex min-h-11 items-center justify-center rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white hover:bg-emerald-800"
          >
            Explorar trueques
          </Link>
          <Link
            href="/"
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-stone-300 px-4 text-sm font-semibold text-stone-800 hover:bg-stone-50"
          >
            Volver al inicio
          </Link>
        </div>
      </section>
    </main>
  );
}
