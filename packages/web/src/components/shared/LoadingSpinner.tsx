import { Loader2 } from "lucide-react";
import { cn } from "../../lib/utils";

export function LoadingSpinner({ label = "Loading…", className }: { label?: string; className?: string }) {
  return (
    <div role="status" className={cn("flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground", className)}>
      <Loader2 className="size-4 animate-spin" aria-hidden />
      <span>{label}</span>
    </div>
  );
}
