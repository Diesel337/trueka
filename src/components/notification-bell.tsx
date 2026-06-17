"use client";

import {
  ArrowRight,
  Bell,
  CheckCircle2,
  Eye,
  HeartHandshake,
  MessageCircle,
  RefreshCcw,
  Sparkles,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";

import {
  getNotificationsSnapshotAction,
  markAllNotificationsReadAction,
  markNotificationsSeenAction,
  openNotificationAction,
} from "@/app/actions";
import type { Notification, NotificationType } from "@/lib/types";

export function NotificationBell({
  notifications,
  unreadCount,
}: {
  notifications: Notification[];
  unreadCount: number;
}) {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [liveNotifications, setLiveNotifications] = useState(notifications);
  const [liveUnreadCount, setLiveUnreadCount] = useState(unreadCount);
  const [, startTransition] = useTransition();
  const visibleNewCount = liveUnreadCount;
  const unreadRowCount = liveNotifications.filter((notification) => !notification.readAt).length;

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      if (document.hidden) {
        return;
      }

      startTransition(async () => {
        const snapshot = await getNotificationsSnapshotAction();

        setLiveNotifications(snapshot.notifications);
        setLiveUnreadCount(snapshot.unreadCount);
      });
    }, 25000);

    return () => window.clearInterval(intervalId);
  }, [startTransition]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function closeOnOutsideClick(event: PointerEvent) {
      if (!detailsRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("pointerdown", closeOnOutsideClick);

    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
    };
  }, [isOpen]);

  function handleToggle(open: boolean) {
    setIsOpen(open);

    if (open && visibleNewCount > 0) {
      setLiveUnreadCount(0);
      startTransition(async () => {
        await markNotificationsSeenAction();
      });
    }
  }

  return (
    <details
      ref={detailsRef}
      open={isOpen}
      onToggle={(event) => handleToggle(event.currentTarget.open)}
      className="group relative"
    >
      <summary
        aria-label={visibleNewCount > 0 ? `${visibleNewCount} notificaciones nuevas` : "Sin notificaciones nuevas"}
        className="relative inline-flex min-h-10 cursor-pointer list-none items-center gap-2 rounded-md border border-stone-200 px-3 text-sm font-semibold text-stone-700 transition hover:bg-stone-50 [&::-webkit-details-marker]:hidden"
      >
        <Bell aria-hidden="true" size={17} />
        <span className="hidden lg:inline">
          {visibleNewCount > 0 ? `${visibleNewCount} nueva${visibleNewCount === 1 ? "" : "s"}` : "Sin nuevas"}
        </span>
        {visibleNewCount > 0 ? (
          <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-emerald-700 px-1.5 py-0.5 text-center text-[11px] font-bold leading-none text-white">
            {visibleNewCount > 9 ? "9+" : visibleNewCount}
          </span>
        ) : null}
      </summary>

      <div className="absolute right-0 z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-lg border border-stone-200 bg-white p-2 shadow-lg">
        <div className="flex items-center justify-between gap-3 border-b border-stone-100 px-2 py-2">
          <p className="text-sm font-semibold text-stone-950">Notificaciones</p>
          {unreadRowCount > 0 ? (
            <form
              action={() => {
                const readAt = new Date().toISOString();

                setLiveUnreadCount(0);
                setLiveNotifications((currentNotifications) =>
                  currentNotifications.map((notification) => ({
                    ...notification,
                    readAt: notification.readAt ?? readAt,
                    seenAt: notification.seenAt ?? readAt,
                  })),
                );
                startTransition(async () => {
                  await markAllNotificationsReadAction();
                });
              }}
            >
              <button className="text-xs font-semibold text-emerald-800 hover:text-emerald-950">
                Marcar leídas
              </button>
            </form>
          ) : null}
        </div>

        <div className="max-h-96 overflow-y-auto py-1">
          {liveNotifications.length > 0 ? (
            liveNotifications.map((notification) => {
              const isUnread = !notification.readAt;
              const Icon = getNotificationIcon(notification.type);

              return (
                <form key={notification.id} action={openNotificationAction}>
                  <input type="hidden" name="notificationId" value={notification.id} />
                  <input type="hidden" name="href" value={notification.href} />
                  <button
                    className={`grid w-full grid-cols-[38px_1fr] gap-3 rounded-md border px-3 py-3 text-left transition ${
                      isUnread
                        ? "border-sky-200 bg-sky-50 hover:bg-sky-100"
                        : "border-transparent bg-white hover:bg-stone-50"
                    }`}
                  >
                    <span
                      className={`grid size-9 place-items-center rounded-full ${
                        isUnread ? "bg-sky-100 text-sky-800" : "bg-stone-100 text-stone-500"
                      }`}
                    >
                      <Icon aria-hidden="true" size={17} />
                    </span>
                    <span className="min-w-0">
                      <span className="flex items-start justify-between gap-3">
                        <span className="text-sm font-semibold text-stone-950">{notification.title}</span>
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                            isUnread
                              ? "bg-sky-600 text-white"
                              : "bg-stone-100 text-stone-500"
                          }`}
                        >
                          {isUnread ? "Nueva" : "Vista"}
                        </span>
                      </span>
                      {notification.body ? (
                        <span className={`mt-1 block text-sm leading-5 ${isUnread ? "text-sky-950" : "text-stone-600"}`}>
                          {notification.body}
                        </span>
                      ) : null}
                      <span className="mt-2 flex items-center justify-between gap-2 text-xs">
                        <span className={isUnread ? "font-semibold text-sky-700" : "text-stone-400"}>
                          {formatNotificationTime(notification.createdAt)}
                        </span>
                        <span className={isUnread ? "text-sky-700" : "text-stone-400"}>
                          {isUnread ? "Abrir" : "Revisada"}
                        </span>
                      </span>
                    </span>
                  </button>
                </form>
              );
            })
          ) : (
            <p className="px-2 py-6 text-sm text-stone-500">
              Aquí aparecerán solicitudes, mensajes y confirmaciones de trueque.
            </p>
          )}
        </div>

        <Link
          href="/notifications"
          className="mt-1 flex items-center justify-between rounded-md border-t border-stone-100 px-2 py-3 text-sm font-semibold text-emerald-800 hover:bg-emerald-50"
        >
          Ver todas
          <ArrowRight aria-hidden="true" size={16} />
        </Link>
      </div>
    </details>
  );
}

function getNotificationIcon(type: NotificationType) {
  if (type === "message_received") {
    return MessageCircle;
  }

  if (type === "trade_request_accepted" || type === "trade_completed" || type === "trade_completion_confirmed") {
    return CheckCircle2;
  }

  if (type === "trade_request_rejected" || type === "trade_request_cancelled") {
    return XCircle;
  }

  if (type === "item_interest_match") {
    return Sparkles;
  }

  if (type === "item_view_summary") {
    return Eye;
  }

  if (type === "trade_request_received") {
    return HeartHandshake;
  }

  return RefreshCcw;
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
