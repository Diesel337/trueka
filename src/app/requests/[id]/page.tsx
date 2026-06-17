import { Clock3, MessageCircle, ShieldCheck } from "lucide-react";
import { notFound } from "next/navigation";

import { CounterofferForm, CounterofferSummary } from "@/components/counteroffer-panel";
import { LiveRefresh } from "@/components/live-refresh";
import { MarkRequestRead } from "@/components/mark-request-read";
import { RequestChat } from "@/components/request-chat";
import { BlockUserForm, ReportForm } from "@/components/safety-actions";
import { TradeRatingForm } from "@/components/trade-rating-form";
import {
  AcceptTradeRequestForm,
  CancelTradeRequestForm,
  CompleteTradeRequestForm,
  RejectTradeRequestForm,
} from "@/components/trade-request-status-form";
import {
  getCurrentProfile,
  getCurrentUserRatingForRequest,
  getItemsResult,
  getMessagesForRequest,
  getTradeRequestsForCurrentUser,
} from "@/lib/data";
import { canUseTradeRequestChat } from "@/lib/trade-rules";
import type { TradeRequestStatus } from "@/lib/types";

type RequestDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function RequestDetailPage({ params }: RequestDetailPageProps) {
  const { id } = await params;
  const [tradeRequests, currentUser, messages] = await Promise.all([
    getTradeRequestsForCurrentUser(),
    getCurrentProfile(),
    getMessagesForRequest(id),
  ]);
  const request = tradeRequests.find((entry) => entry.id === id);

  if (!request || !currentUser) {
    notFound();
  }

  const currentUserConfirmed = request.completionConfirmations.some(
    (confirmation) => confirmation.userId === currentUser.id,
  );
  const otherUserConfirmed = request.completionConfirmations.some(
    (confirmation) => confirmation.userId !== currentUser.id,
  );
  const isRequester = request.requester.id === currentUser.id;
  const isReceiver = request.receiver.id === currentUser.id;
  const pendingCounteroffer = request.counteroffers.find((counteroffer) => counteroffer.status === "pending");
  const canRespond = isReceiver && request.status === "pending" && !pendingCounteroffer;
  const canCreateCounteroffer = canRespond;
  const canRespondCounteroffer = isRequester && request.status === "countered" && Boolean(pendingCounteroffer);
  const canCancel = isRequester && ["pending", "countered"].includes(request.status);
  const canChat = canUseTradeRequestChat(request.status);
  const otherUser = isRequester ? request.receiver : request.requester;
  const requesterItems = canCreateCounteroffer
    ? (await getItemsResult()).items.filter((item) => item.ownerId === request.requester.id)
    : [];
  const currentUserRating = request.status === "completed"
    ? await getCurrentUserRatingForRequest(request.id)
    : null;

  return (
    <main className="flex-1">
      <LiveRefresh intervalMs={7000} />
      <MarkRequestRead requestId={request.id} />
      <section className="mx-auto grid max-w-6xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_340px] lg:px-8">
        <div className="rounded-lg border border-stone-200 bg-white shadow-sm">
          <div className="border-b border-stone-200 p-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
              {canChat ? (
                <MessageCircle aria-hidden="true" size={18} />
              ) : (
                <Clock3 aria-hidden="true" size={18} />
              )}
              {canChat ? "Chat de negociación" : "Solicitud en espera"}
            </div>
            <h1 className="mt-2 text-2xl font-semibold text-stone-950">
              {request.requestedItem.title}
            </h1>
            <p className="mt-1 text-sm text-stone-600">
              Oferta: {request.offeredItems.map((item) => item.title).join(" + ")}
            </p>
          </div>

          {canChat ? (
            <RequestChat
              requestId={request.id}
              initialMessages={messages}
              currentUserId={currentUser.id}
              currentUserName={currentUser.displayName}
              currentUserAvatarUrl={currentUser.avatarUrl}
            />
          ) : (
            <div className="p-5">
              <div className="rounded-md border border-stone-200 bg-stone-50 p-4 text-sm leading-6 text-stone-700">
                El chat se habilita cuando la solicitud está aceptada y queda en negociación.
                {canRespond
                  ? " Si te interesa la oferta, acepta para abrir el chat; si no, recházala con un motivo claro."
                  : null}
                {canCancel
                  ? " Tu solicitud ya fue enviada; puedes cancelarla mientras la otra persona no responda."
                  : null}
              </div>
            </div>
          )}
        </div>

        <aside className="space-y-4">
          <section className="rounded-lg border border-stone-200 bg-white p-5">
            <p className="text-sm font-semibold text-emerald-800">Estado actual</p>
            <h2 className="mt-1 text-lg font-semibold text-stone-950">
              {getRequestStatusLabel(request.status)}
            </h2>
            <p className="mt-2 text-sm leading-6 text-stone-600">
              {getRequestStatusDescription(request.status)}
            </p>
            {request.rejectionReason ? (
              <p className="mt-3 rounded-md bg-stone-50 p-3 text-sm text-stone-600">
                Motivo: {request.rejectionReason}
              </p>
            ) : null}
          </section>

          {canRespond ? (
            <section className="grid gap-3 rounded-lg border border-stone-200 bg-white p-5">
              <h2 className="text-lg font-semibold text-stone-950">Responder solicitud</h2>
              <AcceptTradeRequestForm tradeRequestId={request.id} />
              <RejectTradeRequestForm tradeRequestId={request.id} />
            </section>
          ) : null}

          {canCreateCounteroffer ? (
            <CounterofferForm
              tradeRequestId={request.id}
              requesterItems={requesterItems}
              requesterName={request.requester.displayName}
            />
          ) : null}

          {pendingCounteroffer ? (
            <CounterofferSummary
              counteroffer={pendingCounteroffer}
              canRespond={canRespondCounteroffer}
            />
          ) : null}

          {canCancel ? (
            <section className="grid gap-3 rounded-lg border border-stone-200 bg-white p-5">
              <h2 className="text-lg font-semibold text-stone-950">Solicitud enviada</h2>
              <p className="text-sm leading-6 text-stone-600">
                Mientras no quede aceptada, puedes cancelarla.
              </p>
              <CancelTradeRequestForm tradeRequestId={request.id} />
            </section>
          ) : null}

          {request.status === "accepted" ? (
            <section className="rounded-lg border border-emerald-200 bg-emerald-50 p-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-emerald-950">
                <ShieldCheck aria-hidden="true" size={18} />
                Guía antes de confirmar
              </div>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-emerald-950">
                <li>Revisen el artículo antes de entregarlo.</li>
                <li>Comprueben funcionamiento y accesorios.</li>
                <li>Acuerden un lugar público.</li>
                <li>Confirmen solo si el intercambio sí se hizo.</li>
              </ul>
            </section>
          ) : null}

          <section className="rounded-lg border border-stone-200 bg-white p-5">
            {request.status === "accepted" ? (
              <>
                <CompleteTradeRequestForm
                  tradeRequestId={request.id}
                  currentUserConfirmed={currentUserConfirmed}
                  otherUserConfirmed={otherUserConfirmed}
                />
                <p className="mt-3 text-xs leading-5 text-stone-500">
                  Solo cuenta como trueque completado cuando ambas personas confirman que sí se hizo.
                </p>
              </>
            ) : request.status === "completed" ? (
              <div className="rounded-md bg-emerald-50 p-4 text-sm leading-6 text-emerald-950">
                Trueque completado. Ambas personas confirmaron que sí se hizo y ya cuenta en sus estadísticas.
              </div>
            ) : (
              <div className="rounded-md bg-stone-50 p-4 text-sm leading-6 text-stone-600">
                El trueque se puede marcar como realizado hasta que la solicitud esté aceptada y
                ambas partes estén en negociación.
              </div>
            )}
          </section>

          {request.status === "completed" ? (
            <TradeRatingForm
              tradeRequestId={request.id}
              reviewedUserId={otherUser.id}
              reviewedUserName={otherUser.displayName}
              existingRating={currentUserRating}
            />
          ) : null}

          {request.status === "accepted" ? null : (
            <section className="rounded-lg border border-emerald-200 bg-emerald-50 p-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-emerald-950">
              <ShieldCheck aria-hidden="true" size={18} />
                Regla central
              </div>
              <p className="mt-3 text-sm leading-6 text-emerald-950">
                Aceptar no completa el trueque. Solo abre la negociación; el intercambio cuenta hasta que ambas personas confirman que sí se hizo.
              </p>
            </section>
          )}

          <section className="grid gap-2 rounded-lg border border-stone-200 bg-white p-5">
            <ReportForm
              reportedUserId={otherUser.id}
              reportedItemId={request.requestedItem.id}
              tradeRequestId={request.id}
              defaultReason="possible_scam"
              buttonLabel="Reportar solicitud"
            />
            <BlockUserForm blockedUserId={otherUser.id} />
          </section>
        </aside>
      </section>
    </main>
  );
}

function getRequestStatusLabel(status: TradeRequestStatus) {
  const labels: Record<TradeRequestStatus, string> = {
    pending: "Pendiente de respuesta",
    accepted: "Aceptada / en negociación",
    rejected: "Rechazada",
    countered: "Contraoferta",
    cancelled: "Cancelada",
    expired: "Expirada",
    completed: "Completada",
    reported: "Reportada",
  };

  return labels[status];
}

function getRequestStatusDescription(status: TradeRequestStatus) {
  const descriptions: Record<TradeRequestStatus, string> = {
    pending: "La otra persona todavía no responde. El chat se abre cuando la solicitud se acepta.",
    accepted: "Ya pueden negociar en el chat. Aún no cuenta como trueque completado.",
    rejected: "La solicitud terminó rechazada y ya no abre negociación.",
    countered: "Hay una contraoferta pendiente de respuesta.",
    cancelled: "La persona que envió la solicitud la canceló.",
    expired: "La solicitud expiró porque alguno de los artículos ya no está disponible.",
    completed: "Ambas personas confirmaron que el intercambio sí se hizo.",
    reported: "La solicitud fue reportada para revisión.",
  };

  return descriptions[status];
}
