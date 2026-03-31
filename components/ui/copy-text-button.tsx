"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

interface CopyTextButtonProps {
  value: string;
  label?: string;
  className?: string;
}

export function CopyTextButton({ value, label = "Copiar", className }: CopyTextButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Button type="button" variant="secondary" className={className} onClick={handleCopy}>
      {copied ? "Copiado" : label}
    </Button>
  );
}
