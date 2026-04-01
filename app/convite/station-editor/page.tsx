import { redirect } from "next/navigation";
import type { Route } from "next";

export const dynamic = "force-dynamic";

interface StationEditorInvitePageProps {
  searchParams?: Promise<{
    token?: string;
    code?: string;
  }>;
}

export default async function StationEditorInvitePage({ searchParams }: StationEditorInvitePageProps) {
  const resolved = (await searchParams) ?? {};
  const inviteToken = typeof resolved.token === "string" ? resolved.token.trim() : "";
  const inviteCode = typeof resolved.code === "string" ? resolved.code.trim().toUpperCase() : "";

  const next = new URLSearchParams();
  if (inviteToken) next.set("token", inviteToken);
  if (inviteCode) next.set("code", inviteCode);
  const suffix = next.toString();
  redirect((suffix ? `/editor?${suffix}` : "/editor") as Route);
}
