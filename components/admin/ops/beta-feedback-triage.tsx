import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { updateBetaFeedbackTriageAction } from "@/app/admin/ops/actions";
import type { BetaFeedbackSummary } from "@/lib/beta/feedback";
import { formatDateTimeBR, formatRecencyLabel } from "@/lib/format/time";

interface BetaFeedbackTriageProps {
  feedback: BetaFeedbackSummary;
}

export function BetaFeedbackTriage({ feedback }: BetaFeedbackTriageProps) {
  return (
    <section className="space-y-4 rounded-[22px] border border-white/8 bg-black/30 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-white/42">Feedback beta</p>
          <h2 className="mt-1 text-xl font-semibold text-white">O que testers estão apontando</h2>
          <p className="mt-1 text-sm text-white/58">Tema repetido, prioridade, cidade e triagem rápida num só bloco.</p>
        </div>
        <Badge variant="warning">{feedback.total} retornos</Badge>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {feedback.byType.map((item) => (
          <div key={item.feedbackType} className="rounded-[18px] border border-white/8 bg-black/20 px-4 py-3 text-sm text-white/66">
            <p className="font-medium text-white">{item.feedbackType}</p>
            <p className="mt-1 text-xs text-white/44">{item.count} ocorrências</p>
          </div>
        ))}
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <div className="rounded-[22px] border border-white/8 bg-black/30 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-white/42">Por tema</p>
          <div className="mt-4 space-y-2">
            {feedback.byTopic.map((item) => (
              <div key={item.triageTopic} className="rounded-[18px] border border-white/8 bg-black/20 px-4 py-3 text-sm text-white/66">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-white">{item.triageTopic}</span>
                  <Badge variant="outline">{item.count}</Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-[22px] border border-white/8 bg-black/30 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-white/42">Por prioridade</p>
          <div className="mt-4 space-y-2">
            {feedback.byPriority.map((item) => (
              <div key={item.triagePriority} className="rounded-[18px] border border-white/8 bg-black/20 px-4 py-3 text-sm text-white/66">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-white">{item.triagePriority}</span>
                  <Badge variant="outline">{item.count}</Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-[22px] border border-white/8 bg-black/30 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-white/42">Por tela</p>
          <div className="mt-4 space-y-2">
            {feedback.byScreen.map((item) => (
              <div key={item.screenGroup} className="rounded-[18px] border border-white/8 bg-black/20 px-4 py-3 text-sm text-white/66">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-white">{item.screenGroup}</span>
                  <Badge variant="outline">{item.count}</Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-[22px] border border-white/8 bg-black/30 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-white/42">Por cidade</p>
          <div className="mt-4 space-y-2">
            {feedback.byCity.map((item) => (
              <div key={item.city} className="rounded-[18px] border border-white/8 bg-black/20 px-4 py-3 text-sm text-white/66">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-white">{item.city}</span>
                  <Badge variant="outline">{item.count}</Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-[22px] border border-white/8 bg-black/30 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-white/42">Por status</p>
          <div className="mt-4 space-y-2">
            {feedback.byStatus.map((item) => (
              <div key={item.triageStatus} className="rounded-[18px] border border-white/8 bg-black/20 px-4 py-3 text-sm text-white/66">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-white">{item.triageStatus}</span>
                  <Badge variant="outline">{item.count}</Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-[22px] border border-white/8 bg-black/30 p-4">
        <p className="text-xs uppercase tracking-[0.2em] text-white/42">Top páginas com feedback</p>
        <div className="mt-4 space-y-3">
          {feedback.byPage.slice(0, 5).map((item) => (
            <div key={item.pagePath} className="rounded-[18px] border border-white/8 bg-black/20 px-4 py-3 text-sm text-white/66">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-white">{item.pagePath}</span>
                <Badge variant="outline">{item.count}</Badge>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-xs uppercase tracking-[0.2em] text-white/42">Feedback recente e triagem</p>
        <div className="grid gap-3 lg:grid-cols-2">
          {feedback.recent.map((item) => (
            <div key={item.id} className="rounded-[22px] border border-white/8 bg-black/30 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={item.feedbackType === "problema" ? "danger" : item.feedbackType === "sugestao" ? "default" : "outline"}>{item.feedbackType}</Badge>
                    <Badge variant={item.triagePriority === "alta" ? "danger" : item.triagePriority === "media" ? "warning" : "outline"}>{item.triagePriority}</Badge>
                  </div>
                  <p className="text-sm font-medium text-white">{item.screenGroup} · {item.city ?? "global"}</p>
                </div>
                <span className="text-xs text-white/42">{formatRecencyLabel(item.createdAt)}</span>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-white/72">{item.message}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {item.triageTags.map((tag) => (
                  <Badge key={tag} variant="outline">{tag}</Badge>
                ))}
              </div>
              <p className="mt-3 text-xs text-white/42">{formatDateTimeBR(item.createdAt)} · {item.triageStatus} · {item.pagePath}</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                <form action={updateBetaFeedbackTriageAction}>
                  <input type="hidden" name="feedbackId" value={item.id} />
                  <input type="hidden" name="triageStatus" value="novo" />
                  <Button type="submit" variant="secondary" className="w-full text-xs">Novo</Button>
                </form>
                <form action={updateBetaFeedbackTriageAction}>
                  <input type="hidden" name="feedbackId" value={item.id} />
                  <input type="hidden" name="triageStatus" value="em_analise" />
                  <Button type="submit" variant="secondary" className="w-full text-xs">Em análise</Button>
                </form>
                <form action={updateBetaFeedbackTriageAction}>
                  <input type="hidden" name="feedbackId" value={item.id} />
                  <input type="hidden" name="triageStatus" value="resolvido" />
                  <Button type="submit" className="w-full text-xs">Resolvido</Button>
                </form>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
