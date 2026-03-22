import Image from "next/image";

import { cn } from "@/lib/utils";
import { brand } from "@/styles/design-tokens";

export type BrandMarkVariant = "vertical" | "horizontal" | "symbol" | "wordmark" | "mono-black" | "mono-white" | "mono-yellow";

interface BrandMarkProps {
  variant?: BrandMarkVariant;
  className?: string;
  decorative?: boolean;
}

const sources: Record<BrandMarkVariant, { src: string; width: number; height: number }> = {
  vertical: { src: "/brand/mark-vertical.svg", width: 840, height: 980 },
  horizontal: { src: "/brand/mark-horizontal.svg", width: 1200, height: 420 },
  symbol: { src: "/brand/mark-symbol.svg", width: 512, height: 512 },
  wordmark: { src: "/brand/wordmark.svg", width: 1200, height: 220 },
  "mono-black": { src: "/brand/mono-black.svg", width: 512, height: 512 },
  "mono-white": { src: "/brand/mono-white.svg", width: 512, height: 512 },
  "mono-yellow": { src: "/brand/mono-yellow.svg", width: 512, height: 512 }
};

export function BrandMark({ variant = "horizontal", className, decorative = false }: BrandMarkProps) {
  const asset = sources[variant];

  return (
    <Image
      src={asset.src}
      alt={decorative ? "" : brand.name}
      aria-hidden={decorative}
      className={cn("block select-none", className)}
      width={asset.width}
      height={asset.height}
      priority={variant === "horizontal"}
    />
  );
}
