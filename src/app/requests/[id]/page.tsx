import {
  CheckCircle2,
  CircleX,
  Clock3,
  MapPin,
  MessageCircle,
  Repeat2,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

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
  EndTradeNegotiationForm,
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
import { canCancelTradeRequest, canUseTradeRequestChat } from "@/lib/trade-rules";
import {
  getTradeRequestStatusMeta,
  type TradeRequestStatusTone,
} from "@/lib/trade-request-status";
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
  const canEndNegotiation = canCancelTradeRequest({
    status: request.status,
    isRequester,
    isReceiver,
    hasCompletionConfirmation: request.completionConfirmations.length > 0,
  }) && request.status === "accepted";
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
        <RequestStatusPanel
          status={request.status}
          rejectionReason={request.rejectionReason}
          className="lg:hidden"
        >
          {canRespond ? (
            <>
              <AcceptTradeRequestForm tradeRequestId={request.id} />
              <RejectTradeRequestForm tradeRequestId={request.id} />
            </>
          ) : null}
          {canCancel ? <CancelTradeRequestForm tradeRequestId={request.id} /> : null}
          {canEndNegotiation ? (
            <EndTradeNegotiationForm tradeRequestId={request.id} />
          ) : null}
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
        </RequestStatusPanel>

        <div className="space-y-4">
          <div id="chat" className="scroll-mt-24 rounded-lg border border-stone-200 bg-white shadow-sm">
          <div className="border-b border-stone-200 p-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
              {canChat ? (
                <MessageCircle aria-hidden="true" size={18} />
              ) : (
                <Clock3 aria-hidden="true" size={18} />
              )}
              {canChat
                ? "Chat de negociación"
                : ["pending", "countered"].includes(request.status)
                  ? "Solicitud en espera"
                  : "Conversación cerrada"}
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
                {getUnavailableChatDescription(request.status, canRespond, canCancel)}
              </div>
            </div>
          )}
          </div>
          <TradeExchangeSummary request={request} />
        </div>

        <aside className="space-y-4">
          <RequestStatusPanel
            status={request.status}
            rejectionReason={request.rejectionReason}
            className="hidden lg:block"
          />

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

          {canEndNegotiation ? (
            <section className="hidden gap-3 rounded-lg border border-stone-200 bg-white p-5 lg:grid">
              <h2 className="text-lg font-semibold text-stone-950">¿El intercambio no ocurrió?</h2>
              <p className="text-sm leading-6 text-stone-600">
                Cualquiera de las dos personas puede terminar la negociación mientras nadie haya
                confirmado que el intercambio sí se hizo.
              </p>
              <EndTradeNegotiationForm tradeRequestId={request.id} />
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

const requestStatusPanelClasses: Record<TradeRequestStatusTone, {
  panel: string;
  icon: string;
  eyebrow: string;
  title: string;
  description: string;
  reason: string;
}> = {
  active: {
    panel: "border-sky-300 bg-sky-50",
    icon: "bg-sky-100 text-sky-700",
    eyebrow: "text-sky-800",
    title: "text-sky-950",
    description: "text-sky-900",
    reason: "border-sky-200 bg-white/70 text-sky-900",
  },
  danger: {
    panel: "border-red-300 bg-red-50",
    icon: "bg-red-100 text-red-700",
    eyebrow: "text-red-800",
    title: "text-red-950",
    description: "text-red-900",
    reason: "border-red-200 bg-white/70 text-red-900",
  },
  neutral: {
    panel: "border-stone-300 bg-stone-100",
    icon: "bg-white text-stone-600",
    eyebrow: "text-stone-700",
    title: "text-stone-950",
    description: "text-stone-700",
    reason: "border-stone-300 bg-white/70 text-stone-700",
  },
  success: {
    panel: "border-emerald-300 bg-emerald-50",
    icon: "bg-emerald-100 text-emerald-700",
    eyebrow: "text-emerald-800",
    title: "text-emerald-950",
    description: "text-emerald-900",
    reason: "border-emerald-200 bg-white/70 text-emerald-900",
  },
  warning: {
    panel: "border-amber-300 bg-amber-50",
    icon: "bg-amber-100 text-amber-700",
    eyebrow: "text-amber-800",
    title: "text-amber-950",
    description: "text-amber-900",
    reason: "border-amber-200 bg-white/70 text-amber-900",
  },
};

function RequestStatusPanel({
  status,
  rejectionReason,
  className = "",
  children,
}: {
  status: TradeRequestStatus;
  rejectionReason?: string;
  className?: string;
  children?: ReactNode;
}) {
  const meta = getTradeRequestStatusMeta(status);
  const classes = requestStatusPanelClasses[meta.tone];

  return (
    <section
      role="status"
      className={`${className} rounded-lg border-2 p-5 shadow-sm ${classes.panel}`}
    >
      <div className="flex items-start gap-3">
        <span className={`grid size-10 shrink-0 place-items-center rounded-md ${classes.icon}`}>
          <RequestStatusIcon status={status} />
        </span>
        <div className="min-w-0">
          <p className={`text-sm font-semibold ${classes.eyebrow}`}>Estado actual</p>
          <h2 className={`mt-0.5 text-xl font-bold ${classes.title}`}>{meta.label}</h2>
        </div>
      </div>
      <p className={`mt-4 text-sm leading-6 ${classes.description}`}>
        {meta.description}
      </p>
      {rejectionReason ? (
        <p className={`mt-3 rounded-md border p-3 text-sm ${classes.reason}`}>
          Motivo: {rejectionReason}
        </p>
      ) : null}
      {children ? (
        <div className="mt-4 grid gap-2 border-t border-black/10 pt-4">{children}</div>
      ) : null}
    </section>
  );
}

function RequestStatusIcon({ status }: { status: TradeRequestStatus }) {
  if (status === "cancelled" || status === "rejected") {
    return <CircleX aria-hidden="true" size={21} />;
  }

  if (status === "completed") {
    return <CheckCircle2 aria-hidden="true" size={21} />;
  }

  if (status === "accepted") {
    return <MessageCircle aria-hidden="true" size={21} />;
  }

  if (status === "countered") {
    return <Repeat2 aria-hidden="true" size={21} />;
  }

  if (status === "reported") {
    return <ShieldAlert aria-hidden="true" size={21} />;
  }

  return <Clock3 aria-hidden="true" size={21} />;
}

function getUnavailableChatDescription(
  status: TradeRequestStatus,
  canRespond: boolean,
  canCancel: boolean,
) {
  if (status === "cancelled") {
    return "La solicitud o negociación terminó. Ya no se pueden enviar mensajes.";
  }

  if (status === "rejected" || status === "expired" || status === "reported") {
    return "Esta solicitud ya terminó y el chat no está disponible.";
  }

  return [
    "El chat se habilita cuando la solicitud está aceptada y queda en negociación.",
    canRespond
      ? "Si te interesa la oferta, acepta para abrir el chat; si no, recházala con un motivo claro."
      : "",
    canCancel
      ? "Tu solicitud ya fue enviada; puedes cancelarla mientras la otra persona no responda."
      : "",
  ].filter(Boolean).join(" ");
}
