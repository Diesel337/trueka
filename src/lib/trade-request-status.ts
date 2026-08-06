import type { TradeRequestStatus } from "./types";

export type TradeRequestStatusTone =
  | "active"
  | "danger"
  | "neutral"
  | "success"
  | "warning";

export type TradeRequestStatusMeta = {
  label: string;
  description: string;
  tone: TradeRequestStatusTone;
};

const tradeRequestStatusMeta: Record<TradeRequestStatus, TradeRequestStatusMeta> = {
  pending: {
    label: "Pendiente de respuesta",
    description: "La otra persona todavía no responde. El chat se abre cuando la solicitud se acepta.",
    tone: "warning",
  },
  accepted: {
    label: "Aceptada / en negociación",
    description: "Ya pueden negociar en el chat. Aún no cuenta como trueque completado.",
    tone: "active",
  },
  rejected: {
    label: "Rechazada",
    description: "La solicitud terminó rechazada y ya no abre negociación.",
    tone: "danger",
  },
  countered: {
    label: "Contraoferta",
    description: "Hay una contraoferta pendiente de respuesta.",
    tone: "warning",
  },
  cancelled: {
    label: "Cancelada",
    description: "La solicitud o negociación terminó sin marcar el trueque como realizado.",
    tone: "danger",
  },
  expired: {
    label: "Expirada",
    description: "La solicitud expiró porque alguno de los artículos ya no está disponible.",
    tone: "neutral",
  },
  completed: {
    label: "Completada",
    description: "Ambas personas confirmaron que el intercambio sí se hizo.",
    tone: "success",
  },
  reported: {
    label: "Reportada",
    description: "La solicitud fue reportada para revisión.",
    tone: "danger",
  },
};

export function getTradeRequestStatusMeta(status: TradeRequestStatus) {
  return tradeRequestStatusMeta[status];
}
