import type { Route } from "next";
import Link from "next/link";

import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

interface ButtonLinkProps {
  href: Route;
  children: React.ReactNode;
  variant?: ButtonVariant;
  className?: string;
}

const base =
  "inline-flex items-center justify-center gap-2 rounded-full px-4 py-3 text-sm font-semibold transition active:scale-[0.99]";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-[color:var(--color-accent)] text-black shadow-[0_10px_30px_rgba(255,212,0,0.18)]",
  secondary: "border border-white/10 bg-white/5 text-white hover:border-[color:var(--color-accent)]",
  ghost: "text-white/72 hover:bg-white/5 hover:text-white"
};

export function Button({ className, variant = "primary", ...props }: ButtonProps) {
  return <button className={cn(base, variants[variant], className)} {...props} />;
}

export function ButtonLink({ href, children, variant = "primary", className }: ButtonLinkProps) {
  return (
    <Link href={href} className={cn(base, variants[variant], className)}>
      {children}
    </Link>
  );
}
