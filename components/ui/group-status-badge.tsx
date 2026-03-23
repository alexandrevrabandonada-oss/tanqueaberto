import { Badge } from "@/components/ui/badge";
import { getStatusColor, getStatusLabel, type GroupReleaseStatus } from "@/lib/ops/release-types";
import { cn } from "@/lib/utils";

interface GroupStatusBadgeProps {
  status: GroupReleaseStatus;
  className?: string;
}

export function GroupStatusBadge({ status, className }: GroupStatusBadgeProps) {
  const colorClass = getStatusColor(status);
  const label = getStatusLabel(status);

  return (
    <Badge 
      variant="outline" 
      className={cn("border-white/10 bg-white/5 font-medium px-2 py-0.5", colorClass, className)}
    >
      {label}
    </Badge>
  );
}
