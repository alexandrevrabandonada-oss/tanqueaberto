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
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon.svg", type: "image/svg+xml", sizes: "any" },
      { url: "/favicon-16.png", type: "image/png", sizes: "16x16" },
      { url: "/favicon-32.png", type: "image/png", sizes: "32x32" },
      { url: "/favicon-48.png", type: "image/png", sizes: "48x48" },
      { url: "/icon-192.png", type: "image/png", sizes: "192x192" }
    ],
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png"
  },
  openGraph: {
    title: `${brand.name} | ${brand.tagline}`,
    description: "Mapa popular de preços de combustíveis no Sul Fluminense.",
    url: siteUrl,
    siteName: brand.name,
    images: [
      {
        url: "/brand/bomba-aberta/logo/bomba-aberta-logo-og.png",
        width: 1200,
        height: 630,
        alt: `${brand.name} por VR Abandonada`
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: `${brand.name} | ${brand.tagline}`,
    description: "Mapa popular de preços de combustíveis no Sul Fluminense.",
    images: ["/brand/bomba-aberta/logo/bomba-aberta-logo-og.png"]
  }
};

export const viewport: Viewport = {
  themeColor: "#ffc700",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover"
};

import { ErrorBoundary } from "@/components/ui/error-boundary";
import { MissionProvider } from "@/components/mission/mission-context";
import { MissionOverlay } from "@/components/mission/mission-overlay";
import { SubmissionHistoryProvider } from "@/components/history/submission-history-context";
import { TestModeIndicator } from "@/components/test/test-mode-indicator";

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className="bg-[color:var(--color-bg)] font-body text-[color:var(--color-text)]">
        <PwaRegister />
        <MissionProvider>
          <SubmissionHistoryProvider>
            <TestModeIndicator />
            <MissionOverlay />
            <ErrorBoundary name="RootLayout">{children}</ErrorBoundary>
          </SubmissionHistoryProvider>
        </MissionProvider>
      </body>
    </html>
  );
}
