import { forbiddenTradeRequestFieldNames } from "./constants";
import { isNearbyPostalCode } from "./postal-code-proximity";
import type { Item, MatchScore, Profile, TradeRequestStatus, ValueRange } from "./types";

type OfferedItemDraft = Pick<Item, "id" | "ownerId" | "status" | "moderationStatus">;

export type TradeRequestDraft = {
  requesterId: string;
  requestedItem: Pick<Item, "id" | "ownerId" | "status" | "moderationStatus">;
  offeredItems: OfferedItemDraft[];
  receiverId: string;
  usersAreBlocked?: boolean;
  unexpectedFields?: Record<string, unknown>;
};

const guadalajaraMetroCities = new Set([
  "guadalajara",
  "zapopan",
  "tlaquepaque",
  "san pedro tlaquepaque",
  "tonala",
  "tlajomulco",
  "tlajomulco de zuniga",
]);

export function areSameCity(
  first: Pick<Profile, "city" | "state">,
  second: Pick<Profile, "city" | "state">,
) {
  return getTradeZone(first) === getTradeZone(second);
}

export function buildTradeRequestNotice(
  requester: Pick<Profile, "city" | "state">,
  receiver: Pick<Profile, "city" | "state">,
) {
  if (areSameCity(requester, receiver)) {
    return "Nueva solicitud de trueque.";
  }

  return `Nueva solicitud de trueque de un usuario de ${requester.city}, ${requester.state}.`;
}

export function getCrossCityWarning(
  requester: Pick<Profile, "city" | "state">,
  receiver: Pick<Profile, "city" | "state">,
) {
  if (areSameCity(requester, receiver)) {
    return null;
  }

  return "Este usuario está en otra ciudad o zona. Trueka no gestiona envíos ni entregas. Acuerden bajo su responsabilidad.";
}

export function validateTradeRequestDraft(draft: TradeRequestDraft) {
  const errors: string[] = [];
  const forbiddenTokens = forbiddenTradeRequestFieldNames.map(normalizeFieldName);
  const forbiddenFields = Object.keys(draft.unexpectedFields ?? {}).filter((fieldName) => {
    const normalizedFieldName = normalizeFieldName(fieldName);

    return forbiddenTokens.some((token) => normalizedFieldName.includes(token));
  });

  if (forbiddenFields.length > 0) {
    errors.push("La solicitud de trueque no puede incluir dinero, pagos ni envíos gestionados.");
  }

  if (draft.requesterId === draft.requestedItem.ownerId) {
    errors.push("No puedes proponer trueque por un artículo propio.");
  }

  if (draft.requestedItem.status !== "active" || draft.requestedItem.moderationStatus !== "active") {
    errors.push("El artículo solicitado debe estar activo.");
  }

  if (draft.offeredItems.length === 0) {
    errors.push("Debes ofrecer al menos un artículo propio.");
  }

  const repeatedOfferedItems = new Set<string>();
  const seenOfferedItems = new Set<string>();

  for (const item of draft.offeredItems) {
    if (seenOfferedItems.has(item.id)) {
      repeatedOfferedItems.add(item.id);
    }

    seenOfferedItems.add(item.id);

    if (item.ownerId !== draft.requesterId) {
      errors.push("Solo puedes ofrecer artículos que sean tuyos.");
    }

    if (item.status !== "active" || item.moderationStatus !== "active") {
      errors.push("Solo puedes ofrecer artículos activos.");
    }
  }

  if (repeatedOfferedItems.size > 0) {
    errors.push("No repitas artículos en la misma solicitud.");
  }

  if (draft.usersAreBlocked) {
    errors.push("No puedes interactuar con un usuario bloqueado.");
  }

  if (draft.receiverId === draft.requesterId) {
    errors.push("No puedes enviarte una solicitud a ti mismo.");
  }

  return Array.from(new Set(errors));
}

export function canCompleteTradeRequest(items: Pick<Item, "status" | "moderationStatus">[]) {
  return items.every((item) =>
    (item.status === "active" || item.status === "reserved") && item.moderationStatus === "active",
  );
}

export function canCancelTradeRequest(input: {
  status: TradeRequestStatus;
  isRequester: boolean;
  isReceiver: boolean;
  hasCompletionConfirmation: boolean;
}) {
  if (input.status === "pending" || input.status === "countered") {
    return input.isRequester;
  }

  if (input.status === "accepted") {
    return (input.isRequester || input.isReceiver) && !input.hasCompletionConfirmation;
  }

  return false;
}

export function canUseTradeRequestChat(status: TradeRequestStatus) {
  return status === "accepted" || status === "completed";
}

export function calculateMatchScore(input: {
  viewer: Pick<Profile, "city" | "state" | "postalCode" | "ratingAvg" | "emailVerified" | "phoneVerified">;
  item: Item;
  viewerPrivateInterestSlugs: string[];
  owner: Pick<Profile, "city" | "state" | "postalCode" | "ratingAvg" | "emailVerified" | "phoneVerified">;
}) {
  const signals: MatchScore["signals"] = [];
  const itemTagSlugs = new Set([
    input.item.category.slug,
    ...input.item.publicTags.map((tag) => tag.slug),
  ]);

  const tagMatches = input.viewerPrivateInterestSlugs.filter((slug) => itemTagSlugs.has(slug));

  if (tagMatches.length > 0) {
    signals.push({ label: "Coincide con tus intereses privados", points: 35 });
  }

  if (isNearbyPostalCode(input.item.postalCode, input.viewer.postalCode)) {
    signals.push({ label: "Esta cerca de tu codigo postal", points: 25 });
  } else if (areSameCity(input.viewer, input.owner)) {
    signals.push({ label: "Está en tu zona", points: 20 });
  } else if (input.item.acceptsOtherCities) {
    signals.push({ label: "Acepta propuestas de otra ciudad", points: 10 });
  }

  if (hasComparableValueRange(input.item.approximateValueRange)) {
    signals.push({ label: "Tiene rango orientativo para comparar con calma", points: 15 });
  }

  if (input.owner.ratingAvg >= 4.5 && input.owner.emailVerified && input.owner.phoneVerified) {
    signals.push({ label: "Perfil con buenas señales de confianza", points: 10 });
  }

  signals.push({ label: "Publicación reciente", points: 10 });

  return {
    score: Math.min(100, signals.reduce((sum, signal) => sum + signal.points, 0)),
    signals,
  };
}

function getTradeZone(location: Pick<Profile, "city" | "state">) {
  const city = normalizeLocation(location.city);
  const state = normalizeLocation(location.state);

  if (state === "jalisco" && guadalajaraMetroCities.has(city)) {
    return "jalisco:zona-metropolitana-guadalajara";
  }

  return `${state}:${city}`;
}

function normalizeLocation(value: string) {
  return value
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("es-MX");
}

function normalizeFieldName(value: string) {
  return value.trim().toLocaleLowerCase("es-MX").replaceAll("_", "").replaceAll("-", "");
}

function hasComparableValueRange(value?: ValueRange) {
  return Boolean(value && value !== "prefer_not_to_say");
}
