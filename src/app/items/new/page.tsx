import Link from "next/link";

import { NewItemForm } from "@/components/new-item-form";
import { getCatalogData, getCurrentProfile } from "@/lib/data";

type NewItemPageProps = {
  searchParams: Promise<{
    next?: string;
  }>;
};

export default async function NewItemPage({ searchParams }: NewItemPageProps) {
  const { next } = await searchParams;
  const currentUser = await getCurrentProfile();

  if (!currentUser) {
    return (
      <main className="mx-auto flex max-w-3xl flex-1 items-center px-4 py-12">
        <div className="rounded-lg border border-stone-200 bg-white p-8">
          <h1 className="text-2xl font-semibold text-stone-950">Inicia sesión</h1>
          <p className="mt-2 text-stone-600">
            Necesitas una cuenta para publicar artículos en Trueka.
          </p>
          <Link
            href={`/auth?next=${encodeURIComponent("/items/new")}`}
            className="mt-5 inline-flex rounded-md bg-emerald-700 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-800"
          >
            Entrar o crear cuenta
          </Link>
        </div>
      </main>
    );
  }

  const { categories, tags } = await getCatalogData();

  return (
    <main className="flex-1">
      <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-3xl font-semibold text-stone-950">Publicar artículo</h1>
          <p className="mt-2 max-w-2xl text-stone-600">
            Describe el artículo como te gustaría que te lo describieran a ti. Si tiene fallas,
            golpes, piezas faltantes o detalles, dilo aquí.
          </p>
        </div>

        <NewItemForm
          categories={categories}
          publicTags={tags}
          privateInterestTags={tags}
          next={next}
        />
      </section>
    </main>
  );
}
