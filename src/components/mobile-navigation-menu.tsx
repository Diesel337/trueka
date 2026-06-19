"use client";

import {
  Bell,
  ChevronRight,
  Heart,
  LogOut,
  Menu,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, type ReactNode } from "react";

import { signOutAction } from "@/app/actions";
import type { Profile } from "@/lib/types";

import type { NavigationLink } from "./navigation-links";
import { UserAvatar } from "./user-avatar";

type MobileNavigationMenuProps = {
  links: NavigationLink[];
  currentProfile: Profile | null;
  unreadNotificationCount: number;
};

type MobileMenuEntry = NavigationLink & {
  icon?: ReactNode;
};

export function MobileNavigationMenu({
  links,
  currentProfile,
  unreadNotificationCount,
}: MobileNavigationMenuProps) {
  const pathname = usePathname() ?? "/";
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const closeMenu = () => {
    if (detailsRef.current) {
      detailsRef.current.open = false;
    }
  };
  const notificationLabel =
    unreadNotificationCount > 0
      ? `${unreadNotificationCount} notificación nueva`
      : "Notificaciones";
  const menuLinks: MobileMenuEntry[] = currentProfile
    ? [
        ...links,
        {
          href: "/notifications",
          label: notificationLabel,
          icon: <Bell aria-hidden="true" size={17} />,
        },
        {
          href: "/items?saved=true",
          label: "Guardados",
          icon: <Heart aria-hidden="true" size={17} />,
        },
      ]
    : [
        ...links,
        {
          href: "/auth",
          label: "Entrar",
          icon: <ShieldCheck aria-hidden="true" size={17} />,
        },
      ];
  const currentLabel = getCurrentSectionLabel(pathname, menuLinks);

  return (
    <div className="ml-auto flex min-w-0 items-center gap-2 lg:hidden">
      <span
        aria-label={`Sección actual: ${currentLabel}`}
        className="min-w-0 max-w-[6.75rem] truncate rounded-md bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-900 ring-1 ring-emerald-100 sm:max-w-[12rem]"
      >
        {currentLabel}
      </span>
      <details ref={detailsRef} className="group relative shrink-0">
        <summary
          aria-label="Abrir menú principal"
          className="relative inline-flex min-h-10 cursor-pointer list-none items-center gap-2 rounded-md border border-emerald-700 px-3 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-50 [&::-webkit-details-marker]:hidden"
        >
          <Menu aria-hidden="true" size={18} />
          Menú
          {unreadNotificationCount > 0 ? (
            <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-emerald-700 px-1.5 py-0.5 text-center text-[11px] font-bold leading-none text-white">
              {unreadNotificationCount > 9 ? "9+" : unreadNotificationCount}
            </span>
          ) : null}
        </summary>

        <div className="absolute right-0 z-50 mt-2 w-[min(20rem,calc(100vw-2rem))] overflow-hidden rounded-lg border border-stone-200 bg-white shadow-lg">
          {currentProfile ? (
            <div className="flex items-center gap-3 border-b border-stone-100 p-3">
              <UserAvatar
                src={currentProfile.avatarUrl}
                alt={currentProfile.displayName}
                size={36}
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-stone-950">
                  {currentProfile.displayName}
                </p>
                <p className="text-xs text-stone-500">Cuenta Trueka</p>
              </div>
            </div>
          ) : null}

          <div className="p-2">
            {menuLinks.map((link) => (
              <MobileMenuLink
                key={link.href}
                href={link.href}
                label={link.label}
                icon={link.icon}
                isActive={isActiveNavigationPath(pathname, link.href)}
                onSelect={closeMenu}
              />
            ))}

            {currentProfile ? (
              <form action={signOutAction} className="mt-2 border-t border-stone-100 pt-2">
                <button
                  className="flex min-h-11 w-full items-center justify-between gap-3 rounded-md px-3 text-left text-sm font-semibold text-emerald-800 transition hover:bg-emerald-50"
                  onClick={closeMenu}
                >
                  <span className="inline-flex items-center gap-3">
                    <LogOut aria-hidden="true" size={17} />
                    Salir
                  </span>
                  <ChevronRight aria-hidden="true" size={16} className="text-stone-400" />
                </button>
              </form>
            ) : null}
          </div>
        </div>
      </details>
    </div>
  );
}

function MobileMenuLink({
  href,
  label,
  icon,
  isActive,
  onSelect,
}: {
  href: string;
  label: string;
  icon?: ReactNode;
  isActive: boolean;
  onSelect: () => void;
}) {
  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={`flex min-h-11 items-center justify-between gap-3 rounded-md px-3 text-sm font-semibold transition ${
        isActive
          ? "bg-emerald-50 text-emerald-950 ring-1 ring-emerald-100"
          : "text-stone-700 hover:bg-stone-50 hover:text-emerald-900"
      }`}
      onClick={onSelect}
    >
      <span className="inline-flex min-w-0 items-center gap-3">
        {icon}
        <span className="truncate">{label}</span>
      </span>
      <ChevronRight
        aria-hidden="true"
        size={16}
        className={`shrink-0 ${isActive ? "text-emerald-700" : "text-stone-400"}`}
      />
    </Link>
  );
}

function getCurrentSectionLabel(pathname: string, links: MobileMenuEntry[]) {
  const candidates = [{ href: "/", label: "Inicio" }, ...links].filter(
    (link) => !link.href.includes("?"),
  );
  const activeLink = candidates
    .filter((link) => isActiveNavigationPath(pathname, link.href))
    .sort((first, second) => getHrefPath(second.href).length - getHrefPath(first.href).length)[0];

  return activeLink?.label ?? "Trueka";
}

function isActiveNavigationPath(pathname: string, href: string) {
  if (href.includes("?")) {
    return false;
  }

  const hrefPath = getHrefPath(href);
  if (hrefPath === "/") {
    return pathname === "/";
  }

  return pathname === hrefPath || pathname.startsWith(`${hrefPath}/`);
}

function getHrefPath(href: string) {
  return href.split("?")[0] || "/";
}
