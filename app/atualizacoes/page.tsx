import { AppShell } from "@/components/layout/app-shell";
import { FeedBrowser } from "@/components/feed/feed-browser";
import { getRecentFeed } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function UpdatesPage() {
  const feed = await getRecentFeed();

  return (
    <AppShell>
      <FeedBrowser feed={feed} />
    </AppShell>
  );
}
