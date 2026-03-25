import Image from "next/image";

import { cn } from "@/lib/utils";
import { brand } from "@/styles/design-tokens";

export type BrandMarkVariant =
  | "icon"
  | "logo-horizontal"
  | "emblem"
  | "vertical"
  | "horizontal"
  | "symbol"
  | "wordmark"
  | "mono-black"
  | "mono-white"
  | "mono-yellow";

interface BrandMarkProps {
  variant?: BrandMarkVariant;
  className?: string;
  decorative?: boolean;
}

const sources: Record<BrandMarkVariant, { src: string; width: number; height: number }> = {
  icon: { src: "/brand/bomba-aberta/icon/bomba-aberta-icon.svg", width: 512, height: 512 },
  "logo-horizontal": { src: "/brand/bomba-aberta/logo/bomba-aberta-logo-horizontal.svg", width: 1200, height: 420 },
  emblem: { src: "/brand/bomba-aberta/emblem/bomba-aberta-emblem.svg", width: 840, height: 980 },
  vertical: { src: "/brand/bomba-aberta/emblem/bomba-aberta-emblem.svg", width: 840, height: 980 },
  horizontal: { src: "/brand/bomba-aberta/logo/bomba-aberta-logo-horizontal.svg", width: 1200, height: 420 },
  symbol: { src: "/brand/bomba-aberta/icon/bomba-aberta-icon.svg", width: 512, height: 512 },
  wordmark: { src: "/brand/wordmark.svg", width: 1200, height: 220 },
  "mono-black": { src: "/brand/mono-black.svg", width: 512, height: 512 },
  "mono-white": { src: "/brand/mono-white.svg", width: 512, height: 512 },
  "mono-yellow": { src: "/brand/mono-yellow.svg", width: 512, height: 512 }
};

export function BrandMark({ variant = "logo-horizontal", className, decorative = false }: BrandMarkProps) {
  const asset = sources[variant];

  return (
    <Image
      src={asset.src}
      alt={decorative ? "" : brand.name}
      aria-hidden={decorative}
      className={cn("block select-none", className)}
      width={asset.width}
      height={asset.height}
      priority={variant === "logo-horizontal" || variant === "horizontal"}
    />
  );
}
