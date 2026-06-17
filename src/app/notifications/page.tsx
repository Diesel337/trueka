import { ArrowRight, Bell, CheckCircle2 } from "lucide-react";
import Link from "next/link";

import { markAllNotificationsReadAction, openNotificationAction } from "@/app/actions";
import { getCurrentProfile, getNotificationsForCurrentUser } from "@/lib/data";

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
            Solicitudes, mensajes, matches por interés y avisos de vistas de tus publicaciones.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-4 flex items-center justify-between gap-3">
          <p className="text-sm font-medium text-stone-600">
            {notifications.length} notificación{notifications.length === 1 ? "" : "es"}
            {unreadCount > 0 ? ` · ${unreadCount} sin abrir` : ""}
          </p>
          {unreadCount > 0 ? (
            <form action={markAllNotificationsReadAction}>
              <button className="inline-flex items-center gap-2 rounded-md border border-stone-300 px-3 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50">
                <CheckCircle2 aria-hidden="true" size={16} />
                Marcar leídas
              </button>
            </form>
          ) : null}
        </div>

        <div className="overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm">
          {notifications.length > 0 ? (
            notifications.map((notification) => {
              const isUnread = !notification.readAt;

              return (
                <form key={notification.id} action={openNotificationAction}>
                  <input type="hidden" name="notificationId" value={notification.id} />
                  <input type="hidden" name="href" value={notification.href} />
                  <button
                    className={`grid w-full gap-2 border-b border-stone-100 px-5 py-4 text-left transition last:border-b-0 hover:bg-stone-50 ${
                      isUnread ? "bg-sky-50" : "bg-white"
                    }`}
                  >
                    <span className="flex items-start justify-between gap-4">
                      <span className="font-semibold text-stone-950">{notification.title}</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                        isUnread ? "bg-sky-600 text-white" : "bg-stone-100 text-stone-500"
                      }`}
                      >
                        {isUnread ? "Sin abrir" : "Revisada"}
                      </span>
                    </span>
                    {notification.body ? (
                      <span className="text-sm leading-6 text-stone-600">{notification.body}</span>
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
            })
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
