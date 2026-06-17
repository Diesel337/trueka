import type { MetadataRoute } from "next";

import { siteUrl } from "@/lib/app-config";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/items", "/legal/privacidad", "/legal/terminos", "/legal/eliminacion-datos"],
      disallow: ["/admin", "/auth", "/onboarding", "/profile", "/requests", "/notifications"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
