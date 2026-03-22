import { Camera, Clock3, CheckCircle2 } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { SectionCard } from "@/components/ui/section-card";
import { getRecentFeed } from "@/lib/data";
import { formatCurrencyBRL } from "@/lib/format/currency";
import { formatDateTimeBR, formatRecencyLabel } from "@/lib/format/time";

export const dynamic = "force-dynamic";

export default async function UpdatesPage() {
  const feed = await getRecentFeed();

  return (
    <AppShell>
      <SectionCard className="space-y-2">
        <p className="text-xs uppercase tracking-[0.2em] text-white/42">Feed</p>
        <h2 className="text-[1.8rem] font-semibold leading-none text-white">Atualizações recentes</h2>
        <p className="text-sm text-white/58">Linha do tempo simples com foco em preço, evidência e recência.</p>
      </SectionCard>

      <div className="space-y-3">
        {feed.length === 0 ? (
          <SectionCard className="text-sm text-white/58">Sem atualização recente no momento.</SectionCard>
        ) : (
          feed.map((report) => (
            <SectionCard key={report.id} className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold text-white">{report.station.name}</p>
                  <p className="text-sm text-white/50">
                    {report.station.neighborhood}, {report.station.city}
                  </p>
                </div>
                <Badge variant="warning">{formatRecencyLabel(report.reportedAt)}</Badge>
              </div>
              <div className="flex items-center justify-between rounded-[22px] border border-white/8 bg-black/30 px-4 py-3">
                <div>
                  <p className="text-sm text-white/54">Preço enviado</p>
                  <p className="mt-1 text-2xl font-semibold text-white">{formatCurrencyBRL(report.price)}</p>
                </div>
                <Camera className="h-5 w-5 text-[color:var(--color-accent)]" />
              </div>
              <div className="flex items-center justify-between text-sm text-white/54">
                <div className="flex items-center gap-2">
                  <Clock3 className="h-4 w-4 text-[color:var(--color-accent)]" />
                  {formatDateTimeBR(report.reportedAt)}
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-[color:var(--color-accent)]" />
                  {report.reporterNickname ?? "anônimo"}
                </div>
              </div>
            </SectionCard>
          ))
        )}
      </div>
    </AppShell>
  );
}
