import { redirect } from "next/navigation";
import type { Route } from "next";

interface ShortInvitePageProps {
  params: Promise<{ token: string }>;
}

export default async function ShortInvitePage({ params }: ShortInvitePageProps) {
  const { token } = await params;
  const safeToken = token.trim();

  if (!safeToken) {
    redirect("/editor" as Route);
  }

  redirect(`/editor?token=${encodeURIComponent(safeToken)}` as Route);
}
