import type { Metadata } from "next";
import { ArrowRight, MapPin, Pencil, ShieldCheck, Tags } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ItemPhotoGallery } from "@/components/item-photo-gallery";
import { ItemStatusForm } from "@/components/item-status-form";
import { RetireItemForm } from "@/components/retire-item-form";
import { BlockUserForm, ReportForm, SafetyActionsPanel } from "@/components/safety-actions";
import { SaveItemButton } from "@/components/save-item-button";
import { ShareItemButton } from "@/components/share-item-button";
import { TrustBadge } from "@/components/trust-badge";
import { siteUrl } from "@/lib/app-config";
import { conditionLabels, valueRangeLabels } from "@/lib/constants";
import {
  getCurrentProfile,
  getCurrentProfilePrivateInterestTags,
  getItemDetail,
  getOwnActiveItems,
  getSavedItemIdsForCurrentUser,
  recordItemView,
} from "@/lib/data";
import { getViewerInterestSlugs } from "@/lib/item-matching";
import { getMexicoStateDisplayName } from "@/lib/mexico-locations";
import { calculateMatchScore } from "@/lib/trade-rules";

type ItemDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export async function generateMetadata({ params }: ItemDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const detail = await getItemDetail(id);

  if (!detail) {
    return {
      title: "Publicación no encontrada",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const { item } = detail;
  const itemUrl = `${siteUrl}/items/${item.id}`;
  const location = `${item.city}, ${getMexicoStateDisplayName(item.state)}`;
  const description = truncateMetadataDescription(
    `${item.title} en ${location}. Trueka: artículos por artículos, sin pagos ni envíos gestionados.`,
  );
  const imageUrl = getAbsoluteItemImageUrl(item.photoUrls[0]);

  return {
    title: item.title,
    description,
    alternates: {
      canonical: itemUrl,
    },
    openGraph: {
      title: `${item.title} en Trueka`,
      description,
      url: itemUrl,
      type: "article",
      images: imageUrl
        ? [
            {
              url: imageUrl,
              alt: item.title,
            },
          ]
        : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: `${item.title} en Trueka`,
      description,
      images: imageUrl ? [imageUrl] : undefined,
    },
  };
}

export default async function ItemDetailPage({ params }: ItemDetailPageProps) {
  const { id } = await params;
  const [detail, currentProfile] = await Promise.all([
    getItemDetail(id),
    getCurrentProfile(),
  ]);

  if (!detail) {
    notFound();
  }

  const { item, owner } = detail;
  const itemUrl = `${siteUrl}/items/${item.id}`;
  const isOwnItem = currentProfile?.id === item.ownerId;
  const [savedItemIds, ownActiveItems, profileInterestTags] = currentProfile
    ? await Promise.all([
      getSavedItemIdsForCurrentUser(),
      isOwnItem ? Promise.resolve({ items: [] }) : getOwnActiveItems(),
      getCurrentProfilePrivateInterestTags(),
    ])
    : [[], { items: [] }, []];

  if (currentProfile && !isOwnItem) {
    await recordItemView(item.id);
  }

  const match = currentProfile && !isOwnItem
    ? calculateMatchScore({
      viewer: currentProfile,
      owner,
      item,
      viewerPrivateInterestSlugs: getViewerInterestSlugs(ownActiveItems.items, profileInterestTags),
    })
    : null;

  return (
    <main className={isOwnItem ? "flex-1" : "flex-1 pb-24 lg:pb-0"}>
      <section className="mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1.15fr)_420px] lg:px-8">
        <div className="space-y-6">
          <ItemPhotoGallery title={item.title} photoUrls={item.photoUrls} />

          <section className="rounded-lg border border-stone-200 bg-white p-5">
            <SaveItemButton
              key={`${item.id}-${savedItemIds.includes(item.id) ? "saved" : "not-saved"}`}
              itemId={item.id}
              isOwnItem={Boolean(isOwnItem)}
              isSaved={savedItemIds.includes(item.id)}
              currentProfile={currentProfile}
              nextPath={`/items/${item.id}`}
              variant="inline"
            />
            <p className="text-sm font-semibold text-emerald-800">{item.category.name}</p>
            <h1 className="mt-2 text-3xl font-semibold text-stone-950">{item.title}</h1>
            <div className="mt-3 flex flex-wrap gap-3 text-sm text-stone-600">
              <span className="inline-flex items-center gap-2">
                <MapPin aria-hidden="true" size={16} />
                {item.city}, {getMexicoStateDisplayName(item.state)}
              </span>
              <span>{conditionLabels[item.condition]}</span>
              {item.approximateValueRange ? (
                <span>{valueRangeLabels[item.approximateValueRange]} · orientación</span>
              ) : null}
            </div>

            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <div>
                <h2 className="text-sm font-semibold uppercase text-stone-500">Descripción real</h2>
                <p className="mt-2 leading-7 text-stone-700">{item.description}</p>
              </div>
              <div>
                <h2 className="text-sm font-semibold uppercase text-stone-500">Defectos o detalles</h2>
                <p className="mt-2 leading-7 text-stone-700">{item.knownDefects}</p>
              </div>
            </div>

            {item.publicPreferences ? (
              <div className="mt-6 rounded-md bg-emerald-50 p-4 text-sm leading-6 text-emerald-950">
                {item.publicPreferences}
              </div>
            ) : null}

            <div className="mt-6 flex flex-wrap gap-2">
              {item.publicTags.map((tag) => (
                <span
                  key={tag.id}
                  className="inline-flex items-center gap-1 rounded-md border border-stone-200 px-2 py-1 text-xs font-medium text-stone-700"
                >
                  <Tags aria-hidden="true" size={13} />
                  {tag.name}
                </span>
              ))}
            </div>
          </section>
        </div>

        <aside className="space-y-4">
          <section className="rounded-lg border border-stone-200 bg-white p-5">
            <h2 className="text-lg font-semibold text-stone-950">Dueño del artículo</h2>
            <Link
              href={`/users/${owner.id}`}
              className="mt-2 inline-block font-medium text-emerald-800 hover:text-emerald-950"
            >
              {owner.displayName}
            </Link>
            <p className="text-sm text-stone-600">
              {owner.city}, {getMexicoStateDisplayName(owner.state)}
            </p>
            <div className="mt-3">
              <TrustBadge profile={owner} />
            </div>
            <p className="mt-4 text-sm leading-6 text-stone-600">{owner.bio}</p>
          </section>

          {match ? (
            <section className="rounded-lg border border-emerald-200 bg-white p-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
              <ShieldCheck aria-hidden="true" size={17} />
              Señales para ti
            </div>
            <div className="mt-3 space-y-2">
              {match.signals.slice(0, 3).map((signal) => (
                <p key={signal.label} className="text-sm text-stone-600">
                  {signal.label}
                </p>
              ))}
            </div>
            </section>
          ) : null}

          <section className="rounded-lg border border-stone-200 bg-white p-5">
            {isOwnItem ? (
              <div className="rounded-md border border-stone-200 bg-stone-50 px-4 py-3 text-sm font-semibold text-stone-700">
                Esta es tu publicación. No puedes enviarte una solicitud de trueque.
              </div>
            ) : (
              <Link
                href={`/requests/new?item=${item.id}`}
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-md bg-emerald-700 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-800"
              >
                Proponer trueque
                <ArrowRight aria-hidden="true" size={16} />
              </Link>
            )}
            {isOwnItem ? (
              <div className="mt-3">
                <Link
                  href={`/items/${item.id}/edit`}
                  className="mb-3 inline-flex w-full items-center justify-center gap-2 rounded-md bg-emerald-700 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-800"
                >
                  <Pencil aria-hidden="true" size={16} />
                  Editar publicación
                </Link>
                <ItemStatusForm itemId={item.id} status={item.status} />
                <div className="mt-3">
                  <RetireItemForm itemId={item.id} />
                </div>
              </div>
            ) : null}
            <div className="mt-3">
              <ShareItemButton title={item.title} shareUrl={itemUrl} />
            </div>
            <p className="mt-3 text-xs leading-5 text-stone-500">
              La propuesta se arma con artículos propios. No hay pagos ni envíos gestionados.
            </p>
            <div className="mt-4">
              <SafetyActionsPanel
                title="Reportar o bloquear"
                description="Abre estas acciones solo si la publicación parece falsa, prohibida o incómoda."
              >
                <ReportForm
                  reportedUserId={owner.id}
                  reportedItemId={item.id}
                  defaultReason="false_information"
                  buttonLabel="Reportar publicación"
                />
                {!isOwnItem ? <BlockUserForm blockedUserId={owner.id} /> : null}
              </SafetyActionsPanel>
            </div>
          </section>
        </aside>
      </section>

      {!isOwnItem ? (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-stone-200 bg-white/95 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 shadow-[0_-12px_30px_rgba(28,25,23,0.10)] backdrop-blur lg:hidden">
          <Link
            href={`/requests/new?item=${item.id}`}
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800"
          >
            Proponer trueque
            <ArrowRight aria-hidden="true" size={17} />
          </Link>
          <p className="mt-1 text-center text-[11px] font-medium text-stone-500">
            Art&iacute;culos por art&iacute;culos. Sin dinero.
          </p>
        </div>
      ) : null}
    </main>
  );
}

function getAbsoluteItemImageUrl(imageUrl?: string) {
  if (!imageUrl || imageUrl === "/window.svg") {
    return undefined;
  }

  try {
    return new URL(imageUrl, siteUrl).toString();
  } catch {
    return undefined;
  }
}

function truncateMetadataDescription(value: string) {
  return value.length > 155 ? `${value.slice(0, 152).trim()}...` : value;
}
