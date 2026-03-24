import Link from "next/link";
import { ChevronLeft, Info, Globe } from "lucide-react";

import { SectionCard } from "@/components/ui/section-card";
import { Badge } from "@/components/ui/badge";
import { getTerritorialReleaseSummary } from "@/lib/ops/release-control";
import { requireAdminUser } from "@/lib/auth/admin";
import { CityRolloutPanel } from "@/components/admin/city-rollout-panel";

export const dynamic = "force-dynamic";

export default async function AdminRolloutPage() {
  await requireAdminUser();
  const summary = await getTerritorialReleaseSummary();

  const stats = {
    consolidated: summary.filter(s => s.publicStage === "consolidated").length,
    publicBeta: summary.filter(s => s.publicStage === "public_beta").length,
    restricted: summary.filter(s => s.publicStage === "restricted_beta").length,
  };

  return (
    <div className="space-y-4 pb-10 pt-1">
      <SectionCard className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2">
            <Link 
              href="/admin" 
              className="flex items-center gap-1 text-xs uppercase tracking-widest text-white/42 hover:text-white/60 transition-colors"
            >
              <ChevronLeft className="h-3 w-3" />
              Voltar ao admin
            </Link>
            <h1 className="text-[2rem] font-semibold leading-none text-white">Rollout Territorial</h1>
            <p className="max-w-xl text-sm text-white/58">Controle de exposição do beta por cidade e grupo estratégico.</p>
          </div>
          <div className="flex flex-wrap gap-2 justify-end">
             <Badge variant="outline" className="border-green-500/20 text-green-400">{stats.consolidated} Oficiais</Badge>
             <Badge variant="outline" className="border-blue-500/20 text-blue-400">{stats.publicBeta} Beta Aberto</Badge>
             <Badge variant="outline" className="border-yellow-500/20 text-yellow-400">{stats.restricted} Restritos</Badge>
          </div>
        </div>
      </SectionCard>

      <CityRolloutPanel cities={summary} />

      <SectionCard className="border-dashed border-white/10 bg-transparent">
        <div className="flex items-center gap-3 text-white/40">
           <Info className="h-5 w-5" />
           <p className="text-xs leading-relaxed">
             A promoção de uma cidade altera a mensagem pública na landing page (`/cidade/[slug]`) e o comportamento do app. Use **Consolidar** apenas quando a cobertura for alta e os preços estiverem sendo atualizados diariamente pela comunidade.
           </p>
        </div>
      </SectionCard>
    </div>
  );
}
