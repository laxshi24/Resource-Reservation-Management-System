import type { LucideIcon } from "lucide-react";
import Link from "next/link";

interface StatTileProps {
  label: string;
  value: number;
  icon: LucideIcon;
  hint?: string;
  href?: string;
}

const numberFormat = new Intl.NumberFormat("en-GB", { notation: "compact", maximumFractionDigits: 1 });

/** One KPI: sentence-case label, semibold value (proportional figures), optional hint. */
export function StatTile({ label, value, icon: Icon, hint, href }: StatTileProps) {
  const content = (
    <>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">{label}</p>
        <Icon className="size-4 text-muted-foreground" aria-hidden />
      </div>
      <p className="mt-2 text-3xl font-semibold tracking-tight">{numberFormat.format(value)}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </>
  );
  const className = "block rounded-lg border bg-background p-4";
  return href ? (
    <Link href={href} className={`${className} transition-colors hover:border-foreground/20 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none`}>
      {content}
    </Link>
  ) : (
    <div className={className}>{content}</div>
  );
}
