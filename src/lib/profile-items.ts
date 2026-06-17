import type { Item, ItemStatus } from "./types";

export type ProfileItemSectionStatus = Extract<
  ItemStatus,
  "active" | "draft" | "paused" | "reserved" | "traded"
>;

export type ProfileItemSection = {
  status: ProfileItemSectionStatus;
  title: string;
  description: string;
  emptyMessage: string;
  items: Item[];
};

const profileItemSectionMeta: Omit<ProfileItemSection, "items">[] = [
  {
    status: "active",
    title: "Activas",
    description: "Visibles en Explorar y listas para recibir propuestas.",
    emptyMessage: "No tienes publicaciones activas por ahora.",
  },
  {
    status: "draft",
    title: "Borradores",
    description: "Pendientes de completar antes de aparecer en Explorar.",
    emptyMessage: "No tienes borradores guardados.",
  },
  {
    status: "paused",
    title: "Pausadas",
    description: "Ocultas temporalmente mientras decides si volver a activarlas.",
    emptyMessage: "No tienes publicaciones pausadas.",
  },
  {
    status: "reserved",
    title: "En negociación",
    description: "Artículos apartados mientras avanza una solicitud aceptada.",
    emptyMessage: "No tienes artículos en negociación.",
  },
  {
    status: "traded",
    title: "Intercambiadas",
    description: "Historial de artículos que ya terminaron un trueque.",
    emptyMessage: "Aún no tienes artículos intercambiados.",
  },
];

export function getProfileItemSections(items: Item[]): ProfileItemSection[] {
  return profileItemSectionMeta.map((section) => ({
    ...section,
    items: items.filter((item) => item.status === section.status),
  }));
}
