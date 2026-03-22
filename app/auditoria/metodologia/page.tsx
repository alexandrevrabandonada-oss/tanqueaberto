import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { SectionCard } from "@/components/ui/section-card";
import { auditMethodologyPoints } from "@/lib/audit/methodology";

export default function AuditMethodologyPage() {
  return (
    <AppShell>
      <SectionCard className="space-y-4">
        <div className="space-y-2">
          <Badge>Metodologia pública</Badge>
          <h1 className="text-[2rem] font-semibold leading-none text-white">Como ler a auditoria</h1>
          <p className="max-w-2xl text-sm text-white/62">Essa página explica a regra do jogo: de onde vêm os dados, o que entra na série e o que nunca deve ser tratado como conclusão automática.</p>
        </div>
      </SectionCard>

      <SectionCard className="space-y-3">
        {auditMethodologyPoints.map((point) => (
          <div key={point.title} className="rounded-[22px] border border-white/8 bg-black/30 p-4">
            <p className="text-base font-semibold text-white">{point.title}</p>
            <p className="mt-2 text-sm text-white/62">{point.text}</p>
          </div>
        ))}
      </SectionCard>

      <SectionCard className="space-y-3 text-sm text-white/62">
        <p>As exportações em CSV e PDF seguem a mesma base pública usada no painel. O objetivo é facilitar relatório técnico, jornalismo local e revisão cidadã.</p>
        <p>Se um posto estiver com localização em revisão, isso aparece claramente na interface. Se o histórico for curto, a página avisa isso também.</p>
      </SectionCard>
    </AppShell>
  );
}
