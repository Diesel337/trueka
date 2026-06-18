import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";

import { siteUrl } from "@/lib/app-config";
import { items as demoItems, profiles as demoProfiles } from "@/lib/mock-data";
import { getSupabasePublicConfig, hasSupabasePublicConfig } from "@/lib/supabase/config";

const publicRoutes = [
  "/",
  "/items",
  "/legal/privacidad",
  "/legal/terminos",
  "/legal/eliminacion-datos",
];

type PublicSitemapItem = {
  id: string;
  owner_id: string;
  updated_at?: string | null;
  created_at?: string | null;
};

type PublicSitemapProfile = {
  id: string;
  updated_at?: string | null;
};

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const dynamicRoutes = await getDynamicPublicRoutes();

  return [
    ...publicRoutes.map((route) => ({
      url: `${siteUrl}${route}`,
      lastModified: now,
      changeFrequency: route === "/items" ? "daily" as const : "weekly" as const,
      priority: route === "/" ? 1 : 0.7,
    })),
    ...dynamicRoutes,
  ];
}

async function getDynamicPublicRoutes(): Promise<MetadataRoute.Sitemap> {
  if (!hasSupabasePublicConfig()) {
    return getDemoPublicRoutes();
  }

  const { url, anonKey } = getSupabasePublicConfig();

  if (!url || !anonKey) {
    return [];
  }

  try {
    const supabase = createClient(url, anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
    const { data: itemRows, error: itemError } = await supabase
      .from("items")
      .select("id,owner_id,updated_at,created_at")
      .eq("status", "active")
      .eq("moderation_status", "active")
      .order("updated_at", { ascending: false })
      .limit(500);

    if (itemError) {
      return [];
    }

    const items = (itemRows ?? []) as PublicSitemapItem[];
    const ownerIds = Array.from(new Set(items.map((item) => item.owner_id).filter(Boolean)));
    const profiles = ownerIds.length > 0
      ? await supabase
        .from("profiles")
        .select("id,updated_at")
        .in("id", ownerIds)
        .eq("is_banned", false)
      : { data: [], error: null };
    const profileRows = profiles.error ? [] : (profiles.data ?? []) as PublicSitemapProfile[];

    return [
      ...items.map((item) => ({
        url: `${siteUrl}/items/${item.id}`,
        lastModified: parseDate(item.updated_at ?? item.created_at),
        changeFrequency: "weekly" as const,
        priority: 0.6,
      })),
      ...profileRows.map((profile) => ({
        url: `${siteUrl}/users/${profile.id}`,
        lastModified: parseDate(profile.updated_at),
        changeFrequency: "weekly" as const,
        priority: 0.5,
      })),
    ];
  } catch {
    return [];
  }
}

function getDemoPublicRoutes(): MetadataRoute.Sitemap {
  const activeItems = demoItems.filter(
    (item) => item.status === "active" && item.moderationStatus === "active",
  );
  const ownerIds = new Set(activeItems.map((item) => item.ownerId));

  return [
    ...activeItems.map((item) => ({
      url: `${siteUrl}/items/${item.id}`,
      lastModified: parseDate(item.createdAt),
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
    ...demoProfiles
      .filter((profile) => ownerIds.has(profile.id) && !profile.isBanned)
      .map((profile) => ({
        url: `${siteUrl}/users/${profile.id}`,
        lastModified: parseDate(profile.memberSince),
        changeFrequency: "weekly" as const,
        priority: 0.5,
      })),
  ];
}

function parseDate(value?: string | null) {
  if (!value) {
    return undefined;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? undefined : date;
}
