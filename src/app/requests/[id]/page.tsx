import { CheckCircle2, Clock3, MapPin, MessageCircle, Repeat2, ShieldCheck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { CounterofferForm, CounterofferSummary } from "@/components/counteroffer-panel";
import { LiveRefresh } from "@/components/live-refresh";
import { MarkRequestRead } from "@/components/mark-request-read";
import { RequestChat } from "@/components/request-chat";
import { BlockUserForm, ReportForm, SafetyActionsPanel } from "@/components/safety-actions";
import { TradeRatingForm } from "@/components/trade-rating-form";
import {
  AcceptTradeRequestForm,
  CancelTradeRequestForm,
  CompleteTradeRequestForm,
  RejectTradeRequestForm,
} from "@/components/trade-request-status-form";
import { UserAvatar } from "@/components/user-avatar";
import { conditionLabels } from "@/lib/constants";
import {
  getCurrentProfile,
  getCurrentUserRatingForRequest,
  getItemsResult,
  getMessagesForRequest,
  getTradeRequestsForCurrentUser,
} from "@/lib/data";
import { getMexicoStateDisplayName } from "@/lib/mexico-locations";
import { canUseTradeRequestChat } from "@/lib/trade-rules";
import type { TradeRequest, TradeRequestStatus } from "@/lib/types";

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
        <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm lg:hidden">
          <p className="text-sm font-semibold text-emerald-800">Estado actual</p>
          <h2 className="mt-1 text-lg font-semibold text-stone-950">
            {getRequestStatusLabel(request.status)}
          </h2>
          <p className="mt-2 text-sm leading-6 text-stone-600">
            {getRequestStatusDescription(request.status)}
          </p>
          <div className="mt-4 grid gap-2">
            {canRespond ? (
              <>
                <AcceptTradeRequestForm tradeRequestId={request.id} />
                <RejectTradeRequestForm tradeRequestId={request.id} />
              </>
            ) : null}
            {canCancel ? <CancelTradeRequestForm tradeRequestId={request.id} /> : null}
            {request.status === "accepted" ? (
              <>
                <CompletionProgressPanel request={request} currentUserId={currentUser.id} />
                <CompleteTradeRequestForm
                  tradeRequestId={request.id}
                  currentUserConfirmed={currentUserConfirmed}
                  otherUserConfirmed={otherUserConfirmed}
                />
              </>
            ) : null}
            {canChat ? (
              <a
                href="#chat"
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-stone-300 px-3 text-sm font-semibold text-stone-700 hover:bg-stone-50"
              >
                <MessageCircle aria-hidden="true" size={16} />
                Ir al chat
              </a>
            ) : null}
          </div>
        </section>

        <div className="space-y-4">
          <div id="chat" className="scroll-mt-24 rounded-lg border border-stone-200 bg-white shadow-sm">
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
          <TradeExchangeSummary request={request} />
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
            {request.status === "accepted" || request.status === "completed" ? (
              <CompletionProgressPanel request={request} currentUserId={currentUser.id} />
            ) : null}
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

          <SafetyActionsPanel
            title="Reportar o bloquear"
            description="Mantén estas acciones a la mano si la solicitud se vuelve incómoda o sospechosa."
          >
            <ReportForm
              reportedUserId={otherUser.id}
              reportedItemId={request.requestedItem.id}
              tradeRequestId={request.id}
              defaultReason="possible_scam"
              buttonLabel="Reportar solicitud"
            />
            <BlockUserForm blockedUserId={otherUser.id} />
          </SafetyActionsPanel>
        </aside>
      </section>
    </main>
  );
}

function TradeExchangeSummary({ request }: { request: TradeRequest }) {
  return (
    <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-emerald-800">Resumen del trueque</p>
          <h2 className="mt-1 text-lg font-semibold text-stone-950">
            Artículos de esta solicitud
          </h2>
        </div>
        <span className="rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-800">
          Sin dinero
        </span>
      </div>
      <p className="mt-2 text-sm leading-6 text-stone-600">
        Ten a la mano qué se pidió y qué se ofreció antes de responder o confirmar.
      </p>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_44px_1fr]">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase text-stone-500">
            Artículo solicitado
          </p>
          <TradeExchangeItem item={request.requestedItem} ownerName={request.receiver.displayName} />
        </div>

        <div className="hidden items-center justify-center lg:flex">
          <span className="grid size-10 place-items-center rounded-full border border-emerald-200 bg-emerald-50 text-emerald-800">
            <Repeat2 aria-hidden="true" size={18} />
          </span>
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase text-stone-500">
            Oferta propuesta
          </p>
          <div className="grid gap-2">
            {request.offeredItems.map((item) => (
              <TradeExchangeItem
                key={item.id}
                item={item}
                ownerName={request.requester.displayName}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function TradeExchangeItem({
  item,
  ownerName,
}: {
  item: TradeRequest["requestedItem"];
  ownerName: string;
}) {
  return (
    <article className="grid grid-cols-[88px_1fr] gap-3 rounded-lg border border-stone-200 bg-stone-50 p-3">
      <Link href={`/items/${item.id}`} className="relative aspect-square overflow-hidden rounded-md bg-stone-100">
        <Image
          src={item.photoUrls[0] ?? "/window.svg"}
          alt={item.title}
          fill
          sizes="88px"
          className="object-cover"
          unoptimized
        />
      </Link>
      <div className="min-w-0">
        <Link
          href={`/items/${item.id}`}
          className="line-clamp-1 text-sm font-semibold text-stone-950 hover:text-emerald-800"
        >
          {item.title}
        </Link>
        <p className="mt-1 truncate text-xs font-medium text-emerald-800">
          De {ownerName}
        </p>
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-stone-600">
          <span className="inline-flex items-center gap-1">
            <Repeat2 aria-hidden="true" size={13} className="text-emerald-700" />
            {conditionLabels[item.condition]}
          </span>
          <span className="inline-flex items-center gap-1">
            <MapPin aria-hidden="true" size={13} />
            {item.city}, {getMexicoStateDisplayName(item.state)}
          </span>
        </div>
        <p className="mt-2 line-clamp-2 text-xs leading-5 text-stone-500">
          {item.knownDefects}
        </p>
      </div>
    </article>
  );
}

function CompletionProgressPanel({
  request,
  currentUserId,
}: {
  request: TradeRequest;
  currentUserId: string;
}) {
  const confirmationsByUserId = new Map(
    request.completionConfirmations.map((confirmation) => [confirmation.userId, confirmation]),
  );
  const participants = [request.requester, request.receiver];

  return (
    <div className="mb-4 rounded-md border border-stone-200 bg-stone-50 p-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-stone-950">
        <ShieldCheck aria-hidden="true" size={16} className="text-emerald-700" />
        Confirmación del intercambio
      </div>
      <p className="mt-2 text-xs leading-5 text-stone-600">
        Solo se cierra cuando ambas personas marcan que sí se hizo.
      </p>
      <div className="mt-3 grid gap-2">
        {participants.map((participant) => {
          const confirmation = confirmationsByUserId.get(participant.id);
          const isConfirmed = Boolean(confirmation) || request.status === "completed";

          return (
            <div
              key={participant.id}
              className="flex items-center justify-between gap-3 rounded-md bg-white px-3 py-2"
            >
              <div className="flex min-w-0 items-center gap-2">
                <UserAvatar src={participant.avatarUrl} alt={participant.displayName} size={32} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-stone-950">
                    {participant.id === currentUserId ? "Tú" : participant.displayName}
                  </p>
                  <p className="text-xs text-stone-500">
                    {isConfirmed
                      ? confirmation
                        ? `Confirmó el ${new Date(confirmation.confirmedAt).toLocaleDateString("es-MX")}`
                        : "Confirmado"
                      : "Pendiente de confirmar"}
                  </p>
                </div>
              </div>
              {isConfirmed ? (
                <CheckCircle2 aria-hidden="true" size={18} className="shrink-0 text-emerald-700" />
              ) : (
                <Clock3 aria-hidden="true" size={18} className="shrink-0 text-stone-400" />
              )}
            </div>
          );
        })}
      </div>
    </div>
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
