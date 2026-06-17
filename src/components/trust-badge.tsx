import { CheckCircle2, Star } from "lucide-react";

import type { Profile } from "@/lib/types";

export function TrustBadge({ profile }: { profile: Profile }) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-stone-600">
      <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-1 font-medium text-amber-800">
        <Star aria-hidden="true" size={14} />
        {profile.ratingAvg.toFixed(1)} ({profile.ratingCount})
      </span>
      {profile.emailVerified ? (
        <span className="inline-flex items-center gap-1 rounded-md bg-sky-50 px-2 py-1 font-medium text-sky-800">
          <CheckCircle2 aria-hidden="true" size={14} />
          Correo verificado
        </span>
      ) : null}
      {profile.phoneVerified ? (
        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 font-medium text-emerald-800">
          <CheckCircle2 aria-hidden="true" size={14} />
          Teléfono verificado
        </span>
      ) : null}
    </div>
  );
}
