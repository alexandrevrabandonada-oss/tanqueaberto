import Link from "next/link";
import { ChevronLeft, Info, Settings2, Globe, EyeOff, LayoutPanelTop } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { SectionCard } from "@/components/ui/section-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GroupStatusBadge } from "@/components/ui/group-status-badge";
import { getTerritorialReleaseSummary } from "@/lib/ops/release-control";
import { requireAdminUser } from "@/lib/auth/admin";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminRolloutPage() {
  await requireAdminUser();
  const summary = await getTerritorialReleaseSummary();

  const stats = {
    ready: summary.filter(s => s.status === "ready").length,
    validating: summary.filter(s => s.status === "validating").length,
    published: summary.filter(s => s.isPublished).length
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
          <div className="flex gap-2">
             <Badge variant="outline" className="border-green-500/20 text-green-400">{stats.ready} Prontos</Badge>
             <Badge variant="outline" className="border-yellow-500/20 text-yellow-400">{stats.validating} Validando</Badge>
          </div>
        </div>
      </SectionCard>

      <div className="grid gap-4 lg:grid-cols-2">
        {summary.map((group) => (
          <SectionCard key={group.slug} className="relative overflow-hidden">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold text-white">{group.name}</h3>
                  {group.isPublished ? (
                    <Globe className="h-3.5 w-3.5 text-green-400" />
                  ) : (
                    <EyeOff className="h-3.5 w-3.5 text-white/40" />
                  )}
                </div>
                <p className="text-xs text-white/40 mt-0.5">{group.slug}</p>
              </div>
              <GroupStatusBadge status={group.status} />
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
               <div className="rounded-2xl border border-white/5 bg-black/20 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-white/30">Readiness (Real)</p>
                  <p className="mt-1 text-sm font-medium text-white">{group.score}/100</p>
                  <p className={cn(
                    "mt-1 text-[11px] font-medium",
                    group.recommendation === "vale pedir coleta já" ? "text-green-400" :
                    group.recommendation === "pode esperar" ? "text-yellow-400" : "text-orange-400"
                  )}>
                    {group.recommendation}
                  </p>
               </div>
               <div className="rounded-2xl border border-white/5 bg-black/20 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-white/30">Release (Produto)</p>
                  <p className="mt-1 text-sm font-medium text-white">Status: {group.status}</p>
                  <p className="mt-1 text-[11px] text-white/40">
                    {group.isOverride ? "Override manual ativo" : "Seguindo readiness"}
                  </p>
               </div>
            </div>

            <div className="mt-6 flex items-center justify-between border-t border-white/5 pt-4">
               <div className="flex items-center gap-2 text-xs text-white/50">
                  <Settings2 className="h-3.5 w-3.5" />
                  Gerenciar visibilidade
               </div>
               <div className="flex gap-2">
                  <Button variant="secondary" className="h-8 px-4 text-xs">Ajustar Status</Button>
                  <Button variant={group.isPublished ? 'ghost' : 'primary'} className="h-8 px-4 text-xs">
                    {group.isPublished ? 'Despublicar' : 'Publicar'}
                  </Button>
               </div>
            </div>
          </SectionCard>
        ))}
      </div>

      <SectionCard className="border-dashed border-white/10 bg-transparent">
        <div className="flex items-center gap-3 text-white/40">
           <Info className="h-5 w-5" />
           <p className="text-xs leading-relaxed">
             O status **Pronto** prioriza o grupo na home do usuário. Grupos **Ocultos** ou **Limitados** são removidos da busca principal do beta de rua para garantir a integridade dos dados durante o teste presencial.
           </p>
        </div>
      </SectionCard>
    </div>
  );
}
