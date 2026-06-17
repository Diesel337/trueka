import { Search } from "lucide-react";

import { AutoSubmitSearchInput } from "@/components/auto-submit-search-input";
import { ItemCard, type ItemMatchSignal, type ItemRequestMarker } from "@/components/item-card";
import { LocationSelectFields } from "@/components/location-select-fields";
import { conditionLabels, valueRangeLabels } from "@/lib/constants";
import {
  getCurrentProfile,
  getCurrentProfilePrivateInterestTags,
  getItemsResult,
  getOwnActiveItems,
  getSavedItemIdsForCurrentUser,
  getTradeRequestsForCurrentUser,
} from "@/lib/data";
import { getViewerInterestSlugs, hasInterestOverlap } from "@/lib/item-matching";
import { calculateMatchScore } from "@/lib/trade-rules";
import type { Item, Profile, TradeRequest, TradeRequestStatus } from "@/lib/types";

type ItemsPageProps = {
  searchParams: Promise<{
    q?: string;
    state?: string;
    city?: string;
    category?: string;
    condition?: string;
    valueRange?: string;
    acceptsOtherCities?: string;
    hasRequest?: string;
    saved?: string;
    verifiedProfile?: string;
    sort?: string;
  }>;
};

export default async function ItemsPage({ searchParams }: ItemsPageProps) {
  const filters = await searchParams;
  const [{ items: filteredItems, ownersById, categories }, currentProfile] = await Promise.all([
    getItemsResult(filters),
    getCurrentProfile(),
  ]); 
  const [tradeRequests, savedItemIds, profileInterestTags] = currentProfile
    ? await Promise.all([
      getTradeRequestsForCurrentUser(),
      getSavedItemIdsForCurrentUser(),
      getCurrentProfilePrivateInterestTags(),
    ])
    : [[], [], []];
  const savedItemIdsSet = new Set(savedItemIds);
  const ownActiveItems = currentProfile && filters.sort === "match"
    ? (await getOwnActiveItems()).items
    : [];
  const viewerInterestSlugs = getViewerInterestSlugs(ownActiveItems, profileInterestTags);
  const requestMarkersByItemId = buildReceivedRequestMarkers(tradeRequests, currentProfile?.id);
  const signalFilteredItems = filterItemsBySignals(
    filteredItems,
    ownersById,
    requestMarkersByItemId,
    savedItemIdsSet,
    filters,
  );
  const sortedItems = sortItemsByRequestPriority(signalFilteredItems, requestMarkersByItemId, {
    currentProfile,
    filters,
    ownersById,
    viewerInterestSlugs,
  });
  const matchSignalsByItemId = buildMatchSignalsByItemId(sortedItems, {
    currentProfile,
    filters,
    ownersById,
    viewerInterestSlugs,
  });

  return (
    <main className="flex-1">
      <section className="border-b border-stone-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-semibold text-stone-950">Explorar trueques</h1>
          <p className="mt-2 max-w-2xl text-stone-600">
            Busca artículos activos cerca de ti. Las propuestas se hacen ofreciendo uno o varios
            artículos propios, nunca dinero.
          </p>

          <form className="mt-6 rounded-lg border border-stone-200 bg-white p-3 shadow-sm">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(220px,1fr)_180px_220px_220px_48px]">
              <AutoSubmitSearchInput
                name="q"
                defaultValue={filters.q}
                placeholder="Buscar por artículo o detalle"
                className="min-h-11 w-full min-w-0 rounded-md border border-stone-200 px-3 text-sm outline-none focus:border-emerald-600"
              />
              <LocationSelectFields
                defaultState={filters.state ?? ""}
                defaultMunicipality={filters.city ?? ""}
                includeAllStates
                includeAllMunicipalities
                includeZones
                required={false}
                hideLabels
                className="contents"
              />
              <select
                name="category"
                defaultValue={filters.category ?? ""}
                className="min-h-11 w-full min-w-0 rounded-md border border-stone-200 px-3 text-sm outline-none focus:border-emerald-600"
              >
                <option value="">Todas las categorías</option>
                {categories.map((entry) => (
                  <option key={entry.slug} value={entry.slug}>
                    {entry.name}
                  </option>
                ))}
              </select>
              <button
                aria-label="Aplicar filtros"
                className="grid min-h-11 min-w-0 place-items-center rounded-md bg-emerald-700 text-white hover:bg-emerald-800 md:col-span-2 xl:col-span-1"
              >
                <Search aria-hidden="true" size={19} />
              </button>
            </div>

            <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <select
                name="sort"
                defaultValue={filters.sort ?? "newest"}
                className="min-h-11 w-full min-w-0 rounded-md border border-stone-200 px-3 text-sm outline-none focus:border-emerald-600"
              >
                <option value="match">Mejor match para mí</option>
                <option value="newest">Más recientes primero</option>
                <option value="oldest">Más antiguas primero</option>
                <option value="name_asc">Nombre A-Z</option>
                <option value="name_desc">Nombre Z-A</option>
              </select>
              <select
                name="condition"
                defaultValue={filters.condition ?? ""}
                className="min-h-11 w-full min-w-0 rounded-md border border-stone-200 px-3 text-sm outline-none focus:border-emerald-600"
              >
                <option value="">Cualquier estado</option>
                {Object.entries(conditionLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <select
                name="valueRange"
                defaultValue={filters.valueRange ?? ""}
                className="min-h-11 w-full min-w-0 rounded-md border border-stone-200 px-3 text-sm outline-none focus:border-emerald-600"
              >
                <option value="">Cualquier rango orientativo</option>
                {Object.entries(valueRangeLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <select
                name="acceptsOtherCities"
                defaultValue={filters.acceptsOtherCities ?? ""}
                className="min-h-11 w-full min-w-0 rounded-md border border-stone-200 px-3 text-sm outline-none focus:border-emerald-600"
              >
                <option value="">Cualquier ubicación</option>
                <option value="true">Acepta otra ciudad</option>
              </select>
              <select
                name="hasRequest"
                defaultValue={filters.hasRequest ?? ""}
                className="min-h-11 w-full min-w-0 rounded-md border border-stone-200 px-3 text-sm outline-none focus:border-emerald-600"
              >
                <option value="">Cualquier solicitud</option>
                <option value="received">Con solicitud recibida</option>
              </select>
              <select
                name="saved"
                defaultValue={filters.saved ?? ""}
                className="min-h-11 w-full min-w-0 rounded-md border border-stone-200 px-3 text-sm outline-none focus:border-emerald-600"
              >
                <option value="">Todos los artículos</option>
                <option value="true">Solo guardados</option>
              </select>
              <select
                name="verifiedProfile"
                defaultValue={filters.verifiedProfile ?? ""}
                className="min-h-11 w-full min-w-0 rounded-md border border-stone-200 px-3 text-sm outline-none focus:border-emerald-600"
              >
                <option value="">Cualquier perfil</option>
                <option value="true">Correo o teléfono verificado</option>
              </select>
            </div>
          </form>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-5 flex items-center justify-between">
          <p className="text-sm font-medium text-stone-600">
            {sortedItems.length} publicación{sortedItems.length === 1 ? "" : "es"}
          </p>
        </div>
        {sortedItems.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {sortedItems.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                owner={ownersById[item.ownerId]}
                compact
                currentProfile={currentProfile}
                requestMarker={requestMarkersByItemId.get(item.id)}
                matchSignal={matchSignalsByItemId.get(item.id)}
                isSaved={savedItemIdsSet.has(item.id)}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-stone-300 bg-white p-8 text-center">
            <h2 className="text-lg font-semibold text-stone-950">No encontramos publicaciones</h2>
            <p className="mt-2 text-sm text-stone-600">
              Prueba con otra zona, municipio, categoría o palabra clave.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}

function buildReceivedRequestMarkers(tradeRequests: TradeRequest[], currentProfileId?: string) {
  const markers = new Map<string, ItemRequestMarker & { priority: number }>();

  if (!currentProfileId) {
    return markers;
  }

  for (const request of tradeRequests) {
    if (request.receiver.id !== currentProfileId) {
      continue;
    }

    const marker = getReceivedRequestMarker(request.status, request.id);

    if (!marker) {
      continue;
    }

    for (const item of request.offeredItems) {
      const currentMarker = markers.get(item.id);

      if (!currentMarker || marker.priority < currentMarker.priority) {
        markers.set(item.id, marker);
      }
    }
  }

  return markers;
}

function getReceivedRequestMarker(status: TradeRequestStatus, requestId: string) {
  if (status === "pending") {
    return {
      requestId,
      label: "Solicitud recibida",
      description: "Esperando tu respuesta.",
      cta: "Responder solicitud",
      tone: "pending",
      priority: 0,
    } satisfies ItemRequestMarker & { priority: number };
  }

  if (status === "countered") {
    return {
      requestId,
      label: "Contraoferta recibida",
      description: "Esperando tu respuesta.",
      cta: "Responder solicitud",
      tone: "pending",
      priority: 1,
    } satisfies ItemRequestMarker & { priority: number };
  }

  if (status === "accepted") {
    return {
      requestId,
      label: "En negociación contigo",
      description: "El chat ya está habilitado.",
      cta: "Abrir negociación",
      tone: "accepted",
      priority: 2,
    } satisfies ItemRequestMarker & { priority: number };
  }

  return null;
}

function filterItemsBySignals(
  items: Item[],
  ownersById: Record<string, { emailVerified?: boolean; phoneVerified?: boolean } | undefined>,
  requestMarkersByItemId: Map<string, ItemRequestMarker & { priority: number }>,
  savedItemIds: Set<string>,
  filters: Awaited<ItemsPageProps["searchParams"]>,
) {
  return items.filter((item) => {
    const owner = ownersById[item.ownerId];
    const matchesRequestFilter = filters.hasRequest !== "received" || requestMarkersByItemId.has(item.id);
    const matchesSavedFilter = filters.saved !== "true" || savedItemIds.has(item.id);
    const matchesVerifiedFilter = filters.verifiedProfile !== "true"
      || Boolean(owner?.emailVerified || owner?.phoneVerified);

    return matchesRequestFilter && matchesSavedFilter && matchesVerifiedFilter;
  });
}

function sortItemsByRequestPriority(
  items: Item[],
  requestMarkersByItemId: Map<string, ItemRequestMarker & { priority: number }>,
  context: {
    currentProfile: Profile | null;
    filters: Awaited<ItemsPageProps["searchParams"]>;
    ownersById: Record<string, Profile>;
    viewerInterestSlugs: string[];
  },
) {
  const shouldUseMatchSort = context.filters.sort === "match" && Boolean(context.currentProfile);

  return items
    .map((item, index) => ({
      item,
      index,
      isOwnItem: context.currentProfile?.id === item.ownerId,
      matchScore: shouldUseMatchSort ? getMatchScore(item, context) : 0,
      publishedAt: new Date(item.createdAt).getTime(),
    }))
    .sort((first, second) => {
      const firstPriority = requestMarkersByItemId.get(first.item.id)?.priority ?? 10;
      const secondPriority = requestMarkersByItemId.get(second.item.id)?.priority ?? 10;

      if (firstPriority !== secondPriority) {
        return firstPriority - secondPriority;
      }

      if (shouldUseMatchSort) {
        const ownItemOrder = Number(first.isOwnItem) - Number(second.isOwnItem);

        if (ownItemOrder !== 0) {
          return ownItemOrder;
        }

        if (first.matchScore !== second.matchScore) {
          return second.matchScore - first.matchScore;
        }

        if (first.publishedAt !== second.publishedAt) {
          return second.publishedAt - first.publishedAt;
        }
      }

      return first.index - second.index;
    })
    .map(({ item }) => item);
}

function buildMatchSignalsByItemId(
  items: Item[],
  context: {
    currentProfile: Profile | null;
    filters: Awaited<ItemsPageProps["searchParams"]>;
    ownersById: Record<string, Profile>;
    viewerInterestSlugs: string[];
  },
) {
  if (context.filters.sort !== "match" || !context.currentProfile) {
    return new Map<string, ItemMatchSignal>();
  }

  return new Map(
    items.flatMap((item) => {
      const owner = context.ownersById[item.ownerId];

      if (!owner || item.ownerId === context.currentProfile?.id || !hasInterestOverlap(item, context.viewerInterestSlugs)) {
        return [];
      }

      const matchScore = getMatchScore(item, context);

      return matchScore >= 45 ? [[item.id, "good_match" as const]] : [];
    }),
  );
}

function getMatchScore(
  item: Item,
  context: {
    currentProfile: Profile | null;
    ownersById: Record<string, Profile>;
    viewerInterestSlugs: string[];
  },
) {
  const owner = context.ownersById[item.ownerId];

  if (!context.currentProfile || !owner) {
    return 0;
  }

  return calculateMatchScore({
    item,
    owner,
    viewer: context.currentProfile,
    viewerPrivateInterestSlugs: context.viewerInterestSlugs,
  }).score;
}
