import { Bell, Inbox, MessageCircle, Repeat2, Send } from "lucide-react";
import Link from "next/link";

import { LiveRefresh } from "@/components/live-refresh";
import { TradeRequestCard } from "@/components/trade-request-card";
import { getCurrentProfile, getTradeRequestsForCurrentUser } from "@/lib/data";
import { getRequestQueueSummary, sortTradeRequestsForQueue } from "@/lib/request-queue";

export default async function RequestsPage() {
  const [currentUser, tradeRequests] = await Promise.all([
    getCurrentProfile(),
    getTradeRequestsForCurrentUser(),
  ]);

  if (!currentUser) {
    return (
      <main className="mx-auto flex max-w-3xl flex-1 items-center px-4 py-12">
        <div className="rounded-lg border border-stone-200 bg-white p-8">
          <h1 className="text-2xl font-semibold text-stone-950">Inicia sesión</h1>
          <p className="mt-2 text-stone-600">
            Tus solicitudes de trueque aparecen después de entrar a tu cuenta.
          </p>
          <Link
            href={`/auth?next=${encodeURIComponent("/requests")}`}
            className="mt-5 inline-flex rounded-md bg-emerald-700 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-800"
          >
            Entrar o crear cuenta
          </Link>
        </div>
      </main>
    );
  }

  const received = sortTradeRequestsForQueue(
    tradeRequests.filter((request) => request.receiver.id === currentUser.id),
    "received",
  );
  const sent = sortTradeRequestsForQueue(
    tradeRequests.filter((request) => request.requester.id === currentUser.id),
    "sent",
  );
  const queueSummary = getRequestQueueSummary(tradeRequests, currentUser.id);
  const pendingReceivedCount = queueSummary.pendingReceivedCount;
  const unreadMessageCount = queueSummary.unreadMessageCount;

  return (
    <main className="flex-1">
      <LiveRefresh intervalMs={12000} />
      <section className="border-b border-stone-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-semibold text-stone-950">Solicitudes de trueque</h1>
          <p className="mt-2 max-w-2xl text-stone-600">
            Revisa ofertas recibidas, da seguimiento a las enviadas y abre el chat cuando una solicitud quede aceptada.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <RequestMetric
              label="Por atender"
              value={queueSummary.needsAttentionCount}
              icon="bell"
              tone={queueSummary.needsAttentionCount > 0 ? "attention" : "neutral"}
            />
            <RequestMetric
              label="Mensajes sin leer"
              value={queueSummary.unreadMessageCount}
              icon="message"
              tone={queueSummary.unreadMessageCount > 0 ? "attention" : "neutral"}
            />
            <RequestMetric
              label="En negociación"
              value={queueSummary.activeNegotiationsCount}
              icon="trade"
              tone={queueSummary.activeNegotiationsCount > 0 ? "active" : "neutral"}
            />
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_340px] lg:px-8">
        <div className="space-y-8">
          <section id="recibidas" className="scroll-mt-24">
            <div className="mb-4 flex items-center gap-2">
              <Inbox aria-hidden="true" size={20} className="text-emerald-800" />
              <h2 className="text-xl font-semibold text-stone-950">Recibidas</h2>
              <span className="inline-flex min-h-7 min-w-7 items-center justify-center rounded-md bg-stone-100 px-2 text-xs font-semibold text-stone-700">
                {received.length.toLocaleString("es-MX")}
              </span>
            </div>
            <div className="space-y-4">
              {received.length > 0 ? (
                received.map((request) => (
                  <TradeRequestCard
                    key={request.id}
                    request={request}
                    direction="received"
                  />
                ))
              ) : (
                <EmptyRequests message="Aún no tienes solicitudes recibidas." />
              )}
            </div>
          </section>

          <section id="enviadas" className="scroll-mt-24">
            <div className="mb-4 flex items-center gap-2">
              <Send aria-hidden="true" size={20} className="text-emerald-800" />
              <h2 className="text-xl font-semibold text-stone-950">Enviadas</h2>
              <span className="inline-flex min-h-7 min-w-7 items-center justify-center rounded-md bg-stone-100 px-2 text-xs font-semibold text-stone-700">
                {sent.length.toLocaleString("es-MX")}
              </span>
            </div>
            <div className="space-y-4">
              {sent.length > 0 ? (
                sent.map((request) => (
                  <TradeRequestCard
                    key={request.id}
                    request={request}
                    direction="sent"
                  />
                ))
              ) : (
                <EmptyRequests message="Cuando propongas trueques, aparecerán aquí." />
              )}
            </div>
          </section>
        </div>

        <aside className="space-y-4">
          <section className="rounded-lg border border-stone-200 bg-white p-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
              <Bell aria-hidden="true" size={18} />
              Notificaciones
            </div>
            <p className="mt-2 text-sm leading-6 text-stone-600">
              {pendingReceivedCount > 0 || unreadMessageCount > 0
                ? [
                  pendingReceivedCount > 0
                    ? `${pendingReceivedCount} solicitud${pendingReceivedCount === 1 ? "" : "es"} pendiente${pendingReceivedCount === 1 ? "" : "s"}`
                    : null,
                  unreadMessageCount > 0
                    ? `${unreadMessageCount} mensaje${unreadMessageCount === 1 ? "" : "s"} sin leer`
                    : null,
                ].filter(Boolean).join(" · ")
                : "No tienes solicitudes recibidas ni mensajes pendientes por ahora."}
            </p>
            {pendingReceivedCount > 0 ? (
              <Link
                href="#recibidas"
                className="mt-4 inline-flex rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
              >
                Ver recibidas
              </Link>
            ) : null}
          </section>

          <section className="rounded-lg border border-stone-200 bg-white p-5">
            <h2 className="text-lg font-semibold text-stone-950">Cómo responder</h2>
            <p className="mt-2 text-sm leading-6 text-stone-600">
              En solicitudes recibidas puedes aceptar o elegir un motivo antes de rechazar. En
              solicitudes enviadas verás el estado y podrás cancelar mientras sigan pendientes.
            </p>
          </section>

          <section className="rounded-lg border border-emerald-200 bg-emerald-50 p-5">
            <h2 className="text-lg font-semibold text-emerald-950">Al completar</h2>
            <p className="mt-2 text-sm leading-6 text-emerald-950">
              Un trueque cuenta como completado solo cuando ambas personas confirman que sí se hizo.
              Trueka no maneja pagos, envíos ni entregas.
            </p>
          </section>
        </aside>
      </section>
    </main>
  );
}

function RequestMetric({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: number;
  icon: "bell" | "message" | "trade";
  tone: "attention" | "active" | "neutral";
}) {
  const Icon = icon === "message" ? MessageCircle : icon === "trade" ? Repeat2 : Bell;
  const toneClassName = {
    attention: "border-amber-200 bg-amber-50 text-amber-950",
    active: "border-emerald-200 bg-emerald-50 text-emerald-950",
    neutral: "border-stone-200 bg-stone-50 text-stone-700",
  }[tone];

  return (
    <div className={`flex items-center justify-between gap-3 rounded-lg border px-4 py-3 ${toneClassName}`}>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{label}</p>
        <p className="mt-1 text-2xl font-semibold text-stone-950">{value.toLocaleString("es-MX")}</p>
      </div>
      <Icon aria-hidden="true" size={20} className="shrink-0" />
    </div>
  );
}

function EmptyRequests({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-dashed border-stone-300 bg-white p-6 text-sm text-stone-600">
      {message}
    </div>
  );
}
