import type { Metadata, Viewport } from "next";

import { PwaRegister } from "@/components/pwa-register";
import { brand } from "@/styles/design-tokens";

import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://bomba-aberta.vercel.app"),
  title: brand.name,
  description: "Mapa popular de precos de combustiveis no Sul Fluminense.",
  manifest: "/manifest.webmanifest",
  applicationName: brand.name,
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: brand.name
  },
  icons: {
    icon: "/icons/icon.svg",
    apple: "/icons/apple-touch-icon.svg"
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
