import { ShieldCheck } from "lucide-react";

import { AuthForm } from "@/components/auth-form";
import { SocialAuthButtons } from "@/components/social-auth-buttons";
import { normalizeInternalNext } from "@/lib/auth-redirect";
import { hasSupabasePublicConfig } from "@/lib/supabase/config";

type AuthPageProps = {
  searchParams: Promise<{
    next?: string;
  }>;
};

export default async function AuthPage({ searchParams }: AuthPageProps) {
  const { next } = await searchParams;
  const safeNext = normalizeInternalNext(next);
  const supabaseReady = hasSupabasePublicConfig();

  return (
    <main className="mx-auto grid w-full max-w-5xl flex-1 gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_380px] lg:px-8">
      <section className="flex flex-col justify-center">
        <p className="text-sm font-semibold uppercase text-emerald-800">Cuenta Trueka</p>
        <h1 className="mt-2 text-4xl font-semibold leading-tight text-stone-950">
          Entra para publicar y proponer trueques.
        </h1>
        <p className="mt-4 max-w-2xl text-lg leading-8 text-stone-600">
          Usa Google, Facebook o correo para publicar artículos, guardar favoritos y proponer
          trueques con calma.
        </p>
      </section>

      <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
          <ShieldCheck aria-hidden="true" size={18} />
          Acceso seguro
        </div>
        {!supabaseReady ? (
          <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-950">
            Falta conectar Supabase. Configura `NEXT_PUBLIC_SUPABASE_URL` y
            `NEXT_PUBLIC_SUPABASE_ANON_KEY` para activar auth real.
          </div>
        ) : null}

        <div className="mt-5">
          <SocialAuthButtons next={safeNext} />
        </div>

        <div className="my-5 flex items-center gap-3">
          <span className="h-px flex-1 bg-stone-200" />
          <span className="text-xs font-semibold uppercase text-stone-400">o usa correo</span>
          <span className="h-px flex-1 bg-stone-200" />
        </div>

        <AuthForm next={safeNext} />
      </section>
    </main>
  );
}
