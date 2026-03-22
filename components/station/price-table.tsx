import { fuelLabels } from "@/lib/mock-data";
import { PriceReport } from "@/lib/types";
import { formatCurrency, formatDateTime } from "@/lib/utils";

interface PriceTableProps {
  reports: PriceReport[];
}

export function PriceTable({ reports }: PriceTableProps) {
  return (
    <div className="space-y-3">
      {reports.map((report) => (
        <div
          key={report.id}
          className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-[22px] border border-white/8 bg-black/30 px-4 py-3"
        >
          <div>
            <p className="text-sm font-medium text-white">{fuelLabels[report.fuelType]}</p>
            <p className="text-xs text-white/44">{formatDateTime(report.reportedAt)}</p>
          </div>
          <span className="text-lg font-semibold text-white">{formatCurrency(report.price)}</span>
        </div>
      ))}
    </div>
  );
}
