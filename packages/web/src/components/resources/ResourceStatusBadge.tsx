import { Badge } from "../ui/badge";
import { cn } from "../../lib/utils";

export function ResourceStatusBadge({ isActive, className }: { isActive: boolean; className?: string }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1.5",
        isActive
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-zinc-200 bg-zinc-100 text-zinc-600",
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", isActive ? "bg-emerald-500" : "bg-zinc-400")} aria-hidden />
      {isActive ? "Active" : "Inactive"}
    </Badge>
  );
}
