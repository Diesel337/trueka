"use client";

import { useState } from "react";

import { hasSupabasePublicConfig } from "@/lib/supabase/config";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const socialProviders = [
  {
    provider: "google",
    label: "Continuar con Google",
    icon: GoogleLogo,
  },
  {
    provider: "facebook",
    label: "Continuar con Facebook",
    icon: FacebookLogo,
  },
] as const;

export function SocialAuthButtons({ next = "/items" }: { next?: string }) {
  const supabaseReady = hasSupabasePublicConfig();
  const [status, setStatus] = useState<string | null>(null);

  async function signIn(provider: (typeof socialProviders)[number]["provider"]) {
    if (!supabaseReady) {
      setStatus("Falta conectar Supabase para activar este acceso.");
      return;
    }

    const supabase = createSupabaseBrowserClient();
    const callbackUrl = new URL("/auth/callback", window.location.origin);
    callbackUrl.searchParams.set("next", next);
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: callbackUrl.toString(),
      },
    });

    if (error) {
      setStatus(error.message);
    }
  }

  return (
    <div className="grid gap-2">
      {socialProviders.map(({ provider, label, icon: Icon }) => (
        <button
          key={`${provider}-${label}`}
          type="button"
          onClick={() => signIn(provider)}
          className="inline-flex items-center justify-center gap-2 rounded-md border border-stone-300 px-4 py-3 text-sm font-semibold text-stone-700 hover:bg-stone-50"
        >
          <Icon />
          {label}
        </button>
      ))}
      {status ? <p className="text-sm leading-6 text-amber-800">{status}</p> : null}
    </div>
  );
}

function GoogleLogo() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5">
      <path
        fill="#4285F4"
        d="M21.6 12.23c0-.78-.07-1.53-.2-2.23H12v4.22h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.24c1.9-1.75 2.98-4.32 2.98-7.52Z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.7 0 4.97-.9 6.62-2.45l-3.24-2.51c-.9.6-2.04.96-3.38.96-2.6 0-4.8-1.76-5.59-4.12H3.07v2.59A9.99 9.99 0 0 0 12 22Z"
      />
      <path
        fill="#FBBC05"
        d="M6.41 13.88A6.01 6.01 0 0 1 6.1 12c0-.65.11-1.28.31-1.88V7.53H3.07A9.99 9.99 0 0 0 2 12c0 1.61.39 3.13 1.07 4.47l3.34-2.59Z"
      />
      <path
        fill="#EA4335"
        d="M12 6c1.47 0 2.79.51 3.83 1.5l2.87-2.87C16.96 3.01 14.7 2 12 2a9.99 9.99 0 0 0-8.93 5.53l3.34 2.59C7.2 7.76 9.4 6 12 6Z"
      />
    </svg>
  );
}

function FacebookLogo() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5">
      <path
        fill="#1877F2"
        d="M24 12a12 12 0 1 0-13.88 11.86v-8.39H7.08V12h3.04V9.36c0-3.01 1.79-4.67 4.53-4.67 1.31 0 2.68.23 2.68.23v2.95h-1.51c-1.49 0-1.96.93-1.96 1.88V12h3.33l-.53 3.47h-2.8v8.39A12 12 0 0 0 24 12Z"
      />
      <path
        fill="#fff"
        d="m16.66 15.47.53-3.47h-3.33V9.75c0-.95.47-1.88 1.96-1.88h1.51V4.92s-1.37-.23-2.68-.23c-2.74 0-4.53 1.66-4.53 4.67V12H7.08v3.47h3.04v8.39a12.2 12.2 0 0 0 3.74 0v-8.39h2.8Z"
      />
    </svg>
  );
}
