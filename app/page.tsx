import { AppShell } from "@/components/layout/app-shell";
import { HomeBrowser } from "@/components/home/home-browser";
import { getHomeStations, getRecentApprovedCount, getRecentFeed } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [stations, feed, recentCount] = await Promise.all([getHomeStations(), getRecentFeed(), getRecentApprovedCount()]);

  return (
    <AppShell>
      <HomeBrowser stations={stations} feed={feed} recentCount={recentCount} />
    </AppShell>
  );
}
