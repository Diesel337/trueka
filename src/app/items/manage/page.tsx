import { Plus } from "lucide-react";
import Link from "next/link";

import { ItemCard } from "@/components/item-card";
import { getCurrentProfile, getOwnProfilePageData } from "@/lib/data";
import { getProfileItemSections, type ProfileItemSection } from "@/lib/profile-items";
import type { Profile } from "@/lib/types";

export default async function ManageItemsPage() {
  const currentUser = await getCurrentProfile();

  if (!currentUser) {
    return (
      <main className="mx-auto flex max-w-3xl flex-1 items-center px-4 py-12">
        <div className="rounded-lg border border-stone-200 bg-white p-8">
          <h1 className="text-2xl font-semibold text-stone-950">Inicia sesion</h1>
          <p className="mt-2 text-stone-600">
            Necesitas una cuenta para administrar tus publicaciones.
          </p>
          <Link
            href={`/auth?next=${encodeURIComponent("/items/manage")}`}
            className="mt-5 inline-flex rounded-md bg-emerald-700 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-800"
          >
            Entrar o crear cuenta
          </Link>
        </div>
      </main>
    );
  }

  const profileData = await getOwnProfilePageData();

  if (!profileData) {
    return null;
  }

  const itemSections = getProfileItemSections(profileData.items);
  const ownItemsCount = itemSections.reduce((sum, section) => sum + section.items.length, 0);

  return (
    <main className="flex-1">
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-emerald-800">
              Tus articulos
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-stone-950">
              Mis publicaciones
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
              {ownItemsCount > 0
                ? `${ownItemsCount.toLocaleString("es-MX")} publicaciones organizadas por estado.`
                : "Crea tu primera publicacion para empezar a recibir propuestas."}
            </p>
          </div>
          <Link
            href="/items/new"
            className="inline-flex items-center justify-center gap-2 rounded-md bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800"
          >
            <Plus aria-hidden="true" size={16} />
            Nueva publicacion
          </Link>
        </div>

        <div className="mt-6 rounded-lg border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="space-y-6">
            {itemSections.map((section) => (
              <ManageItemStatusSection
                key={section.status}
                section={section}
                currentUser={currentUser}
              />
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

function ManageItemStatusSection({
  section,
  currentUser,
}: {
  section: ProfileItemSection;
  currentUser: Profile;
}) {
  return (
    <section className="border-t border-stone-200 pt-5 first:border-t-0 first:pt-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-stone-950">{section.title}</h2>
          <p className="mt-1 text-sm leading-6 text-stone-600">{section.description}</p>
        </div>
        <span className="inline-flex min-h-8 min-w-8 items-center justify-center rounded-md bg-stone-100 px-2 text-sm font-semibold text-stone-700">
          {section.items.length.toLocaleString("es-MX")}
        </span>
      </div>
      {section.items.length > 0 ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {section.items.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              owner={currentUser}
              compact
              currentProfile={currentUser}
              showOwnerControls
            />
          ))}
        </div>
      ) : (
        <div className="mt-4 rounded-md border border-dashed border-stone-300 bg-stone-50 p-4 text-sm text-stone-600">
          {section.emptyMessage}
        </div>
      )}
    </section>
  );
}
