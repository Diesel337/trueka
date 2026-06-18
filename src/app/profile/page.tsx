import { CheckCircle2, CircleDashed, MapPin, Star } from "lucide-react";
import Link from "next/link";

import { PhoneVerificationForm } from "@/components/phone-verification-form";
import { ProfileReviewsSection } from "@/components/profile-reviews-section";
import { ProfileForm } from "@/components/profile-form";
import { UnblockUserForm } from "@/components/safety-actions";
import { UserAvatar } from "@/components/user-avatar";
import {
  getBlockedProfilesForCurrentUser,
  getCatalogData,
  getCurrentProfile,
  getCurrentProfilePrivateInterestTags,
  getOwnProfilePageData,
  getProfileReviews,
} from "@/lib/data";
import { getMexicoStateDisplayName } from "@/lib/mexico-locations";

export default async function ProfilePage() {
  const currentUser = await getCurrentProfile();

  if (!currentUser) {
    return (
      <main className="mx-auto flex max-w-3xl flex-1 items-center px-4 py-12">
        <div className="rounded-lg border border-stone-200 bg-white p-8">
          <h1 className="text-2xl font-semibold text-stone-950">Inicia sesion</h1>
          <p className="mt-2 text-stone-600">
            Necesitas una cuenta para ver y editar tu perfil.
          </p>
          <Link
            href={`/auth?next=${encodeURIComponent("/profile")}`}
            className="mt-5 inline-flex rounded-md bg-emerald-700 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-800"
          >
            Entrar o crear cuenta
          </Link>
        </div>
      </main>
    );
  }

  const [profileData, catalog, selectedPrivateInterestTags, blockedProfiles, reviews] = await Promise.all([
    getOwnProfilePageData(),
    getCatalogData(),
    getCurrentProfilePrivateInterestTags(),
    getBlockedProfilesForCurrentUser(),
    getProfileReviews(currentUser.id),
  ]);

  if (!profileData) {
    return null;
  }

  const { stats } = profileData;

  return (
    <main className="flex-1">
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
          <aside className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
            <UserAvatar src={currentUser.avatarUrl} alt={currentUser.displayName} size={80} />
            <h1 className="mt-4 text-2xl font-semibold text-stone-950">{currentUser.displayName}</h1>
            <p className="mt-1 flex items-center gap-2 text-sm text-stone-600">
              <MapPin aria-hidden="true" size={16} />
              {currentUser.city}, {getMexicoStateDisplayName(currentUser.state)}
            </p>
            <p className="mt-4 text-sm leading-6 text-stone-600">{currentUser.bio}</p>

            <div className="mt-5 grid gap-2">
              <Metric label="Calificacion" value={`${currentUser.ratingAvg.toFixed(1)}/5`} icon="star" />
              <Metric label="Trueques completados" value={stats.completedTradesCount.toString()} />
              <Metric label="Articulos publicados" value={stats.publishedItemsCount.toString()} />
              <Metric label="Articulos activos" value={stats.activeItemsCount.toString()} />
              <Metric label="Vistas unicas de tus articulos" value={stats.totalItemViews.toLocaleString("es-MX")} />
              <Metric label="Tasa de trueque" value={`${stats.tradeRate}%`} />
            </div>

            <div className="mt-5 grid gap-2 text-sm">
              <Verification
                enabled={currentUser.emailVerified}
                label={currentUser.emailVerified ? "Correo verificado" : "Correo pendiente de verificar"}
              />
              <Verification
                enabled={currentUser.phoneVerified}
                label={currentUser.phoneVerified ? "Telefono verificado" : "Telefono pendiente"}
              />
            </div>

            <div className="mt-5 grid gap-2">
              <Link
                href="/items/manage"
                className="inline-flex items-center justify-center rounded-md bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800"
              >
                Mis publicaciones
              </Link>
              <Link
                href="/items/new"
                className="inline-flex items-center justify-center rounded-md border border-stone-300 px-4 py-2.5 text-sm font-semibold text-stone-700 transition hover:bg-stone-50"
              >
                Publicar articulo
              </Link>
            </div>
          </aside>

          <section>
            <PhoneVerificationForm profile={currentUser} />
            <div className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
              <h2 className="text-xl font-semibold text-stone-950">Editar perfil</h2>
              <ProfileForm
                profile={currentUser}
                tags={catalog.tags}
                selectedTagSlugs={selectedPrivateInterestTags.map((tag) => tag.slug)}
              />
            </div>

            <ProfileReviewsSection
              reviews={reviews}
              title="Tus reseñas recibidas"
              description="Comentarios que otras personas dejaron después de trueques completados."
              emptyMessage="Todavía no tienes reseñas de trueques completados."
              className="mt-6"
            />

            <section className="mt-6 rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
              <h2 className="text-xl font-semibold text-stone-950">Usuarios bloqueados</h2>
              <p className="mt-2 text-sm leading-6 text-stone-600">
                No pueden enviarte solicitudes, escribirte en trueques ni generar avisos contigo.
              </p>
              {blockedProfiles.length > 0 ? (
                <div className="mt-4 grid gap-3">
                  {blockedProfiles.map((profile) => (
                    <div
                      key={profile.id}
                      className="grid gap-3 rounded-md border border-stone-200 p-3 sm:grid-cols-[1fr_auto] sm:items-center"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <UserAvatar src={profile.avatarUrl} alt={profile.displayName} size={44} />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-stone-950">
                            {profile.displayName}
                          </p>
                          <p className="text-xs text-stone-500">
                            {profile.city}, {getMexicoStateDisplayName(profile.state)}
                          </p>
                        </div>
                      </div>
                      <UnblockUserForm blockedUserId={profile.id} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-4 rounded-md border border-dashed border-stone-300 bg-stone-50 p-4 text-sm text-stone-600">
                  No tienes usuarios bloqueados.
                </div>
              )}
            </section>
          </section>
        </div>
      </section>
    </main>
  );
}

function Metric({ label, value, icon }: { label: string; value: string; icon?: "star" }) {
  return (
    <div className="flex items-center justify-between rounded-md border border-stone-200 px-3 py-2">
      <span className="text-sm text-stone-600">{label}</span>
      <span className="inline-flex items-center gap-1 font-semibold text-stone-950">
        {icon === "star" ? <Star aria-hidden="true" size={15} className="text-amber-600" /> : null}
        {value}
      </span>
    </div>
  );
}

function Verification({ enabled, label }: { enabled: boolean; label: string }) {
  const normalizedLabel = label.toLocaleLowerCase("es-MX");
  const isPhone = normalizedLabel.includes("tel");
  const isEmail = normalizedLabel.includes("correo");
  const detail = enabled
    ? isPhone
      ? "Confirmado por codigo SMS."
      : "Se confirmo desde tu metodo de acceso."
    : isPhone
      ? "Agrega tu telefono con un codigo SMS."
      : isEmail
        ? "Confirma tu correo o vuelve a entrar con Google/Facebook."
        : "Pendiente de confirmar.";
  const actionLabel = !enabled && isPhone ? "Verificar ahora" : null;
  const className = `flex items-start gap-2 rounded-md px-3 py-2 text-left font-medium ${
    enabled ? "bg-emerald-50 text-emerald-800" : "bg-stone-100 text-stone-600"
  }`;
  const content = (
    <>
      {enabled ? (
        <CheckCircle2 aria-hidden="true" size={16} className="mt-0.5 shrink-0" />
      ) : (
        <CircleDashed aria-hidden="true" size={16} className="mt-0.5 shrink-0" />
      )}
      <span>
        <span className="block font-semibold">{label}</span>
        <span className="block text-xs font-normal leading-5 opacity-80">{detail}</span>
        {actionLabel ? (
          <span className="mt-1 block text-xs font-semibold text-emerald-800 underline">
            {actionLabel}
          </span>
        ) : null}
      </span>
    </>
  );

  if (actionLabel) {
    return (
      <a href="#phone-verification-phone" className={`${className} hover:bg-emerald-50 hover:text-emerald-800`}>
        {content}
      </a>
    );
  }

  return <span className={className}>{content}</span>;
}
