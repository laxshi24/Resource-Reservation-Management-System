import type { ReservationDto } from "@rrms/shared";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { formatTimeRange } from "../../lib/format-date";
import { ReservationStatusBadge } from "./ReservationStatusBadge";

interface ReservationListProps {
  reservations: ReservationDto[];
  /** Hide the resource name, e.g. on the resource's own page. */
  showResource?: boolean;
  emptyText: string;
}

/** Compact list of reservations for cards (dashboard, resource details). */
export function ReservationList({ reservations, showResource = true, emptyText }: ReservationListProps) {
  if (reservations.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">{emptyText}</p>;
  }
  return (
    <ul className="divide-y">
      {reservations.map((reservation) => (
        <li key={reservation.id}>
          <Link
            href={`/reservations/${reservation.id}`}
            className="flex items-center gap-3 rounded-md px-2 py-3 transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {showResource ? reservation.resource.name : reservation.purpose || "Reservation"}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {formatTimeRange(reservation.startTime, reservation.endTime)} · {reservation.bookedBy}
              </p>
            </div>
            <ReservationStatusBadge status={reservation.status} className="hidden sm:inline-flex" />
            <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          </Link>
        </li>
      ))}
    </ul>
  );
}
