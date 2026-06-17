import { AlertTriangle } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { TradeRequestForm } from "@/components/trade-request-form";
import { getCurrentProfile, getItemDetail, getItemsResult, getOwnActiveItems } from "@/lib/data";
import { getMexicoStateDisplayName } from "@/lib/mexico-locations";
import { getCrossCityWarning } from "@/lib/trade-rules";

type NewRequestPageProps = {
  searchParams: Promise<{
    item?: string;
  }>;
};

export default async function NewRequestPage({ searchParams }: NewRequestPageProps) {
  const { item: itemId } = await searchParams;
  const currentUser = await getCurrentProfile();
  const nextPath = itemId ? `/requests/new?item=${encodeURIComponent(itemId)}` : "/requests/new";

  if (!currentUser) {
    return (
      <main className="mx-auto flex max-w-3xl flex-1 items-center px-4 py-12">
        <div className="rounded-lg border border-stone-200 bg-white p-8">
          <h1 className="text-2xl font-semibold text-stone-950">Inicia sesión</h1>
          <p className="mt-2 text-stone-600">
            Necesitas una cuenta para proponer un trueque.
          </p>
          <Link
            href={`/auth?next=${encodeURIComponent(nextPath)}`}
            className="mt-5 inline-flex rounded-md bg-emerald-700 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-800"
          >
            Entrar o crear cuenta
          </Link>
        </div>
      </main>
    );
  }

  const fallbackItem = itemId
    ? null
    : (await getItemsResult()).items.find((entry) => entry.ownerId !== currentUser.id);
  const detail = itemId ? await getItemDetail(itemId) : fallbackItem ? await getItemDetail(fallbackItem.id) : null;
  const requestedItem = detail?.item;
  const owner = detail?.owner;
  const { items: activeOwnItems } = await getOwnActiveItems();

  if (!requestedItem || !owner) {
    return (
      <main className="mx-auto flex max-w-3xl flex-1 items-center px-4 py-12">
        <div className="rounded-lg border border-stone-200 bg-white p-8">
          <h1 className="text-2xl font-semibold text-stone-950">Elige un artículo</h1>
          <p className="mt-2 text-stone-600">
            Para proponer un trueque, primero abre una publicación activa de otra persona.
          </p>
          <Link
            href="/items"
            className="mt-5 inline-flex rounded-md bg-emerald-700 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-800"
          >
            Explorar artículos
          </Link>
        </div>
      </main>
    );
  }

  const isOwnItem = requestedItem.ownerId === currentUser.id;
  const crossCityWarning = getCrossCityWarning(currentUser, owner);

  return (
    <main className="flex-1">
      <section className="mx-auto grid max-w-6xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_360px] lg:px-8">
        <div>
          <h1 className="text-3xl font-semibold text-stone-950">Proponer trueque</h1>
          <p className="mt-2 max-w-2xl text-stone-600">
            Ofrece uno o varios artículos propios. Trueka no permite dinero en solicitudes ni
            gestiona envíos o entregas.
          </p>

          {isOwnItem ? (
            <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-800">
              No puedes crear una solicitud sobre un artículo propio.
            </div>
          ) : null}

          {crossCityWarning ? (
            <div className="mt-6 flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
              <AlertTriangle aria-hidden="true" size={18} className="mt-1 shrink-0" />
              <p>{crossCityWarning}</p>
            </div>
          ) : null}

          {activeOwnItems.length === 0 ? (
            <div className="mt-6 rounded-lg border border-stone-200 bg-white p-6">
              <h2 className="text-lg font-semibold text-stone-950">
                Para proponer un trueque primero publica lo que quieres ofrecer.
              </h2>
              <p className="mt-2 text-sm text-stone-600">
                Necesitas al menos un artículo activo propio para enviarlo como oferta.
              </p>
              <Link
                href={`/items/new?next=${encodeURIComponent(nextPath)}`}
                className="mt-5 inline-flex rounded-md bg-emerald-700 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-800"
              >
                Publicar artículo
              </Link>
            </div>
          ) : (
            <TradeRequestForm
              requestedItemId={requestedItem.id}
              offeredItems={activeOwnItems}
              isOwnItem={isOwnItem}
            />
          )}
        </div>

        <aside className="space-y-4">
          <section className="rounded-lg border border-stone-200 bg-white p-4">
            <p className="text-sm font-semibold text-stone-500">Artículo solicitado</p>
            <div className="relative mt-3 aspect-[4/3] overflow-hidden rounded-md bg-stone-100">
              <Image
                src={requestedItem.photoUrls[0]}
                alt={requestedItem.title}
                fill
                sizes="360px"
                className="object-cover"
                unoptimized
              />
            </div>
            <h2 className="mt-3 text-lg font-semibold text-stone-950">{requestedItem.title}</h2>
            <p className="mt-1 text-sm text-stone-600">
              <Link href={`/users/${owner.id}`} className="font-semibold text-emerald-800 hover:text-emerald-950">
                {owner.displayName}
              </Link>{" "}
              · {owner.city}, {getMexicoStateDisplayName(owner.state)}
            </p>
          </section>
        </aside>
      </section>
    </main>
  );
}
