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

  return (
    <article className="overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="relative">
        <Link href={`/items/${item.id}`} className="block">
          <div className="relative aspect-[4/3] bg-stone-100">
            {primaryPhotoUrl ? (
              <Image
                src={primaryPhotoUrl}
                alt={item.title}
                fill
                sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
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
      <div className="space-y-4 p-4">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2 text-sm text-stone-600">
            <span className="inline-flex min-w-0 items-center gap-2">
              <MapPin aria-hidden="true" size={15} className="shrink-0" />
              <span>
                {item.city}, {getMexicoStateDisplayName(item.state)}
              </span>
            </span>
            {personalSignal ? <PersonalSignalBadge signal={personalSignal} /> : null}
          </div>
          <Link href={`/items/${item.id}`}>
            <h2 className="line-clamp-2 text-lg font-semibold text-stone-950">{item.title}</h2>
          </Link>
          <Link
            href={`/users/${resolvedOwner.id}`}
            className="mt-1 inline-block text-sm font-medium text-emerald-800 hover:text-emerald-950"
          >
            {resolvedOwner.displayName}
          </Link>
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
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-stone-600">{item.description}</p>
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

        <TrustBadge profile={resolvedOwner} />

        {isOwnItem ? (
          <div className="grid gap-2">
            <div className="inline-flex items-center justify-center gap-2 rounded-md bg-stone-50 px-4 py-2 text-sm font-semibold text-stone-700">
              <Eye aria-hidden="true" size={16} />
              {(item.viewCount ?? 0).toLocaleString("es-MX")} vistas únicas
            </div>
            <span
              className={`inline-flex min-h-10 items-center justify-center rounded-md px-3 py-2 text-sm font-semibold ${
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
              />
            ) : null}
            {showOwnerControls ? (
              <Link
                href={`/items/${item.id}/edit`}
                className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800"
              >
                <Pencil aria-hidden="true" size={16} />
                Editar
              </Link>
            ) : null}
            <Link
              href={`/items/${item.id}`}
              className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-stone-300 px-4 py-2.5 text-sm font-semibold text-stone-700 transition hover:bg-stone-50"
            >
              Tu publicación
              <ArrowRight aria-hidden="true" size={16} />
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
