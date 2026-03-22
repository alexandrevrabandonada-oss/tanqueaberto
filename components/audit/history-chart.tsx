import { cn } from "@/lib/utils";
import type { AuditSeriesPoint } from "@/lib/audit/types";
import { formatBrazilDayLabel } from "@/lib/audit/metrics";

interface HistoryChartProps {
  series: AuditSeriesPoint[];
  className?: string;
}

export function HistoryChart({ series, className }: HistoryChartProps) {
  if (series.length === 0) {
    return <div className={cn("rounded-[24px] border border-white/8 bg-black/20 p-4 text-sm text-white/52", className)}>Sem série suficiente para desenhar o histórico.</div>;
  }

  const values = series.flatMap((point) => [point.minPrice, point.maxPrice, point.medianPrice].filter((value): value is number => typeof value === "number"));
  const min = Math.min(...values);
  const max = Math.max(...values);
  const width = 1000;
  const height = 320;
  const paddingX = 48;
  const paddingY = 36;
  const innerWidth = width - paddingX * 2;
  const innerHeight = height - paddingY * 2;
  const safeRange = max - min || 1;
  const xFor = (index: number) => paddingX + (series.length === 1 ? innerWidth / 2 : (index / (series.length - 1)) * innerWidth);
  const yFor = (price: number) => height - paddingY - ((price - min) / safeRange) * innerHeight;

  const medianPoints = series
    .map((point, index) => (typeof point.medianPrice === "number" ? `${xFor(index)},${yFor(point.medianPrice)}` : null))
    .filter((value): value is string => Boolean(value))
    .join(" ");

  return (
    <div className={cn("rounded-[28px] border border-white/8 bg-black/25 p-4", className)}>
      <div className="mb-3 flex items-center justify-between gap-3 text-xs uppercase tracking-[0.18em] text-white/42">
        <span>Série diária</span>
        <span>{series.length} pontos</span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-[280px] w-full overflow-visible">
        <defs>
          <linearGradient id="auditRange" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="rgba(255,199,0,0.38)" />
            <stop offset="100%" stopColor="rgba(255,199,0,0.06)" />
          </linearGradient>
        </defs>
        <line x1={paddingX} y1={height - paddingY} x2={width - paddingX} y2={height - paddingY} stroke="rgba(255,255,255,0.14)" />
        <line x1={paddingX} y1={paddingY} x2={paddingX} y2={height - paddingY} stroke="rgba(255,255,255,0.12)" />

        {series.map((point, index) => {
          if (typeof point.minPrice !== "number" || typeof point.maxPrice !== "number") {
            return null;
          }

          const x = xFor(index);
          const yMin = yFor(point.minPrice);
          const yMax = yFor(point.maxPrice);
          const barWidth = Math.max(6, innerWidth / Math.max(series.length, 10) * 0.55);
          return <rect key={`range-${point.day}`} x={x - barWidth / 2} y={yMax} width={barWidth} height={Math.max(2, yMin - yMax)} rx={barWidth / 2} fill="url(#auditRange)" />;
        })}

        {medianPoints ? <polyline points={medianPoints} fill="none" stroke="rgba(255,199,0,0.95)" strokeWidth="4" strokeLinejoin="round" strokeLinecap="round" /> : null}

        {series.map((point, index) => {
          if (typeof point.medianPrice !== "number") {
            return null;
          }

          const x = xFor(index);
          const y = yFor(point.medianPrice);
          const showLabel = index === 0 || index === series.length - 1 || index % Math.max(1, Math.floor(series.length / 4)) === 0;
          return (
            <g key={`median-${point.day}`}>
              <circle cx={x} cy={y} r={6} fill="#0b0b0b" stroke="rgba(255,199,0,0.95)" strokeWidth="4" />
              {showLabel ? (
                <text x={x} y={height - 14} textAnchor="middle" fontSize="24" fill="rgba(255,255,255,0.5)">
                  {formatBrazilDayLabel(point.day)}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
