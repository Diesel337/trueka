"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type NavigationLink = {
  href: string;
  label: string;
};

export function NavigationLinks({ links }: { links: NavigationLink[] }) {
  const pathname = usePathname();
  const activeHref = links
    .filter((link) => pathname === link.href || pathname.startsWith(`${link.href}/`))
    .sort((first, second) => second.href.length - first.href.length)[0]?.href;

  return (
    <div className="hidden items-center gap-1 lg:flex">
      {links.map((link) => {
        const isActive = activeHref === link.href;

        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={isActive ? "page" : undefined}
            className={`whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition ${
              isActive
                ? "bg-emerald-100 text-emerald-950"
                : "text-stone-700 hover:bg-stone-100 hover:text-emerald-900"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </div>
  );
}
