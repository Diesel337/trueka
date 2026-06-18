import { CheckCircle2, Star } from "lucide-react";

import type { Profile } from "@/lib/types";

export function TrustBadge({ profile, compact = false }: { profile: Profile; compact?: boolean }) {
  const wrapperClassName = compact
    ? "flex flex-wrap items-center gap-1 text-[10px] text-stone-600 sm:gap-1.5 sm:text-[11px]"
    : "flex flex-wrap items-center gap-2 text-xs text-stone-600";
  const badgeClassName = compact
    ? "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-medium"
    : "inline-flex items-center gap-1 rounded-md px-2 py-1 font-medium";
  const iconSize = compact ? 12 : 14;

  return (
    <div className={wrapperClassName}>
      <span className={`${badgeClassName} bg-amber-50 text-amber-800`}>
        <Star aria-hidden="true" size={iconSize} />
        {profile.ratingAvg.toFixed(1)} ({profile.ratingCount})
      </span>
      {profile.emailVerified ? (
        <span className={`${badgeClassName} bg-sky-50 text-sky-800`}>
          <CheckCircle2 aria-hidden="true" size={iconSize} />
          {compact ? "Correo" : "Correo verificado"}
        </span>
      ) : null}
      {profile.phoneVerified ? (
        <span className={`${badgeClassName} bg-emerald-50 text-emerald-800`}>
          <CheckCircle2 aria-hidden="true" size={iconSize} />
          {compact ? "Tel." : "Teléfono verificado"}
        </span>
      ) : null}
    </div>
  );
}
