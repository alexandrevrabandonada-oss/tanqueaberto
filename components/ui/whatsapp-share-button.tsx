"use client";

import { MessageCircle } from "lucide-react";

import { Button } from "@/components/ui/button";

interface WhatsAppShareButtonProps {
  url: string;
  message?: string;
  label?: string;
  className?: string;
}

export function WhatsAppShareButton({ url, message, label = "WhatsApp", className }: WhatsAppShareButtonProps) {
  function handleClick() {
    const text = encodeURIComponent(message ? `${message}\n${url}` : url);
    window.open(`https://wa.me/?text=${text}`, "_blank", "noopener,noreferrer");
  }

  return (
    <Button type="button" variant="secondary" className={className} onClick={handleClick}>
      <MessageCircle className="h-4 w-4" />
      {label}
    </Button>
  );
}
