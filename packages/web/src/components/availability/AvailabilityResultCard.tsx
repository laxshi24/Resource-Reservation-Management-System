import type { AvailabilityItemDto, AvailabilityState } from "@rrms/shared";
import { CalendarPlus } from "lucide-react";
import Link from "next/link";
import { ResourceCard } from "../resources/ResourceCard";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { formatTimeRange } from "../../lib/format-date";
import { cn } from "../../lib/utils";

const STATE_STYLES: Record<AvailabilityState, { label: string; className: string }> = {
  AVAILABLE: { label: "Available", className: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  OCCUPIED: { label: "Occupied", className: "border-amber-200 bg-amber-50 text-amber-800" },
  INACTIVE: { label: "Unavailable (inactive)", className: "border-zinc-200 bg-zinc-100 text-zinc-600" },
};

export function AvailabilityStateBadge({ state }: { state: AvailabilityState }) {
  const style = STATE_STYLES[state];
  return (
    <Badge variant="outline" className={style.className}>
      {style.label}
    </Badge>
  );
}

interface Props {
  item: AvailabilityItemDto;
  /** datetime-local values of the searched window, used to pre-fill the booking form. */
  window: { start: string; end: string };
  /** Admins can open any booking; users only their own. */
  canOpenAllBookings?: boolean;
}

export function AvailabilityResultCard({ item, window, canOpenAllBookings = false }: Props) {
  const bookHref = `/reservations/new?${new URLSearchParams({ resourceId: item.resource.id, start: window.start, end: window.end })}`;

  return (
    <div className={cn("h-full", item.state === "INACTIVE" && "opacity-70")} data-state={item.state}>
      <ResourceCard
        resource={item.resource}
        showStatus={false}
        footer={
          <div className="space-y-3 border-t pt-3">
            <div className="flex items-center justify-between gap-2">
              <AvailabilityStateBadge state={item.state} />
              {item.state === "AVAILABLE" && (
                <Button size="sm" asChild>
                  <Link href={bookHref} aria-label={`Book ${item.resource.name} for this time`}>
                    <CalendarPlus aria-hidden /> Book
                  </Link>
                </Button>
              )}
            </div>
            {item.conflicts.length > 0 && (
              <ul className="space-y-1 text-xs text-muted-foreground" aria-label="Conflicting reservations">
                {item.conflicts.map((conflict) => (
                  <li key={conflict.id}>
                    {canOpenAllBookings || conflict.isMine ? (
                      <Link href={`/reservations/${conflict.id}`} className="hover:underline">
                        Booked {formatTimeRange(conflict.startTime, conflict.endTime)} · {conflict.isMine && !canOpenAllBookings ? "you" : conflict.bookedBy}
                      </Link>
                    ) : (
                      <span>Booked {formatTimeRange(conflict.startTime, conflict.endTime)}</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {item.state === "INACTIVE" && (
              <p className="text-xs text-muted-foreground">This resource is deactivated and cannot be booked.</p>
            )}
          </div>
        }
      />
    </div>
  );
}
