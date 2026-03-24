import { createSupabaseServiceClient } from "@/lib/supabase/admin";

export interface CycleLatencyMetrics {
  avgModerationMinutes: number;
  medianModerationMinutes: number;
  avgVisibilityMinutes: number;
  bottlenecks: {
    city: string;
    avgMinutes: number;
    pendingCount: number;
  }[];
  totalProcessed24h: number;
}

export async function calculateCycleLatencyMetrics(): Promise<CycleLatencyMetrics> {
  const supabase = createSupabaseServiceClient();
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  // 1. Fetch recent approved/rejected reports
  const { data: reports, error } = await supabase
    .from('price_reports')
    .select('submitted_at, approved_at, rejected_at, city')
    .or(`approved_at.gt.${yesterday},rejected_at.gt.${yesterday}`);

  if (error || !reports) {
    return {
      avgModerationMinutes: 0,
      medianModerationMinutes: 0,
      avgVisibilityMinutes: 0,
      bottlenecks: [],
      totalProcessed24h: 0
    };
  }

  const latencies: number[] = [];
  const cityLatencies: Record<string, { total: number; count: number }> = {};

  reports.forEach(r => {
    const start = new Date(r.submitted_at).getTime();
    const end = new Date(r.approved_at || r.rejected_at).getTime();
    const diffMin = (end - start) / (1000 * 60);

    if (diffMin > 0) {
      latencies.push(diffMin);
      
      if (r.city) {
        if (!cityLatencies[r.city]) cityLatencies[r.city] = { total: 0, count: 0 };
        cityLatencies[r.city].total += diffMin;
        cityLatencies[r.city].count += 1;
      }
    }
  });

  const avg = latencies.length > 0 ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0;
  
  // Sort for median
  latencies.sort((a, b) => a - b);
  const median = latencies.length > 0 ? latencies[Math.floor(latencies.length / 2)] : 0;

  // 2. Fetch current pending counts for bottlenecks
  const { data: pendingData } = await supabase
    .from('price_reports')
    .select('city')
    .eq('status', 'pending');

  const pendingByCity: Record<string, number> = {};
  pendingData?.forEach(p => {
    if (p.city) pendingByCity[p.city] = (pendingByCity[p.city] || 0) + 1;
  });

  const bottlenecks = Object.entries(cityLatencies)
    .map(([city, data]) => ({
      city,
      avgMinutes: Math.round(data.total / data.count),
      pendingCount: pendingByCity[city] || 0
    }))
    .sort((a, b) => b.avgMinutes - a.avgMinutes)
    .slice(0, 5);

  return {
    avgModerationMinutes: Math.round(avg),
    medianModerationMinutes: Math.round(median),
    avgVisibilityMinutes: Math.round(avg + 2), // Mocking cache propagation delay as 2 mins
    bottlenecks,
    totalProcessed24h: reports.length
  };
}
