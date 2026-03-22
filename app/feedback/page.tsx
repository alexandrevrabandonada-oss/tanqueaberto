import { AppShell } from "@/components/layout/app-shell";
import { BetaFeedbackForm } from "@/components/feedback/beta-feedback-form";
import { SectionCard } from "@/components/ui/section-card";

export const dynamic = "force-dynamic";

interface FeedbackPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

function getParam(params: Record<string, string | string[] | undefined>, key: string) {
  const value = params[key];
  return typeof value === "string" ? value : null;
}

export default async function FeedbackPage({ searchParams }: FeedbackPageProps) {
  const params = (await searchParams) ?? {};
  const pagePath = getParam(params, "from") ?? "/";
  const pageTitle = getParam(params, "title");
  const stationId = getParam(params, "stationId");
  const city = getParam(params, "city");
  const fuelType = getParam(params, "fuelType");

  return (
    <AppShell>
      <div className="space-y-4 pb-10 pt-1">
        <SectionCard className="space-y-3">
          <p className="text-xs uppercase tracking-[0.2em] text-white/42">Beta fechado</p>
          <h1 className="text-[2rem] font-semibold leading-none text-white">Enviar feedback</h1>
          <p className="max-w-2xl text-sm text-white/58">
            Conte o que travou, o que faltou ou o que ficou confuso. Cada retorno ajuda a fechar as lacunas do beta.
          </p>
          {pageTitle ? <p className="text-xs text-white/44">Vindo de: {pageTitle}</p> : null}
        </SectionCard>

        <SectionCard>
          <BetaFeedbackForm pagePath={pagePath} pageTitle={pageTitle} stationId={stationId} city={city} fuelType={fuelType} />
        </SectionCard>
      </div>
    </AppShell>
  );
}
