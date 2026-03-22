import type { Metadata, Viewport } from "next";

import { PwaRegister } from "@/components/pwa-register";
import { brand } from "@/styles/design-tokens";

import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://bomba-aberta.vercel.app"),
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
    url: "/",
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
