import type { Metadata, Viewport } from "next";

import { PwaRegister } from "@/components/pwa-register";
import { isBetaClosed } from "@/lib/beta/gate";
import { brand } from "@/styles/design-tokens";

import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://bomba-aberta.vercel.app");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: brand.name,
    template: `%s | ${brand.name}`
  },
  description: "Mapa popular de preços de combustíveis no Sul Fluminense.",
  manifest: "/manifest.webmanifest",
  applicationName: brand.name,
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: brand.name
  },
  robots: isBetaClosed()
    ? {
        index: false,
        follow: false,
        nocache: true
      }
    : {
        index: true,
        follow: true
      },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/icons/icon.svg", type: "image/svg+xml" }
    ],
    shortcut: "/favicon.svg",
    apple: "/icons/apple-touch-icon.svg"
  },
  openGraph: {
    title: `${brand.name} | ${brand.tagline}`,
    description: "Mapa popular de preços de combustíveis no Sul Fluminense.",
    url: siteUrl,
    siteName: brand.name,
    images: [
      {
        url: "/brand/og-preview.svg",
        width: 1200,
        height: 630,
        alt: brand.name
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: `${brand.name} | ${brand.tagline}`,
    description: "Mapa popular de preços de combustíveis no Sul Fluminense.",
    images: ["/brand/og-preview.svg"]
  }
};

export const viewport: Viewport = {
  themeColor: "#ffc700",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className="bg-[color:var(--color-bg)] font-body text-[color:var(--color-text)]">
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}
