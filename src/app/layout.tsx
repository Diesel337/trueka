import type { Metadata } from "next";

import { Navigation } from "@/components/navigation";
import { SiteFooter } from "@/components/site-footer";
import { appDescription, appName, siteUrl } from "@/lib/app-config";

import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: appName,
  title: {
    default: "Trueka | Lo que tienes por lo que quieres",
    template: `%s | ${appName}`,
  },
  description: appDescription,
  openGraph: {
    title: "Trueka | Lo que tienes por lo que quieres",
    description: appDescription,
    siteName: appName,
    locale: "es_MX",
    type: "website",
    images: [
      {
        url: "/trueka-logo.png",
        width: 1024,
        height: 1024,
        alt: "Trueka",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Trueka | Lo que tienes por lo que quieres",
    description: appDescription,
    images: ["/trueka-logo.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es-MX" className="h-full antialiased">
      <body className="flex min-h-full flex-col bg-[#fbfaf7] text-stone-950">
        <Navigation />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
