import { Camera, CheckCircle2, Clock3 } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { SectionCard } from "@/components/ui/section-card";
import { recentUpdates, stations } from "@/lib/mock-data";
import { formatCurrency, formatDateTime } from "@/lib/utils";

export default function UpdatesPage() {
  return (
    <AppShell>
      <SectionCard className="space-y-2">
        <p className="text-xs uppercase tracking-[0.2em] text-white/42">Feed</p>
        <h2 className="text-[1.8rem] font-semibold leading-none text-white">Atualizacoes recentes</h2>
        <p className="text-sm text-white/58">Timeline simples com foco em preco, evidencia e recencia.</p>
      </SectionCard>

      <div className="space-y-3">
        {recentUpdates.map((report) => {
          const station = stations.find((item) => item.id === report.stationId);

          return (
            <SectionCard key={report.id} className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold text-white">{station?.name}</p>
                  <p className="text-sm text-white/50">
                    {station?.neighborhood}, {station?.city}
                  </p>
                </div>
                <Badge variant={report.status === "approved" ? "warning" : "outline"}>{report.status}</Badge>
              </div>
              <div className="flex items-center justify-between rounded-[22px] border border-white/8 bg-black/30 px-4 py-3">
                <div>
                  <p className="text-sm text-white/54">Preco enviado</p>
                  <p className="mt-1 text-2xl font-semibold text-white">{formatCurrency(report.price)}</p>
                </div>
                <Camera className="h-5 w-5 text-[color:var(--color-accent)]" />
              </div>
              <div className="flex items-center justify-between text-sm text-white/54">
                <div className="flex items-center gap-2">
                  <Clock3 className="h-4 w-4 text-[color:var(--color-accent)]" />
                  {formatDateTime(report.reportedAt)}
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-[color:var(--color-accent)]" />
                  {report.reporterNickname ?? "anonimo"}
                </div>
              </div>
            </SectionCard>
          );
        })}
      </div>
    </AppShell>
  );
}
