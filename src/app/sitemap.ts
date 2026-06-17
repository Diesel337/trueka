import type { MetadataRoute } from "next";

import { siteUrl } from "@/lib/app-config";

const publicRoutes = [
  "/",
  "/items",
  "/legal/privacidad",
  "/legal/terminos",
  "/legal/eliminacion-datos",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return publicRoutes.map((route) => ({
    url: `${siteUrl}${route}`,
    lastModified: now,
  }));
}
