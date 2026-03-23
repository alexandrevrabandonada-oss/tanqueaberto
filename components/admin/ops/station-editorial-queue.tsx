import { Badge } from "@/components/ui/badge";
import { SectionCard } from "@/components/ui/section-card";
import type { StationEditorialReviewItem } from "@/lib/quality/stations";

interface StationEditorialQueueProps {
  items: StationEditorialReviewItem[];
}

export function StationEditorialQueue({ items }: StationEditorialQueueProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <SectionCard className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-white/42">Limpeza editorial</p>
          <h2 className="mt-1 text-xl font-semibold text-white">Nomes genéricos e repetição visual</h2>
          <p className="mt-1 text-sm text-white/58">Fila interna para ajustar nomes públicos ruins e reduzir duplicata óbvia sem tocar na trilha oficial.</p>
        </div>
        <Badge variant="warning">{items.length} casos</Badge>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {items.slice(0, 6).map((item) => (
          <div key={item.station.id} className="rounded-[22px] border border-white/8 bg-black/30 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-base font-semibold text-white">{item.displayName}</p>
                <p className="text-sm text-white/54">{item.station.neighborhood}, {item.station.city}</p>
              </div>
              <Badge variant={item.duplicateGroupSize > 1 ? "warning" : "outline"}>{item.duplicateGroupSize > 1 ? `${item.duplicateGroupSize} repetidos` : "revisar"}</Badge>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {item.reasons.map((reason) => (
                <Badge key={reason} variant="outline">{reason}</Badge>
              ))}
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
