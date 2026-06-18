import { categories, privateInterestTags } from "./constants";
import type { Item, Profile, TradeRequest } from "./types";

export const profiles: Profile[] = [
  {
    id: "user-ana",
    displayName: "Ana Torres",
    city: "Guadalajara",
    state: "Jalisco",
    country: "México",
    postalCode: "44100",
    bio: "Cambio cosas útiles de casa por tecnología, herramientas o libros.",
    phoneVerified: true,
    emailVerified: true,
    ratingAvg: 4.8,
    ratingCount: 18,
    completedTradesCount: 12,
    publishedItemsCount: 92,
    memberSince: "2025-11-04",
  },
  {
    id: "user-luis",
    displayName: "Luis Medina",
    city: "Zapopan",
    state: "Jalisco",
    country: "México",
    postalCode: "45030",
    bio: "Me interesan consolas, audio, bicis y herramientas.",
    phoneVerified: true,
    emailVerified: true,
    ratingAvg: 4.6,
    ratingCount: 11,
    completedTradesCount: 8,
    publishedItemsCount: 64,
    memberSince: "2025-12-19",
  },
  {
    id: "user-maya",
    displayName: "Maya Ríos",
    city: "Monterrey",
    state: "Nuevo León",
    country: "México",
    postalCode: "64000",
    bio: "Publico artículos con detalles claros. Abierta a propuestas si hacen sentido.",
    phoneVerified: true,
    emailVerified: true,
    ratingAvg: 5,
    ratingCount: 7,
    completedTradesCount: 5,
    publishedItemsCount: 28,
    memberSince: "2026-01-16",
  },
];

const byCategory = (slug: string) => {
  const category = categories.find((entry) => entry.slug === slug);

  if (!category) {
    throw new Error(`Missing mock category: ${slug}`);
  }

  return category;
};

const byTag = (slug: string) => {
  const tag = privateInterestTags.find((entry) => entry.slug === slug);

  if (!tag) {
    throw new Error(`Missing mock tag: ${slug}`);
  }

  return tag;
};

export const items: Item[] = [
  {
    id: "item-laptop-hp",
    ownerId: "user-ana",
    title: "Laptop HP 15 con cargador",
    description:
      "Funciona para oficina, clases y navegación. Tiene Windows instalado, cargador original y teclado completo.",
    knownDefects: "La batería dura poco y una esquina tiene un golpe visible.",
    condition: "works_with_issues",
    category: byCategory("computadoras-laptops"),
    city: "Guadalajara",
    state: "Jalisco",
    country: "México",
    postalCode: "44100",
    approximateZone: "Santa Tere",
    approximateValueRange: "3000_7000",
    acceptsMultipleItems: true,
    acceptsOtherCities: false,
    publicPreferences: "Prefiero electrónicos, herramientas o consolas. También escucho propuestas.",
    publicTags: [byTag("laptops"), byTag("herramientas")],
    privateInterestTags: [byTag("consolas"), byTag("herramientas"), byTag("audio")],
    status: "active",
    moderationStatus: "active",
    photoUrls: [
      "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=1200&q=80",
    ],
    createdAt: "2026-06-01T16:00:00.000Z",
  },
  {
    id: "item-bike-urbana",
    ownerId: "user-luis",
    title: "Bicicleta urbana rodada 26",
    description:
      "Bici ligera para traslados cortos. Cambios funcionando y llantas con buen dibujo.",
    knownDefects: "El asiento está raspado y los frenos necesitan ajuste fino.",
    condition: "used_with_details",
    category: byCategory("bicicletas"),
    city: "Zapopan",
    state: "Jalisco",
    country: "México",
    postalCode: "45030",
    approximateZone: "La Estancia",
    approximateValueRange: "1500_3000",
    acceptsMultipleItems: true,
    acceptsOtherCities: true,
    publicPreferences: "Me interesan audífonos, consolas retro o herramientas compactas.",
    publicTags: [byTag("bicicletas"), byTag("camping")],
    privateInterestTags: [byTag("audio"), byTag("consolas"), byTag("herramientas")],
    status: "active",
    moderationStatus: "active",
    photoUrls: [
      "https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&w=1200&q=80",
    ],
    createdAt: "2026-06-03T18:30:00.000Z",
  },
  {
    id: "item-monitor-dell",
    ownerId: "user-maya",
    title: "Monitor Dell 24 pulgadas",
    description:
      "Monitor Full HD para trabajo o consola. Incluye cable de corriente y HDMI.",
    knownDefects: "Tiene un rayón pequeño en la base; la pantalla no tiene manchas.",
    condition: "used_good",
    category: byCategory("electronicos"),
    city: "Monterrey",
    state: "Nuevo León",
    country: "México",
    postalCode: "64000",
    approximateZone: "Centro",
    approximateValueRange: "1500_3000",
    acceptsMultipleItems: true,
    acceptsOtherCities: true,
    publicPreferences: "Abierta a celulares, audio o libros de fotografía.",
    publicTags: [byTag("audio"), byTag("fotografia")],
    privateInterestTags: [byTag("celulares"), byTag("audio"), byTag("libros")],
    status: "active",
    moderationStatus: "active",
    photoUrls: [
      "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=1200&q=80",
    ],
    createdAt: "2026-06-05T14:20:00.000Z",
  },
  {
    id: "item-tool-kit",
    ownerId: "user-luis",
    title: "Kit de herramientas básico",
    description:
      "Set para reparaciones de casa: desarmadores, pinzas, llave inglesa, cinta y nivel pequeño.",
    knownDefects: "La caja cierra, pero una bisagra está floja.",
    condition: "used_good",
    category: byCategory("herramientas"),
    city: "Zapopan",
    state: "Jalisco",
    country: "México",
    postalCode: "45030",
    approximateValueRange: "500_1500",
    acceptsMultipleItems: true,
    acceptsOtherCities: false,
    publicPreferences: "Lo cambio por libros, audífonos o accesorios de bicicleta.",
    publicTags: [byTag("herramientas")],
    privateInterestTags: [byTag("libros"), byTag("audio"), byTag("bicicletas")],
    status: "active",
    moderationStatus: "active",
    photoUrls: [
      "https://images.unsplash.com/photo-1581244277943-fe4a9c777189?auto=format&fit=crop&w=1200&q=80",
    ],
    createdAt: "2026-06-06T11:15:00.000Z",
  },
];

export const tradeRequests: TradeRequest[] = [
  {
    id: "request-bike-for-laptop",
    requester: profiles[1],
    receiver: profiles[0],
    requestedItem: items[0],
    offeredItems: [items[1], items[3]],
    counteroffers: [],
    message:
      "Te ofrezco la bici y el kit de herramientas por la laptop. Puedo mostrarte ambos antes de cerrar.",
    status: "pending",
    requesterCitySnapshot: profiles[1].city,
    requesterStateSnapshot: profiles[1].state,
    receiverCitySnapshot: profiles[0].city,
    receiverStateSnapshot: profiles[0].state,
    isCrossCity: false,
    completionConfirmations: [],
    createdAt: "2026-06-07T17:00:00.000Z",
  },
  {
    id: "request-monitor-for-bike",
    requester: profiles[2],
    receiver: profiles[1],
    requestedItem: items[1],
    offeredItems: [items[2]],
    counteroffers: [],
    message:
      "Estoy en Monterrey, pero si te interesa el monitor podemos acordar con cuidado. Sé que Trueka no gestiona envíos.",
    status: "countered",
    requesterCitySnapshot: profiles[2].city,
    requesterStateSnapshot: profiles[2].state,
    receiverCitySnapshot: profiles[1].city,
    receiverStateSnapshot: profiles[1].state,
    isCrossCity: true,
    completionConfirmations: [],
    createdAt: "2026-06-08T09:15:00.000Z",
  },
];

export const currentUser = profiles[0];

export const savedItemIds = ["item-bike-urbana", "item-tool-kit"];

export function getProfile(id: string) {
  return profiles.find((profile) => profile.id === id);
}

export function getItem(id: string) {
  return items.find((item) => item.id === id);
}

export function getOwner(item: Item) {
  const owner = getProfile(item.ownerId);

  if (!owner) {
    throw new Error(`Missing owner for item: ${item.id}`);
  }

  return owner;
}

export function getProfileStats(profileId: string) {
  const activeItemsCount = items.filter(
    (item) =>
      item.ownerId === profileId
      && item.status === "active"
      && item.moderationStatus === "active",
  ).length;
  const profile = getProfile(profileId);
  const publishedItemsCount = profile?.publishedItemsCount ?? activeItemsCount;
  const completedTradesCount = profile?.completedTradesCount ?? 0;
  const tradeRate = publishedItemsCount > 0
    ? Math.round((completedTradesCount / publishedItemsCount) * 100)
    : 0;

  return {
    activeItemsCount,
    publishedItemsCount,
    completedTradesCount,
    tradeRate,
  };
}
