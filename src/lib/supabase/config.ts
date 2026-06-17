export function getSupabasePublicConfig() {
  return {
    url: normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL),
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim(),
  };
}

export function hasSupabasePublicConfig() {
  const config = getSupabasePublicConfig();

  return Boolean(config.url && config.anonKey);
}

export function normalizeSupabaseUrl(value?: string) {
  const trimmedValue = value?.trim();

  if (!trimmedValue) {
    return undefined;
  }

  try {
    const url = new URL(trimmedValue);
    url.pathname = url.pathname.replace(/\/(?:auth|rest)\/v1\/?$/, "");
    url.search = "";
    url.hash = "";

    return url.toString().replace(/\/$/, "");
  } catch {
    return trimmedValue.replace(/\/(?:auth|rest)\/v1\/?$/, "").replace(/\/$/, "");
  }
}
