import { Heart, LogOut, ShieldCheck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { signOutAction } from "@/app/actions";
import {
  getCurrentProfile,
  getNotificationsForCurrentUser,
  getUnreadNotificationCount,
} from "@/lib/data";

import { MobileNavigationMenu } from "./mobile-navigation-menu";
import { NavigationLinks, type NavigationLink } from "./navigation-links";
import { NotificationBell } from "./notification-bell";
import { UserAvatar } from "./user-avatar";

const guestLinks: NavigationLink[] = [
  { href: "/items", label: "Explorar" },
];

const userLinks: NavigationLink[] = [
  ...guestLinks,
  { href: "/items/new", label: "Publicar" },
  { href: "/items/manage", label: "Mis publicaciones" },
  { href: "/requests", label: "Solicitudes" },
  { href: "/profile", label: "Perfil" },
];

export async function Navigation() {
  const currentProfile = await getCurrentProfile();
  const [notifications, unreadNotificationCount] = currentProfile
    ? await Promise.all([
        getNotificationsForCurrentUser(),
        getUnreadNotificationCount(currentProfile.id),
      ])
    : [[], 0];
  const links = currentProfile
    ? currentProfile.isAdmin
      ? [...userLinks, { href: "/admin", label: "Admin" }]
      : userLinks
    : guestLinks;

  return (
    <header className="sticky top-0 z-30 border-b border-stone-200 bg-[#fbfaf7]/95 backdrop-blur">
      <nav className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="flex min-w-0 shrink-0 items-center gap-3">
          <Image
            src="/trueka-logo.png"
            alt="Trueka"
            width={150}
            height={46}
            className="h-9 w-auto mix-blend-multiply sm:h-10"
            priority
          />
          {currentProfile ? (
            <span className="hidden max-w-28 truncate rounded-md bg-stone-100 px-2 py-1 text-xs font-semibold text-stone-700 lg:inline-flex lg:max-w-40">
              {currentProfile.displayName}
            </span>
          ) : null}
        </Link>
        <NavigationLinks links={links} />
        {currentProfile ? (
          <>
            <div className="hidden items-center gap-2 lg:flex">
              <NotificationBell
                notifications={notifications}
                unreadCount={unreadNotificationCount}
              />
              <Link
                href="/items?saved=true"
                aria-label="Ver guardados"
                className="inline-flex min-h-10 items-center gap-2 rounded-md border border-stone-200 px-3 text-sm font-semibold text-stone-700 transition hover:bg-stone-50"
              >
                <Heart aria-hidden="true" size={16} />
                <span className="hidden lg:inline">Guardados</span>
              </Link>
              <Link
                href="/profile"
                className="inline-flex items-center gap-2 rounded-md border border-stone-200 px-3 py-2 text-sm font-semibold text-stone-700 transition hover:bg-stone-50"
              >
                <UserAvatar src={currentProfile.avatarUrl} alt={currentProfile.displayName} size={22} />
                Mi perfil
              </Link>
              <form action={signOutAction}>
                <button className="inline-flex items-center gap-2 rounded-md border border-emerald-700 px-3 py-2 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-50">
                  <LogOut aria-hidden="true" size={16} />
                  Salir
                </button>
              </form>
            </div>
            <MobileNavigationMenu
              links={links}
              currentProfile={currentProfile}
              unreadNotificationCount={unreadNotificationCount}
            />
          </>
        ) : (
          <>
            <Link
              href="/auth"
              className="hidden items-center gap-2 rounded-md border border-emerald-700 px-3 py-2 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-50 lg:inline-flex"
            >
              <ShieldCheck aria-hidden="true" size={16} />
              Entrar
            </Link>
            <MobileNavigationMenu
              links={links}
              currentProfile={null}
              unreadNotificationCount={0}
            />
          </>
        )}
      </nav>
    </header>
  );
}
