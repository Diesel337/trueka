import { ArrowRight, Bell, CheckCircle2 } from "lucide-react";
import Link from "next/link";

import { markAllNotificationsReadAction, openNotificationAction } from "@/app/actions";
import { getCurrentProfile, getNotificationsForCurrentUser } from "@/lib/data";
import type { Notification } from "@/lib/types";

export default async function NotificationsPage() {
  const currentUser = await getCurrentProfile();

  if (!currentUser) {
    return (
      <main className="mx-auto flex max-w-3xl flex-1 items-center px-4 py-12">
        <div className="rounded-lg border border-stone-200 bg-white p-8">
          <h1 className="text-2xl font-semibold text-stone-950">Inicia sesión</h1>
          <p className="mt-2 text-stone-600">
            Tus notificaciones aparecen después de entrar a tu cuenta.
          </p>
          <Link
            href={`/auth?next=${encodeURIComponent("/notifications")}`}
            className="mt-5 inline-flex rounded-md bg-emerald-700 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-800"
          >
            Entrar o crear cuenta
          </Link>
        </div>
      </main>
    );
  }

  const notifications = await getNotificationsForCurrentUser(50);
  const unreadCount = notifications.filter((notification) => !notification.readAt).length;
  const unreadNotifications = notifications.filter((notification) => !notification.readAt);
  const readNotifications = notifications.filter((notification) => notification.readAt);

  return (
    <main className="flex-1">
      <section className="border-b border-stone-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
            <Bell aria-hidden="true" size={18} />
            Centro de actividad
          </div>
          <h1 className="mt-2 text-3xl font-semibold text-stone-950">Notificaciones</h1>
          <p className="mt-2 max-w-2xl text-stone-600">
            Solicitudes, mensajes, reseñas, matches por interés y avisos de vistas de tus publicaciones.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-5 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <div className="grid grid-cols-2 gap-3">
            <ActivityMetric label="Sin abrir" value={unreadCount} tone={unreadCount > 0 ? "attention" : "neutral"} />
            <ActivityMetric label="Historial" value={notifications.length} tone="neutral" />
          </div>
          {unreadCount > 0 ? (
            <form action={markAllNotificationsReadAction}>
              <button className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-stone-300 px-3 text-sm font-semibold text-stone-700 hover:bg-stone-50 sm:w-auto">
                <CheckCircle2 aria-hidden="true" size={16} />
                Marcar le&iacute;das
              </button>
            </form>
          ) : null}
        </div>

        <div className="overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm">
          {notifications.length > 0 ? (
            <>
              {unreadNotifications.length > 0 ? (
                <NotificationSection title="Sin abrir" notifications={unreadNotifications} />
              ) : null}
              {readNotifications.length > 0 ? (
                <NotificationSection
                  title={unreadNotifications.length > 0 ? "Historial" : "Todas"}
                  notifications={readNotifications}
                  muted
                />
              ) : null}
            </>
          ) : (
            <div className="p-8 text-center text-sm text-stone-600">
              Todavía no tienes notificaciones.
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function ActivityMetric({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "attention" | "neutral";
}) {
  const toneClassName = tone === "attention"
    ? "border-sky-200 bg-sky-50 text-sky-950"
    : "border-stone-200 bg-stone-50 text-stone-700";

  return (
    <div className={`rounded-lg border px-3 py-3 ${toneClassName}`}>
      <p className="truncate text-xs font-semibold">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-stone-950">{value.toLocaleString("es-MX")}</p>
    </div>
  );
}

function NotificationSection({
  title,
  notifications,
  muted = false,
}: {
  title: string;
  notifications: Notification[];
  muted?: boolean;
}) {
  return (
    <section className="border-b border-stone-100 last:border-b-0">
      <div className="flex items-center justify-between gap-3 bg-stone-50 px-4 py-3">
        <h2 className="text-sm font-semibold text-stone-950">{title}</h2>
        <span className="rounded bg-white px-2 py-0.5 text-xs font-semibold text-stone-600">
          {notifications.length.toLocaleString("es-MX")}
        </span>
      </div>
      {notifications.map((notification) => (
        <NotificationRow key={notification.id} notification={notification} muted={muted} />
      ))}
    </section>
  );
}

function NotificationRow({
  notification,
  muted,
}: {
  notification: Notification;
  muted?: boolean;
}) {
  const isUnread = !notification.readAt;

  return (
    <form action={openNotificationAction}>
      <input type="hidden" name="notificationId" value={notification.id} />
      <input type="hidden" name="href" value={notification.href} />
      <button
        className={`grid w-full gap-2 border-t border-stone-100 px-4 py-4 text-left transition hover:bg-stone-50 sm:px-5 ${
          isUnread ? "bg-sky-50" : "bg-white"
        }`}
      >
        <span className="flex items-start justify-between gap-4">
          <span className={`font-semibold ${muted ? "text-stone-800" : "text-stone-950"}`}>
            {notification.title}
          </span>
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${
              isUnread ? "bg-sky-600 text-white" : "bg-stone-100 text-stone-500"
            }`}
          >
            {isUnread ? "Sin abrir" : "Revisada"}
          </span>
        </span>
        {notification.body ? (
          <span className={`text-sm leading-6 ${muted ? "text-stone-500" : "text-stone-600"}`}>
            {notification.body}
          </span>
        ) : null}
        <span className="flex items-center justify-between gap-3 text-xs text-stone-500">
          {formatNotificationTime(notification.createdAt)}
          <span className="inline-flex items-center gap-1 font-semibold text-emerald-800">
            Abrir
            <ArrowRight aria-hidden="true" size={14} />
          </span>
        </span>
      </button>
    </form>
  );
}

function formatNotificationTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleString("es-MX", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
