import { redirect } from "next/navigation";
import { NextRequest } from "next/server";

import { normalizeInternalNext } from "@/lib/auth-redirect";
import { hasSupabasePublicConfig } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = normalizeInternalNext(requestUrl.searchParams.get("next"));

  if (code && hasSupabasePublicConfig()) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      await supabase.rpc("sync_current_user_profile_from_auth");
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;

      if (userId) {
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("onboarding_completed_at")
          .eq("id", userId)
          .maybeSingle();

        if (!profileError && !profile?.onboarding_completed_at) {
          redirect(`/onboarding?next=${encodeURIComponent(next)}`);
        }
      }
    }
  }

  redirect(next);
}
