import type { ReservationStatus } from "@rrms/shared";
import { Badge } from "../ui/badge";
import { cn } from "../../lib/utils";

const STYLES: Record<ReservationStatus, { label: string; className: string; dot: string }> = {
  CONFIRMED: { label: "Confirmed", className: "border-emerald-200 bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" },
  CANCELLED: { label: "Cancelled", className: "border-rose-200 bg-rose-50 text-rose-700", dot: "bg-rose-500" },
};

export function ReservationStatusBadge({ status, className }: { status: ReservationStatus; className?: string }) {
  const style = STYLES[status];
  return (
    <Badge variant="outline" className={cn("gap-1.5", style.className, className)}>
      <span className={cn("size-1.5 rounded-full", style.dot)} aria-hidden />
      {style.label}
    </Badge>
  );
}
