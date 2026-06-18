import { CalendarDays, MapPin, Star } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ItemCard } from "@/components/item-card";
import { ProfileReviewsSection } from "@/components/profile-reviews-section";
import { BlockUserForm, ReportForm } from "@/components/safety-actions";
import { TrustBadge } from "@/components/trust-badge";
import { UserAvatar } from "@/components/user-avatar";
import {
  getCurrentProfile,
  getProfilePageData,
  getProfileReviews,
  getSavedItemIdsForCurrentUser,
} from "@/lib/data";
import { getMexicoStateDisplayName } from "@/lib/mexico-locations";

type PublicProfilePageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function PublicProfilePage({ params }: PublicProfilePageProps) {
  const { id } = await params;
  const [profileData, currentProfile] = await Promise.all([
    getProfilePageData(id),
    getCurrentProfile(),
  ]);

  if (!profileData) {
    notFound();
  }

  const { profile, stats, activeItems } = profileData;
  const [savedItemIds, reviews] = await Promise.all([
    currentProfile ? getSavedItemIdsForCurrentUser() : Promise.resolve([]),
    getProfileReviews(profile.id),
  ]);
  const savedItemIdsSet = new Set(savedItemIds);
  const isOwnProfile = currentProfile?.id === profile.id;

  return (
    <main className="flex-1">
      <section className="border-b border-stone-200 bg-white">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_360px] lg:px-8">
          <div>
            <UserAvatar src={profile.avatarUrl} alt={profile.displayName} size={80} />
            <h1 className="mt-4 text-3xl font-semibold text-stone-950">{profile.displayName}</h1>
            <p className="mt-2 flex items-center gap-2 text-stone-600">
              <MapPin aria-hidden="true" size={17} />
              {profile.city}, {getMexicoStateDisplayName(profile.state)}
            </p>
            {profile.bio ? <p className="mt-4 max-w-2xl leading-7 text-stone-700">{profile.bio}</p> : null}
            <div className="mt-4">
              <TrustBadge profile={profile} />
            </div>
          </div>

          <aside className="rounded-lg border border-stone-200 bg-stone-50 p-5">
            <h2 className="text-lg font-semibold text-stone-950">Reputación</h2>
            <div className="mt-4 grid gap-2">
              <Metric label="Calificación" value={`${profile.ratingAvg.toFixed(1)}/5`} icon="star" />
              <Metric label="Reseñas recibidas" value={profile.ratingCount.toString()} />
              <Metric label="Trueques completados" value={stats.completedTradesCount.toString()} />
              <Metric label="Artículos publicados" value={stats.publishedItemsCount.toString()} />
              <Metric label="Artículos activos" value={stats.activeItemsCount.toString()} />
              <Metric label="Tasa de trueque" value={`${stats.tradeRate}%`} />
            </div>
            <p className="mt-4 flex items-center gap-2 text-sm text-stone-600">
              <CalendarDays aria-hidden="true" size={16} />
              En Trueka desde {new Date(profile.memberSince).toLocaleDateString("es-MX")}
            </p>
            {!isOwnProfile ? (
              <div className="mt-5 grid gap-3 border-t border-stone-200 pt-5">
                <ReportForm
                  reportedUserId={profile.id}
                  defaultReason="suspicious_user"
                  buttonLabel="Reportar usuario"
                />
                <BlockUserForm blockedUserId={profile.id} />
              </div>
            ) : null}
          </aside>
        </div>
      </section>

      <ProfileReviewsSection
        reviews={reviews}
        className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8"
      />

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-stone-950">Artículos activos</h2>
            <p className="mt-2 text-stone-600">
              Publicaciones disponibles actualmente para proponer trueque.
            </p>
          </div>
          <Link href="/items" className="text-sm font-semibold text-emerald-800 hover:text-emerald-950">
            Explorar más
          </Link>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {activeItems.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              owner={profile}
              compact
              currentProfile={currentProfile}
              isSaved={savedItemIdsSet.has(item.id)}
            />
          ))}
        </div>
      </section>
    </main>
  );
}

function Metric({ label, value, icon }: { label: string; value: string; icon?: "star" }) {
  return (
    <div className="flex items-center justify-between rounded-md border border-stone-200 bg-white px-3 py-2">
      <span className="text-sm text-stone-600">{label}</span>
      <span className="inline-flex items-center gap-1 font-semibold text-stone-950">
        {icon === "star" ? <Star aria-hidden="true" size={15} className="text-amber-600" /> : null}
        {value}
      </span>
    </div>
  );
}
