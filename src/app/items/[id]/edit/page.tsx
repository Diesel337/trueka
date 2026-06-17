import Link from "next/link";
import { notFound } from "next/navigation";

import { EditItemForm } from "@/components/edit-item-form";
import { getCatalogData, getCurrentProfile, getOwnItemEditData } from "@/lib/data";

type EditItemPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditItemPage({ params }: EditItemPageProps) {
  const { id } = await params;
  const currentUser = await getCurrentProfile();

  if (!currentUser) {
    return (
      <main className="mx-auto flex max-w-3xl flex-1 items-center px-4 py-12">
        <div className="rounded-lg border border-stone-200 bg-white p-8">
          <h1 className="text-2xl font-semibold text-stone-950">Inicia sesión</h1>
          <p className="mt-2 text-stone-600">
            Necesitas entrar con tu cuenta para editar una publicación.
          </p>
          <Link
            href={`/auth?next=${encodeURIComponent(`/items/${id}/edit`)}`}
            className="mt-5 inline-flex rounded-md bg-emerald-700 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-800"
          >
            Entrar o crear cuenta
          </Link>
        </div>
      </main>
    );
  }

  const [editData, catalog] = await Promise.all([
    getOwnItemEditData(id),
    getCatalogData(),
  ]);

  if (!editData) {
    notFound();
  }

  return (
    <main className="flex-1">
      <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Link
            href={`/items/${editData.item.id}`}
            className="text-sm font-semibold text-emerald-800 hover:text-emerald-950"
          >
            Volver a la publicación
          </Link>
          <h1 className="mt-3 text-3xl font-semibold text-stone-950">Editar publicación</h1>
          <p className="mt-2 max-w-2xl text-stone-600">
            Corrige fotos, descripción, detalles o preferencias. Las solicitudes siguen siendo de
            artículos por artículos, sin pagos ni entregas gestionadas por Trueka.
          </p>
        </div>

        <EditItemForm
          item={editData.item}
          categories={catalog.categories}
          publicTags={catalog.tags}
          publicTagSlugs={editData.publicTagSlugs}
          privateInterestTags={catalog.tags}
          privateInterestTagSlugs={editData.privateInterestTagSlugs}
        />
      </section>
    </main>
  );
}
