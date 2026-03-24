import Link from "next/link";
import { ChevronLeft, ShieldCheck } from "lucide-react";

import { SectionCard } from "@/components/ui/section-card";
import { getCollectorTrustList } from "@/lib/data/queries";
import { requireAdminUser } from "@/lib/auth/admin";
import { CollectorTrustDashboard } from "@/components/admin/collector-trust-dashboard";

export const dynamic = "force-dynamic";

export default async function AdminCollectorsPage() {
  await requireAdminUser();
  const collectors = await getCollectorTrustList();

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
            <h1 className="text-[2rem] font-semibold leading-none text-white">Reputação de Coletores</h1>
            <p className="max-w-xl text-sm text-white/58">Monitoramento de confiança operacional e score de testers.</p>
          </div>
          <ShieldCheck className="h-10 w-10 text-[color:var(--color-accent)] opacity-20" />
        </div>
      </SectionCard>

      <CollectorTrustDashboard collectors={collectors as any} />

      <SectionCard className="border-dashed border-white/10 bg-transparent">
        <div className="flex items-center gap-3 text-white/40">
           <p className="text-xs leading-relaxed">
             O **Score de Confiança** é calculado dinamicamente com base nas aprovações e rejeições da moderação. Coletores com score acima de 80 são promovidos automaticamente para o estágio **Confiável**, ganhando prioridade máxima na fila de aprovação.
           </p>
        </div>
      </SectionCard>
    </div>
  );
}
