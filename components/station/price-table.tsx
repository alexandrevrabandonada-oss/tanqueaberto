import { fuelLabels } from "@/lib/format/labels";
import { formatCurrencyBRL } from "@/lib/format/currency";
import { formatDateTimeBR } from "@/lib/format/time";
import type { PriceReport } from "@/lib/types";

interface PriceTableProps {
  reports: PriceReport[];
}

export function PriceTable({ reports }: PriceTableProps) {
  if (reports.length === 0) {
    return <div className="rounded-[22px] border border-white/8 bg-black/20 p-4 text-sm text-white/52">Sem preços recentes aprovados.</div>;
  }

  return (
    <div className="space-y-3">
      {reports.map((report) => (
        <div
          key={report.id}
          className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-[22px] border border-white/8 bg-black/30 px-4 py-3"
        >
          <div>
            <p className="text-sm font-medium text-white">{fuelLabels[report.fuelType]}</p>
            <p className="text-xs text-white/44">{formatDateTimeBR(report.reportedAt)}</p>
          </div>
          <span className="text-lg font-semibold text-white">{formatCurrencyBRL(report.price)}</span>
        </div>
      ))}
    </div>
  );
}
