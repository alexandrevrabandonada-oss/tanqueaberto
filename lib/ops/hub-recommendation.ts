import { createSupabaseServiceClient } from "@/lib/supabase/admin";
import { PriceReport, Station } from "@/lib/types";

export interface HubRecommendation {
  id: string;
  type: 'mission' | 'pending_fix' | 'nearby_empty' | 'return_visit' | 'territory_gap';
  title: string;
  description: string;
  actionLabel: string;
  actionUrl: string;
  priority: number; // 1-10 (high is better)
  metadata?: Record<string, any>;
}

/**
 * Motor de recomendações para o Hub do Coletor
 */
export async function getHubRecommendations(
  nickname: string, 
  lat?: number, 
  lng?: number
): Promise<HubRecommendation[]> {
  const supabase = createSupabaseServiceClient();
  const recommendations: HubRecommendation[] = [];

  // 1. CHECAR MISSÃO ATIVA
  const { data: activeMission } = await supabase
    .from("operational_events")
    .select("payload, created_at")
    .eq("event_type", "mission_started")
    .eq("actor_id", nickname)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (activeMission) {
    // Verificar se já foi concluída
    const { data: completedMission } = await supabase
      .from("operational_events")
      .select("id")
      .eq("event_type", "mission_completed")
      .eq("actor_id", nickname)
      .gt("created_at", activeMission.created_at)
      .maybeSingle();

    if (!completedMission) {
      recommendations.push({
        id: 'active-mission',
        type: 'mission',
        title: 'Missão em Andamento',
        description: 'Você tem uma missão aberta. Vamos finalizar?',
        actionLabel: 'Continuar Missão',
        actionUrl: '/interno/missoes',
        priority: 10
      });
    }
  }

  // 2. CHECAR PENDÊNCIAS (Local Queue ou Erros de Envio seriam ideais, mas aqui focamos em retorno de aprovados/rejeitados)
  const { data: recentReports } = await supabase
    .from("price_reports")
    .select("id, status, rejection_reason, station_id, stations(name)")
    .eq("reporter_nickname", nickname)
    .order("created_at", { ascending: false })
    .limit(5);

  const rejected = recentReports?.find(r => r.status === 'rejected');
  if (rejected) {
    recommendations.push({
      id: `fix-${rejected.id}`,
      type: 'pending_fix',
      title: 'Ajuste Necessário',
      description: `Seu envio no posto ${(rejected.stations as any).name} foi recusado: ${rejected.rejection_reason || 'Foto ruim'}. Tentar novamente?`,
      actionLabel: 'Corrigir Agora',
      actionUrl: `/interno/posts/${rejected.station_id}`,
      priority: 9
    });
  }

  // 3. PROXIMIDADE (Geofencing leve)
  if (lat && lng) {
    // Buscar postos sem preço num raio de 2km
    // Para simplificar sem PostGIS pesado no RPC aqui, usamos uma query básica de box
    const radius = 0.02; // Aproximadamente 2km
    const { data: nearbyEmpty } = await supabase
      .from("stations")
      .select("id, name, neighborhood, lat, lng")
      .eq("is_active", true)
      .is("last_reported_at", null)
      .gt("lat", lat - radius)
      .lt("lat", lat + radius)
      .gt("lng", lng - radius)
      .lt("lng", lng + radius)
      .limit(1)
      .maybeSingle();

    if (nearbyEmpty) {
      recommendations.push({
        id: 'nearby-empty',
        type: 'nearby_empty',
        title: 'Posto Sem Foto Próximo',
        description: `${nearbyEmpty.name} está perto de você e ainda não tem fotos.`,
        actionLabel: 'Iluminar Posto',
        actionUrl: `/interno/posts/${nearbyEmpty.id}`,
        priority: 8,
        metadata: { distance: 'Próximo' }
      });
    }
  }

  // 4. TERRITÓRIO (Impacto)
  // Se o coletor tem um bairro forte, sugerir fechar as lacunas lá
  const { data: topNeighborhood } = await supabase
    .from("price_reports")
    .select("stations(neighborhood, city)")
    .eq("reporter_nickname", nickname)
    .eq("status", "approved")
    .limit(10); // Amostra

  if (topNeighborhood && topNeighborhood.length > 0) {
    const neighborhood = (topNeighborhood[0].stations as any).neighborhood;
    const city = (topNeighborhood[0].stations as any).city;

    if (neighborhood) {
      recommendations.push({
        id: 'territory-mastery',
        type: 'territory_gap',
        title: `Mestre de ${neighborhood}`,
        description: `Faltam poucos postos para completar sua cobertura em ${neighborhood}.`,
        actionLabel: 'Ver Lacunas',
        actionUrl: `/historico?city=${city}&neighborhood=${neighborhood}`,
        priority: 6
      });
    }
  }

  return recommendations.sort((a, b) => b.priority - a.priority);
}
