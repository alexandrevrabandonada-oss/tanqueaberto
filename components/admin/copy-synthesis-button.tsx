"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { type BetaSynthesis } from "@/lib/ops/beta-synthesis";

interface CopySynthesisButtonProps {
  synthesis: BetaSynthesis;
}

export function CopySynthesisButton({ synthesis }: CopySynthesisButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const text = `
SÍNTESE DE APRENDIZADO - BETA DE RUA (${new Date(synthesis.timestamp).toLocaleDateString()})

TAGS: ${synthesis.learningTags.join(", ")}

RESUMO DE CAMPO:
- Funcionando: ${synthesis.fieldInsights.workingStatus}
- Travando: ${synthesis.fieldInsights.blockingIssues}

MÉTRICAS:
- Velocidade Média: ${synthesis.dailySummary.avgSubmissionSpeedSeconds}s
- Recortes Ativos: ${synthesis.dailySummary.activeGroups.join(", ") || "Nenhum"}
- Gargalos Geográficos: ${synthesis.dailySummary.failedGroups.join(", ") || "Nenhum"}

PRÓXIMOS PASSOS:
${synthesis.recommendations.map((r, i) => `${i + 1}. ${r}`).join("\n")}

VOZ DO TESTER:
${synthesis.qualitativeFeedback ? `
- Tags: ${synthesis.qualitativeFeedback.commonTags.map(t => `${t.tag}(${t.count})`).join(", ")}
- Motivos: ${synthesis.qualitativeFeedback.topMotives.map(m => m.motive).join(", ")}
- Destaques:
${synthesis.qualitativeFeedback.topMessages.map(m => `  > "${m}"`).join("\n")}
` : "Nenhum feedback qualitativo recente."}
    `.trim();

    void navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button 
      variant={copied ? "primary" : "secondary"} 
      className="gap-2 transition-all"
      onClick={handleCopy}
    >
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      {copied ? "Copiado!" : "Copiar Síntese"}
    </Button>
  );
}
