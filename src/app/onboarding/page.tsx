import { redirect } from "next/navigation";

import { OnboardingForm } from "@/components/onboarding-form";
import {
  getCatalogData,
  getCurrentProfile,
  getCurrentProfilePrivateInterestTags,
} from "@/lib/data";
import { normalizeInternalNext } from "@/lib/auth-redirect";

type OnboardingPageProps = {
  searchParams: Promise<{
    next?: string;
  }>;
};

export default async function OnboardingPage({ searchParams }: OnboardingPageProps) {
  const { next } = await searchParams;
  const safeNext = normalizeInternalNext(next);
  const [profile, catalog, selectedTags] = await Promise.all([
    getCurrentProfile(),
    getCatalogData(),
    getCurrentProfilePrivateInterestTags(),
  ]);

  if (!profile) {
    redirect(`/auth?next=${encodeURIComponent(`/onboarding?next=${encodeURIComponent(safeNext)}`)}`);
  }

  return (
    <main className="mx-auto grid w-full max-w-5xl flex-1 gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:px-8">
      <section className="flex flex-col justify-center">
        <p className="text-sm font-semibold uppercase text-emerald-800">Bienvenido a Trueka</p>
        <h1 className="mt-2 text-4xl font-semibold leading-tight text-stone-950">
          Completa tu perfil para encontrar mejores trueques.
        </h1>
        <p className="mt-4 max-w-xl text-lg leading-8 text-stone-600">
          Tu zona e intereses ayudan a ordenar publicaciones y avisarte cuando aparezca algo que puede servirte.
        </p>
        <div className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-950">
          Trueka sigue siendo artículos por artículos: sin pagos, sin envíos gestionados y sin mediación de entregas.
        </div>
      </section>

      <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
        <OnboardingForm
          profile={profile}
          tags={catalog.tags}
          selectedTagSlugs={selectedTags.map((tag) => tag.slug)}
          next={safeNext}
        />
      </section>
    </main>
  );
}
