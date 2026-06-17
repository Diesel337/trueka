import { ArrowRight, Eye, ImageIcon, Inbox, MapPin, Pencil, Repeat2, Sparkles, Tags } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { conditionLabels, valueRangeLabels } from "@/lib/constants";
import { getMexicoStateDisplayName } from "@/lib/mexico-locations";
import { currentUser, getOwner } from "@/lib/mock-data";
import { areSameCity } from "@/lib/trade-rules";
import type { Item, ItemStatus, Profile } from "@/lib/types";

import { ItemStatusForm } from "./item-status-form";
import { SaveItemButton } from "./save-item-button";
import { TrustBadge } from "./trust-badge";

export type ItemRequestMarker = {
  requestId: string;
  label: string;
  description: string;
  cta: string;
  tone: "pending" | "accepted";
};

export type ItemMatchSignal = "good_match" | "nearby";

const itemStatusLabels: Record<ItemStatus, string> = {
  draft: "Borrador",
  active: "Activa",
  paused: "Pausada",
  reserved: "En negociación",
  traded: "Intercambiada",
  deleted: "Eliminada",
  hidden_by_admin: "Oculta",
};

export function ItemCard({
  item,
  owner,
  compact = false,
  currentProfile,
  showOwnerControls = false,
  requestMarker,
  matchSignal,
  isSaved,
}: {
  item: Item;
  owner?: Profile;
  compact?: boolean;
  currentProfile?: Profile | null;
  showOwnerControls?: boolean;
  requestMarker?: ItemRequestMarker;
  matchSignal?: ItemMatchSignal;
  isSaved?: boolean;
}) {
  const resolvedOwner = owner ?? getOwner(item);
  const viewer = currentProfile ?? currentUser;
  const isOwnItem = item.ownerId === viewer.id;
  const primaryPhotoUrl = item.photoUrls[0];
  const personalSignal = getPersonalSignal({
    currentProfile,
    isOwnItem,
    matchSignal,
    owner: resolvedOwner,
  });
  const isCompactOwnCard = compact && isOwnItem;
  const articleClassName = compact
    ? "overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm transition hover:border-stone-300 hover:shadow"
    : "overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md";
  const imageClassName = compact ? "relative aspect-[16/9] bg-stone-100" : "relative aspect-[4/3] bg-stone-100";
  const imageSizes = compact
    ? "(min-width: 1536px) 20vw, (min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
    : "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw";
  const bodyClassName = compact ? "space-y-2.5 p-3" : "space-y-4 p-4";
  const titleClassName = compact
    ? "line-clamp-1 text-base font-semibold text-stone-950"
    : "line-clamp-2 text-lg font-semibold text-stone-950";
  const descriptionClassName = compact
    ? "mt-1 line-clamp-1 text-xs leading-5 text-stone-600"
    : "mt-2 line-clamp-2 text-sm leading-6 text-stone-600";
  const ownerControlButtonClassName = compact
    ? "inline-flex w-full items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-semibold transition"
    : "inline-flex w-full items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-semibold transition";
  const ownerControlIconSize = compact ? 14 : 16;

  return (
    <article className={articleClassName}>
      <div className="relative">
        <Link href={`/items/${item.id}`} className="block">
          <div className={imageClassName}>
            {primaryPhotoUrl ? (
              <Image
                src={primaryPhotoUrl}
                alt={item.title}
                fill
                sizes={imageSizes}
                className="object-cover"
                unoptimized
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center text-stone-500">
                <ImageIcon aria-hidden="true" size={30} />
                <span className="text-sm font-semibold text-stone-700">Sin foto todavía</span>
                <span className="text-xs">Agrega una foto para publicar.</span>
              </div>
            )}
            <span className="absolute left-3 top-3 rounded-md bg-white/95 px-2 py-1 text-xs font-semibold text-emerald-900 shadow-sm">
              {item.category.name}
            </span>
          </div>
        </Link>
        <SaveItemButton
          key={`${item.id}-${isSaved ? "saved" : "not-saved"}`}
          itemId={item.id}
          isOwnItem={isOwnItem}
          isSaved={isSaved}
          currentProfile={currentProfile}
          nextPath={`/items/${item.id}`}
        />
      </div>
      <div className={bodyClassName}>
        <div>
          <div
            className={`flex flex-wrap items-center text-stone-600 ${
              compact ? "mb-1 gap-1.5 text-xs" : "mb-2 gap-2 text-sm"
            }`}
          >
            <span className="inline-flex min-w-0 items-center gap-2">
              <MapPin aria-hidden="true" size={15} className="shrink-0" />
              <span>
                {item.city}, {getMexicoStateDisplayName(item.state)}
              </span>
            </span>
            {personalSignal ? <PersonalSignalBadge signal={personalSignal} /> : null}
          </div>
          <Link href={`/items/${item.id}`}>
            <h2 className={titleClassName}>{item.title}</h2>
          </Link>
          {!isCompactOwnCard ? (
            <Link
              href={`/users/${resolvedOwner.id}`}
              className={`mt-1 inline-block font-medium text-emerald-800 hover:text-emerald-950 ${
                compact ? "text-xs" : "text-sm"
              }`}
            >
              {resolvedOwner.displayName}
            </Link>
          ) : null}
          {requestMarker ? (
            <Link
              href={`/requests/${requestMarker.requestId}`}
              className={`mt-3 flex items-start gap-2 rounded-md border p-3 text-sm leading-5 ${
                requestMarker.tone === "accepted"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-950"
                  : "border-amber-200 bg-amber-50 text-amber-950"
              }`}
            >
              <Inbox aria-hidden="true" size={16} className="mt-0.5 shrink-0" />
              <span>
                <span className="block font-semibold">{requestMarker.label}</span>
                <span>{requestMarker.description}</span>
              </span>
            </Link>
          ) : null}
          <p className={descriptionClassName}>{item.description}</p>
        </div>

        {!compact ? (
          <div className="space-y-2 text-sm text-stone-700">
            <div className="flex items-center gap-2">
              <Repeat2 aria-hidden="true" size={15} className="text-emerald-700" />
              <span>{conditionLabels[item.condition]}</span>
            </div>
            {item.approximateValueRange ? (
              <div className="flex items-center gap-2">
                <Tags aria-hidden="true" size={15} className="text-amber-700" />
                <span>{valueRangeLabels[item.approximateValueRange]} · solo orientación</span>
              </div>
            ) : null}
          </div>
        ) : null}

        {!isCompactOwnCard ? <TrustBadge profile={resolvedOwner} /> : null}

        {isOwnItem ? (
          <div className={compact ? "grid gap-1.5" : "grid gap-2"}>
            <div
              className={`inline-flex items-center justify-center gap-2 rounded-md bg-stone-50 font-semibold text-stone-700 ${
                compact ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm"
              }`}
            >
              <Eye aria-hidden="true" size={ownerControlIconSize} />
              {(item.viewCount ?? 0).toLocaleString("es-MX")} vistas únicas
            </div>
            <span
              className={`inline-flex items-center justify-center rounded-md font-semibold ${
                compact ? "min-h-8 px-2 py-1 text-xs" : "min-h-10 px-3 py-2 text-sm"
              } ${
                item.status === "active"
                  ? "bg-emerald-50 text-emerald-800"
                  : "bg-stone-100 text-stone-600"
              }`}
            >
              {getItemStatusLabel(item)}
            </span>
            {showOwnerControls ? (
              <ItemStatusForm
                itemId={item.id}
                status={item.status}
                moderationStatus={item.moderationStatus}
                hasPhotos={item.photoUrls.length > 0}
                compact={compact}
              />
            ) : null}
            {showOwnerControls ? (
              <Link
                href={`/items/${item.id}/edit`}
                className={`${ownerControlButtonClassName} bg-emerald-700 text-white hover:bg-emerald-800`}
              >
                <Pencil aria-hidden="true" size={ownerControlIconSize} />
                Editar
              </Link>
            ) : null}
            <Link
              href={`/items/${item.id}`}
              className={`${ownerControlButtonClassName} border border-stone-300 text-stone-700 hover:bg-stone-50`}
            >
              {compact ? "Ver" : "Tu publicación"}
              <ArrowRight aria-hidden="true" size={ownerControlIconSize} />
            </Link>
          </div>
        ) : requestMarker ? (
          <Link
            href={`/requests/${requestMarker.requestId}`}
            className={`inline-flex w-full items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-semibold transition ${
              requestMarker.tone === "accepted"
                ? "bg-emerald-700 text-white hover:bg-emerald-800"
                : "bg-amber-600 text-white hover:bg-amber-700"
            }`}
          >
            {requestMarker.cta}
            <ArrowRight aria-hidden="true" size={16} />
          </Link>
        ) : (
          <Link
            href={`/requests/new?item=${item.id}`}
            className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800"
          >
            Proponer trueque
            <ArrowRight aria-hidden="true" size={16} />
          </Link>
        )}
      </div>
    </article>
  );
}

function getItemStatusLabel(item: Item) {
  if (item.moderationStatus === "pending" || item.moderationStatus === "flagged") {
    return "En revisión";
  }

  if (item.moderationStatus === "rejected") {
    return "Rechazada";
  }

  if (item.moderationStatus === "hidden_by_admin") {
    return "Oculta";
  }

  return itemStatusLabels[item.status];
}

function getPersonalSignal({
  currentProfile,
  isOwnItem,
  matchSignal,
  owner,
}: {
  currentProfile?: Profile | null;
  isOwnItem: boolean;
  matchSignal?: ItemMatchSignal;
  owner: Profile;
}) {
  if (!currentProfile || isOwnItem) {
    return null;
  }

  if (matchSignal) {
    return matchSignal;
  }

  return areSameCity(currentProfile, owner) ? "nearby" : null;
}

function PersonalSignalBadge({ signal }: { signal: ItemMatchSignal }) {
  const isGoodMatch = signal === "good_match";
  const Icon = isGoodMatch ? Sparkles : MapPin;

  return (
    <span
      className={`inline-flex min-h-7 items-center gap-1 rounded-md px-2 text-xs font-semibold ${
        isGoodMatch
          ? "bg-emerald-50 text-emerald-800"
          : "bg-sky-50 text-sky-800"
      }`}
    >
      <Icon aria-hidden="true" size={13} />
      {isGoodMatch ? "Buen match" : "Cerca de ti"}
    </span>
  );
}
