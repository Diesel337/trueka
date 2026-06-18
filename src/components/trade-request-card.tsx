import { Clock3, MapPin, MessageCircle, Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import {
  AcceptTradeRequestForm,
  CancelTradeRequestForm,
  RejectTradeRequestForm,
} from "@/components/trade-request-status-form";
import { getMexicoStateDisplayName } from "@/lib/mexico-locations";
import { buildTradeRequestNotice, canUseTradeRequestChat, getCrossCityWarning } from "@/lib/trade-rules";
import type { TradeRequest } from "@/lib/types";

const statusLabels: Record<TradeRequest["status"], string> = {
  pending: "Pendiente",
  accepted: "Aceptada / en negociación",
  rejected: "Rechazada",
  countered: "Contraoferta",
  cancelled: "Cancelada",
  expired: "Expirada",
  completed: "Completada",
  reported: "Reportada",
};

export function TradeRequestCard({
  request,
  direction,
}: {
  request: TradeRequest;
  direction: "received" | "sent";
}) {
  const warning = getCrossCityWarning(request.requester, request.receiver);
  const isSent = direction === "sent";
  const isReceived = direction === "received";
  const pendingCounteroffer = request.counteroffers.find((counteroffer) => counteroffer.status === "pending");
  const canReceiverRespond = isReceived && request.status === "pending" && !pendingCounteroffer;
  const canRequesterCancel = isSent && ["pending", "countered"].includes(request.status);
  const canOpenChat = canUseTradeRequestChat(request.status);
  const visibleStatus = getVisibleStatus(request, direction);
  const unreadMessageCount = request.unreadMessageCount ?? 0;
  const needsRating = request.status === "completed" && !request.currentUserRating;
  const primaryActions = (
    <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {canReceiverRespond ? (
        <>
          <AcceptTradeRequestForm tradeRequestId={request.id} />
          <RejectTradeRequestForm tradeRequestId={request.id} />
        </>
      ) : null}

      {canRequesterCancel ? <CancelTradeRequestForm tradeRequestId={request.id} /> : null}

      <Link
        href={`/requests/${request.id}`}
        className="inline-flex items-center justify-center gap-2 rounded-md border border-stone-300 px-3 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50"
      >
        <MessageCircle aria-hidden="true" size={16} />
        {needsRating
          ? "Calificar"
          : canOpenChat
            ? unreadMessageCount > 0
              ? `Abrir chat (${unreadMessageCount})`
              : "Abrir chat"
            : "Ver solicitud"}
      </Link>
    </div>
  );

  return (
    <article className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-emerald-800">
            {isSent
              ? `Solicitud enviada a ${request.receiver.displayName}.`
              : buildTradeRequestNotice(request.requester, request.receiver)}
          </p>
          <h2 className="mt-1 text-lg font-semibold text-stone-950">
            {request.requestedItem.title}
          </h2>
          <p className="mt-1 text-sm text-stone-600">
            De{" "}
            <Link
              href={`/users/${request.requester.id}`}
              className="font-semibold text-emerald-800 hover:text-emerald-950"
            >
              {request.requester.displayName}
            </Link>{" "}
            para{" "}
            <Link
              href={`/users/${request.receiver.id}`}
              className="font-semibold text-emerald-800 hover:text-emerald-950"
            >
              {request.receiver.displayName}
            </Link>
          </p>
          <p className="mt-1 text-sm text-stone-600">
            Oferta: {request.offeredItems.map((item) => item.title).join(" + ")}
          </p>
        </div>
        <span className="w-fit rounded-md bg-stone-100 px-2 py-1 text-xs font-semibold text-stone-700">
          {visibleStatus}
        </span>
      </div>

      {request.lastMessagePreview ? (
        <div
          className={`mt-4 flex gap-2 rounded-md border p-3 text-sm ${
            unreadMessageCount > 0
              ? "border-sky-200 bg-sky-50 text-sky-950"
              : "border-stone-200 bg-stone-50 text-stone-700"
          }`}
        >
          <MessageCircle aria-hidden="true" size={16} className="mt-0.5 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold">
              {unreadMessageCount > 0
                ? `${unreadMessageCount} mensaje${unreadMessageCount === 1 ? "" : "s"} sin leer`
                : "Último mensaje"}
            </p>
            <p className="mt-1 line-clamp-2">{request.lastMessagePreview}</p>
          </div>
        </div>
      ) : null}

      {primaryActions}

      <div className="mt-4 grid gap-4 border-t border-stone-100 pt-4 md:grid-cols-[0.8fr_1.2fr]">
        <ItemPhotoSummary label="Artículo solicitado" item={request.requestedItem} />
        <OfferedItemsSummary
          label={isSent ? "Ofreciste" : "Te ofrecen"}
          items={request.offeredItems}
        />
      </div>

      {warning ? (
        <div className="mt-4 flex gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <MapPin aria-hidden="true" size={16} className="mt-0.5 shrink-0" />
          <p>{warning}</p>
        </div>
      ) : null}

      {isSent && request.status === "pending" ? (
        <div className="mt-4 flex gap-2 rounded-md border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900">
          <Clock3 aria-hidden="true" size={16} className="mt-0.5 shrink-0" />
          <p>Esperando respuesta de {request.receiver.displayName}. El chat se habilita si acepta la solicitud.</p>
        </div>
      ) : null}

      {request.status === "countered" ? (
        <div className="mt-4 flex gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
          <Clock3 aria-hidden="true" size={16} className="mt-0.5 shrink-0" />
          <p>
            {isSent
              ? "Tienes una contraoferta por responder. Revísala para aceptar o rechazar."
              : "Contraoferta enviada. Falta que la otra persona responda."}
          </p>
        </div>
      ) : null}

      {request.status === "accepted" ? (
        <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm leading-6 text-emerald-950">
          Solicitud aceptada: ya están en negociación y el chat está habilitado. Todavía no cuenta como trueque completado.
        </div>
      ) : null}

      {request.status === "completed" ? (
        <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm leading-6 text-emerald-950">
          Trueque completado: ambas personas confirmaron que sí se hizo y ya cuenta en sus estadísticas.
        </div>
      ) : null}

      {needsRating ? (
        <div className="mt-3 flex gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-950">
          <Star aria-hidden="true" size={16} className="mt-0.5 shrink-0" />
          <p>Falta que califiques a la otra persona para cerrar tu seguimiento.</p>
        </div>
      ) : null}

      {request.message ? (
        <p className="mt-4 rounded-md bg-stone-50 p-3 text-sm leading-6 text-stone-700">
          {request.message}
        </p>
      ) : null}

    </article>
  );
}

function ItemPhotoSummary({ label, item }: { label: string; item: TradeRequest["requestedItem"] }) {
  return (
    <div className="grid grid-cols-[88px_1fr] gap-3">
      <div className="relative aspect-square overflow-hidden rounded-md bg-stone-100">
        <Image
          src={item.photoUrls[0] ?? "/window.svg"}
          alt={item.title}
          fill
          sizes="88px"
          className="object-cover"
          unoptimized
        />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase text-stone-500">{label}</p>
        <p className="mt-1 truncate text-sm font-semibold text-stone-900">{item.title}</p>
        <p className="mt-1 text-xs text-stone-500">
          {item.city}, {getMexicoStateDisplayName(item.state)}
        </p>
      </div>
    </div>
  );
}

function OfferedItemsSummary({ label, items }: { label: string; items: TradeRequest["offeredItems"] }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase text-stone-500">{label}</p>
      <div className="mt-2 grid gap-3 sm:grid-cols-2">
        {items.map((item) => (
          <div key={item.id} className="grid grid-cols-[64px_1fr] gap-3">
            <div className="relative aspect-square overflow-hidden rounded-md bg-stone-100">
              <Image
                src={item.photoUrls[0] ?? "/window.svg"}
                alt={item.title}
                fill
                sizes="64px"
                className="object-cover"
                unoptimized
              />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-stone-900">{item.title}</p>
              <p className="mt-1 line-clamp-2 text-xs leading-5 text-stone-500">{item.knownDefects}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function getVisibleStatus(request: TradeRequest, direction: "received" | "sent") {
  if (request.status === "pending" && direction === "sent") {
    return "Enviada / esperando respuesta";
  }

  if (request.status === "pending" && direction === "received") {
    return "Recibida / pendiente";
  }

  if (request.status === "countered" && direction === "sent") {
    return "Contraoferta por responder";
  }

  if (request.status === "countered" && direction === "received") {
    return "Contraoferta enviada";
  }

  if (request.status === "completed") {
    return request.currentUserRating ? "Completada / calificada" : "Completada / falta calificar";
  }

  return statusLabels[request.status];
}
