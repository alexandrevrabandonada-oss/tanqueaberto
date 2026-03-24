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
}

export const QuickActionButton = React.forwardRef<HTMLButtonElement, QuickActionButtonProps>(
  ({ icon: Icon, label, variant = 'secondary', isStreetMode, href, showLabel = true, className, onClick, ...props }, ref) => {
    const content = (
      <>
        <Icon className={cn("shrink-0", isStreetMode ? "h-5 w-5" : "h-4 w-4")} />
        {showLabel && (
          <span className={cn(
            "font-black tracking-tighter uppercase italic leading-none",
            isStreetMode ? "text-xs" : "text-[10px]"
          )}>
            {label}
          </span>
        )}
      </>
    );

    const baseStyles = cn(
      "flex flex-col items-center justify-center gap-1.5 rounded-2xl transition-all active:scale-[0.96]",
      isStreetMode ? "h-16 w-full" : "h-12 px-4",
      variant === 'primary' && "bg-white text-black hover:bg-white/90",
      variant === 'secondary' && "bg-white/5 border border-white/10 text-white hover:bg-white/10",
      variant === 'accent' && "bg-[color:var(--color-accent)] text-black hover:opacity-90",
      variant === 'outline' && "border border-white/10 bg-transparent text-white/60 hover:text-white hover:border-white/20",
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
