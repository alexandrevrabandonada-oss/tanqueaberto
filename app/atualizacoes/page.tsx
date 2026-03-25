import { AppShell } from "@/components/layout/app-shell";
import { FeedBrowser } from "@/components/feed/feed-browser";
import { getRecentFeed } from "@/lib/data";
import type { ReportWithStation } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function UpdatesPage() {
  let feed: ReportWithStation[] = [];
  try {
    feed = await getRecentFeed();
  } catch (err) {
    console.error("Failed to fetch feed in UpdatesPage", err);
    // Return empty array to allow component to render with fallback/warm start
    feed = [];
  }

  return (
    <AppShell>
      <FeedBrowser feed={feed} />
    </AppShell>
  );
}
