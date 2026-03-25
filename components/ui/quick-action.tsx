"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";
import { Button } from "./button";
import { type Route } from "next";
import Link from "next/link";

interface QuickActionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: LucideIcon;
  label: string;
  variant?: 'primary' | 'secondary' | 'accent' | 'outline';
  isStreetMode?: boolean;
  href?: Route | string;
  showLabel?: boolean;
  layout?: 'vertical' | 'horizontal';
  isAssisted?: boolean;
  isUltraClaro?: boolean;
  isAdvanced?: boolean;
}

export const QuickActionButton = React.forwardRef<HTMLButtonElement, QuickActionButtonProps>(
  ({ icon: Icon, label, variant = 'secondary', isStreetMode, isAssisted, isUltraClaro, isAdvanced, href, showLabel = true, layout = 'vertical', className, onClick, ...props }, ref) => {
    const isHorizontal = layout === 'horizontal';
    const effectiveShowLabel = showLabel && !isAdvanced;
    
    const content = (
      <>
        <Icon className={cn(
          "shrink-0 transition-all group-active:scale-125 duration-75", 
          isUltraClaro ? "h-7 w-7" : isStreetMode || isAssisted ? "h-6 w-6" : isAdvanced ? "h-5 w-5" : "h-4 w-4",
          isUltraClaro && variant === 'primary' && "drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]"
        )} />
        {effectiveShowLabel && (
          <span className={cn(
            "font-black tracking-widest uppercase italic leading-none transition-all",
            isUltraClaro ? "text-[12px] text-white brightness-125" : isAssisted ? "text-[11px] text-white" : isStreetMode ? "text-[10px]" : "text-[9px]"
          )}>
            {label}
          </span>
        )}
      </>
    );

    const baseStyles = cn(
      "group flex items-center justify-center rounded-[22px] transition-all duration-150 select-none touch-manipulation",
      "active:scale-95 active:brightness-150 active:shadow-[0_0_20px_rgba(255,255,255,0.1)]",
      isHorizontal ? "flex-row px-4 h-11 min-w-[90px] gap-2.5" : "flex-col gap-2",
      !isHorizontal && (
        isUltraClaro ? "h-24 w-full" : 
        isAssisted ? "h-20 w-full" : 
        isStreetMode ? "h-16 w-full" : 
        isAdvanced ? "h-12 w-full rounded-xl" :
        "h-14 px-4 min-w-[70px]"
      ),
      variant === 'primary' && "bg-white text-black hover:bg-white/90 shadow-xl shadow-white/5",
      variant === 'secondary' && "bg-white/5 border border-white/10 text-white hover:bg-white/10",
      variant === 'accent' && "bg-[color:var(--color-accent)] text-black hover:opacity-90 shadow-xl shadow-[color:var(--color-accent)]/10",
      variant === 'outline' && "border border-white/10 bg-transparent text-white/60 hover:text-white hover:border-white/20",
      (isAssisted || isUltraClaro) && variant === 'primary' && "ring-2 ring-white/20 ring-offset-2 ring-offset-black",
      isUltraClaro && variant === 'primary' && "bg-white scale-105 z-10 shadow-[0_0_30px_rgba(255,255,255,0.15)]",
      className
    );

    if (href) {
      return (
        <Link 
          href={href as Route} 
          className={baseStyles}
          onClick={onClick as any}
        >
          {content}
        </Link>
      );
    }

    return (
      <button
        ref={ref}
        className={baseStyles}
        onClick={onClick}
        {...props}
      >
        {content}
      </button>
    );
  }
);

QuickActionButton.displayName = "QuickActionButton";

interface QuickActionGroupProps {
  children: React.ReactNode;
  className?: string;
  onMisclick?: () => void;
}

export function QuickActionGroup({ children, className, onMisclick }: QuickActionGroupProps) {
  return (
    <div 
      className={cn("grid grid-cols-3 gap-2 p-1 rounded-[22px]", className)}
      onClick={(e) => {
        // Se o clique foi no container mas não em um botão, é um misclick
        if (e.target === e.currentTarget && onMisclick) {
          onMisclick();
        }
      }}
    >
      {children}
    </div>
  );
}

