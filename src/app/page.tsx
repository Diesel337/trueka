import type { Metadata } from "next";
import { ArrowRight, Plus, Search, ShieldCheck } from "lucide-react";
import Link from "next/link";

import { ItemCard } from "@/components/item-card";
import { LocationSelectFields } from "@/components/location-select-fields";
import { getCurrentProfile, getItemsResult, getSavedItemIdsForCurrentUser } from "@/lib/data";
import { guadalajaraMetroLocationValue } from "@/lib/mexico-locations";

const homeTitle = "Trueka | Te lo cambio";

export const metadata: Metadata = {
  title: {
    absolute: homeTitle,
  },
  openGraph: {
    title: homeTitle,
  },
  twitter: {
    title: homeTitle,
  },
};

export default async function Home() {
  const [{ items, ownersById, categories }, currentProfile] = await Promise.all([
    getItemsResult(
      { state: "Jalisco", city: guadalajaraMetroLocationValue },
      { pageSize: 4 },
    ),
    getCurrentProfile(),
  ]);
  const savedItemIds = currentProfile ? await getSavedItemIdsForCurrentUser() : [];
  const savedItemIdsSet = new Set(savedItemIds);
  const featuredItems = items;

  return (
    <main className="flex-1">
      <section className="border-b border-stone-200 bg-[#f4f7ed]">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_420px] lg:px-8 lg:py-14">
          <div className="flex min-h-[520px] flex-col justify-center">
            <p className="mb-3 text-sm font-semibold uppercase text-emerald-800">
              Primero Guadalajara y alrededores
            </p>
            <h1 className="max-w-3xl text-4xl font-semibold leading-tight text-stone-950 sm:text-5xl">
              Lo que tienes por lo que quieres.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-stone-700">
              ¿Lo quieres, pero no quieres gastar? Publica artículos con fotos y descripciones
              reales, recibe propuestas y decide con calma. Trueka es intercambio de artículos:
              sin efectivo, pagos ni envíos gestionados.
            </p>

            <form action="/items" className="mt-8 grid gap-3 rounded-lg bg-white p-3 shadow-sm sm:grid-cols-[1fr_180px_220px_48px]">
              <label className="sr-only" htmlFor="q">
                Buscar artículo
              </label>
              <input
                id="q"
                name="q"
                placeholder="Busca laptop, bici, herramientas..."
                className="min-h-12 rounded-md border border-stone-200 px-4 text-sm outline-none focus:border-emerald-600"
              />
              <LocationSelectFields
                defaultState="Jalisco"
                defaultMunicipality={guadalajaraMetroLocationValue}
                includeZones
                hideLabels
                className="contents"
              />
              <button
                aria-label="Buscar trueques"
                className="grid min-h-12 place-items-center rounded-md bg-emerald-700 text-white hover:bg-emerald-800"
              >
                <Search aria-hidden="true" size={20} />
              </button>
            </form>

            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href="/items/new"
                className="inline-flex items-center gap-2 rounded-md bg-emerald-700 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-800"
              >
                <Plus aria-hidden="true" size={18} />
                Publicar artículo
              </Link>
              <Link
                href="/items"
                className="inline-flex items-center gap-2 rounded-md border border-stone-300 bg-white px-4 py-3 text-sm font-semibold text-stone-800 hover:bg-stone-50"
              >
                Explorar trueques
                <ArrowRight aria-hidden="true" size={18} />
              </Link>
            </div>
          </div>

          <aside className="flex flex-col justify-center gap-4">
            <div className="rounded-lg border border-emerald-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-md bg-emerald-100 text-emerald-800">
                  <ShieldCheck aria-hidden="true" size={20} />
                </span>
                <div>
                  <p className="text-sm font-semibold text-stone-950">Regla central</p>
                  <p className="text-sm text-stone-600">Artículos por artículos. Sin dinero.</p>
                </div>
              </div>
              <p className="mt-4 text-sm leading-6 text-stone-700">
                Sin efectivo, pagos, ajustes de dinero ni envíos gestionados.
              </p>
            </div>
            <div className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-semibold text-stone-950">Cómo funciona</p>
              <div className="mt-4 grid gap-3 text-sm leading-6 text-stone-700">
                <p>
                  <span className="font-semibold text-stone-950">1. Publica</span> con fotos,
                  descripción real y defectos claros. Los detalles evitan sorpresas.
                </p>
                <p>
                  <span className="font-semibold text-stone-950">2. Envía o recibe</span>{" "}
                  propuestas: artículo por artículo, o varios artículos por varios artículos.
                </p>
                <p>
                  <span className="font-semibold text-stone-950">3. Acepta</span> una solicitud
                  para abrir la negociación y acordar detalles con calma.
                </p>
                <p>
                  <span className="font-semibold text-stone-950">4. Confirmen ambos</span> cuando
                  el intercambio ya ocurrió y deja una reseña útil.
                </p>
              </div>
            </div>
          </aside>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-stone-950">Publicaciones recientes</h2>
            <p className="mt-2 text-stone-600">
              Artículos activos con descripción real, defectos claros y detalles conocidos.
            </p>
          </div>
          <Link href="/items" className="text-sm font-semibold text-emerald-800 hover:text-emerald-950">
            Ver todo
          </Link>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {featuredItems.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              owner={ownersById[item.ownerId]}
              compact
              currentProfile={currentProfile}
              isSaved={savedItemIdsSet.has(item.id)}
            />
          ))}
        </div>
      </section>

      <section className="border-t border-stone-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-semibold text-stone-950">Categorías sugeridas</h2>
          <p className="mt-2 text-sm text-stone-600">
            Empieza por una categoría y descubre publicaciones activas.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {categories.map((category) => (
              <Link
                key={category.slug}
                href={`/items?category=${category.slug}`}
                className="rounded-md border border-stone-200 px-3 py-2 text-sm font-medium text-stone-700 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-900"
              >
                {category.name}
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
