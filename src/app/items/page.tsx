import { Search, SlidersHorizontal } from "lucide-react";
import Link from "next/link";

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
import { isNearbyPostalCode } from "@/lib/postal-code-proximity";
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
    postalCode?: string;
    sort?: string;
    page?: string;
  }>;
};

export default async function ItemsPage({ searchParams }: ItemsPageProps) {
  const filters = await searchParams;
  const currentProfile = await getCurrentProfile();
  const typedPostalCode = filters.postalCode?.trim() ? filters.postalCode.trim() : undefined;
  const defaultSort = typedPostalCode ? "nearby" : "newest";
  const selectedSort = filters.sort ?? defaultSort;
  const activeAdvancedFilterCount = getActiveAdvancedFilterCount(filters, selectedSort, defaultSort);
  const effectivePostalCode = typedPostalCode ?? (selectedSort === "nearby" ? currentProfile?.postalCode : undefined);
  const effectiveFilters = {
    ...filters,
    postalCode: effectivePostalCode,
    sort: selectedSort,
  };
  const requestedPage = Number.parseInt(filters.page ?? "1", 10);
  const {
    items: filteredItems,
    ownersById,
    categories,
    page,
    hasMore,
  } = await getItemsResult(effectiveFilters, {
    page: Number.isFinite(requestedPage) ? requestedPage : 1,
    pageSize: 24,
  });
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
    effectiveFilters,
  );
  const sortedItems = sortItemsByRequestPriority(signalFilteredItems, requestMarkersByItemId, {
    currentProfile,
    filters: effectiveFilters,
    ownersById,
    viewerInterestSlugs,
  });
  const matchSignalsByItemId = buildMatchSignalsByItemId(sortedItems, {
    currentProfile,
    filters: effectiveFilters,
    ownersById,
    viewerPostalCode: effectivePostalCode,
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
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(220px,1fr)_180px_220px_48px]">
              <AutoSubmitSearchInput
                name="q"
                defaultValue={filters.q}
                placeholder="Buscar por artículo o detalle"
                className="min-h-11 w-full min-w-0 rounded-md border border-stone-200 px-3 text-sm outline-none focus:border-emerald-600"
              />
              <input
                name="postalCode"
                defaultValue={typedPostalCode ?? ""}
                inputMode="numeric"
                pattern="[0-9]{5}"
                maxLength={5}
                aria-label="Codigo postal"
                placeholder="CP cerca de ti"
                className="min-h-11 w-full min-w-0 rounded-md border border-stone-200 px-3 text-sm outline-none focus:border-emerald-600"
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
                className="grid min-h-11 min-w-0 place-items-center rounded-md bg-emerald-700 text-white hover:bg-emerald-800"
              >
                <Search aria-hidden="true" size={19} />
              </button>
            </div>

            <details
              className="mt-3 [&:not([open])>div]:hidden md:[&:not([open])>div]:grid"
              open={activeAdvancedFilterCount > 0}
            >
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-md border border-stone-200 px-3 text-sm font-semibold text-stone-700 transition hover:bg-stone-50 md:hidden [&::-webkit-details-marker]:hidden">
                <span className="inline-flex items-center gap-2">
                  <SlidersHorizontal aria-hidden="true" size={17} />
                  M&aacute;s filtros
                </span>
                {activeAdvancedFilterCount > 0 ? (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">
                    {activeAdvancedFilterCount}
                  </span>
                ) : null}
              </summary>

              <div className="mt-3 grid gap-3 md:mt-0 md:grid md:grid-cols-2 xl:grid-cols-4">
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
                name="sort"
                defaultValue={selectedSort}
                className="min-h-11 w-full min-w-0 rounded-md border border-stone-200 px-3 text-sm outline-none focus:border-emerald-600"
              >
                <option value="nearby">Publicaciones cerca de mi</option>
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
            </details>
            {selectedSort === "nearby" && !effectivePostalCode ? (
              <p className="mt-3 text-sm leading-6 text-amber-800">
                Agrega un codigo postal en el filtro o en tu perfil para ordenar por cercania.
              </p>
            ) : null}
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
        {page > 1 || hasMore ? (
          <nav
            aria-label="Paginacion de publicaciones"
            className="mt-8 flex items-center justify-center gap-3"
          >
            {page > 1 ? (
              <Link
                href={getItemsPageHref(filters, page - 1)}
                className="inline-flex min-h-11 items-center rounded-md border border-stone-300 bg-white px-4 text-sm font-semibold text-stone-800 hover:bg-stone-50"
              >
                Anterior
              </Link>
            ) : null}
            <span className="text-sm font-medium text-stone-600">Pagina {page}</span>
            {hasMore ? (
              <Link
                href={getItemsPageHref(filters, page + 1)}
                className="inline-flex min-h-11 items-center rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white hover:bg-emerald-800"
              >
                Siguiente
              </Link>
            ) : null}
          </nav>
        ) : null}
      </section>
    </main>
  );
}

function getItemsPageHref(
  filters: Awaited<ItemsPageProps["searchParams"]>,
  page: number,
) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(filters)) {
    if (value && key !== "page") {
      params.set(key, value);
    }
  }

  if (page > 1) {
    params.set("page", String(page));
  }

  const query = params.toString();

  return query ? `/items?${query}` : "/items";
}

function getActiveAdvancedFilterCount(
  filters: Awaited<ItemsPageProps["searchParams"]>,
  selectedSort: string,
  defaultSort: string,
) {
  return [
    filters.state,
    filters.city,
    filters.condition,
    filters.valueRange,
    filters.acceptsOtherCities,
    filters.hasRequest,
    filters.saved,
    filters.verifiedProfile,
    selectedSort !== defaultSort ? selectedSort : "",
  ].filter(Boolean).length;
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
    viewerPostalCode?: string;
    viewerInterestSlugs: string[];
  },
) {
  if (context.filters.sort === "nearby" && context.viewerPostalCode) {
    return new Map(
      items.flatMap((item) => (
        item.ownerId !== context.currentProfile?.id && isNearbyPostalCode(item.postalCode, context.viewerPostalCode)
          ? [[item.id, "nearby" as const]]
          : []
      )),
    );
  }

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
