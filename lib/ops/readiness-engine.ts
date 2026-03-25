import { createSupabaseServiceClient } from "@/lib/supabase/admin";

export type ReadinessStatus = 'GO' | 'CAUTION' | 'NO_GO';

export interface ReadinessMetrics {
  successRate: number;      // % approved reports
  frictionRate: number;     // % operational errors vs events
  dataQualityScore: number; // avg collector source
  bugDensity: number;       // bugs per 100 sessions
  territorialCoverage: number; // % high priority gaps closed
}

export interface ReadinessResult {
  score: number;
  status: ReadinessStatus;
  metrics: ReadinessMetrics;
  risks: string[];
  recommendation: string;
}

/**
 * Motor de prontidão para expansão do Beta
 */
export async function calculateBetaReadiness(): Promise<ReadinessResult> {
  const supabase = createSupabaseServiceClient();
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // 1. Fetch Success Rate (Last 7 days)
  const { data: reports } = await supabase
    .from('price_reports')
    .select('status')
    .gte('created_at', weekAgo.toISOString());
  
  const totalReports = reports?.length || 0;
  const approved = reports?.filter(r => r.status === 'approved').length || 0;
  const successRate = totalReports > 0 ? (approved / totalReports) * 100 : 0;

  // 2. Fetch Friction (Operational Errors)
  const { data: events } = await supabase
    .from('operational_events')
    .select('severity')
    .gte('created_at', weekAgo.toISOString());
  
  const totalEvents = events?.length || 0;
  const errors = events?.filter(e => e.severity === 'error' || e.severity === 'warning').length || 0;
  const frictionRate = totalEvents > 0 ? (errors / totalEvents) * 100 : 0;

  // 3. Data Quality (Avg Collector Score)
  const { data: collectors } = await supabase
    .from('collector_trust')
    .select('score');
  
  const avgQuality = collectors && collectors.length > 0 
    ? collectors.reduce((acc, c) => acc + c.score, 0) / collectors.length 
    : 0;

  // 4. Bug Density (Feedback)
  const { data: feedback } = await supabase
    .from('beta_feedback_submissions')
    .select('feedback_type')
    .gte('created_at', weekAgo.toISOString());
  
  const bugs = feedback?.filter(f => f.feedback_type === 'bug' || f.feedback_type === 'friction').length || 0;
  const bugDensity = totalReports > 0 ? (bugs / totalReports) * 100 : 0;

  // Readiness Logic
  let score = (successRate * 0.4) + (avgQuality * 0.3) + (Math.max(0, 100 - frictionRate * 10) * 0.2) + (Math.max(0, 100 - bugDensity * 20) * 0.1);
  score = Math.round(score);

  let status: ReadinessStatus = 'NO_GO';
  let recommendation = "Segurar expansão. Estabilização necessária.";
  const risks: string[] = [];

  if (score >= 80 && frictionRate < 5) {
    status = 'GO';
    recommendation = "Pronto para ampliar. Métricas saudáveis e estáveis.";
  } else if (score >= 60) {
    status = 'CAUTION';
    recommendation = "Ampliar com cautela. Monitorar atrito em novos grupos.";
  }

  // Riscos específicos
  if (successRate < 75) risks.push("Baixa taxa de aprovação de dados (Qualidade)");
  if (frictionRate > 10) risks.push("Instabilidade operacional detectada nos logs");
  if (bugDensity > 15) risks.push("Volume alto de feedback negativo/bugs");

  return {
    score,
    status,
    metrics: {
      successRate: Math.round(successRate),
      frictionRate: Math.round(frictionRate),
      dataQualityScore: Math.round(avgQuality),
      bugDensity: Math.round(bugDensity * 10) / 10,
      territorialCoverage: 65 // Placeholder até termos lógica de gaps
    },
    risks,
    recommendation
  };
}
