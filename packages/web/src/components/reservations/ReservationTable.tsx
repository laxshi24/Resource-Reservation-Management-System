import type { ReservationDto } from "@rrms/shared";
import Link from "next/link";
import { DataTable, type DataTableColumn } from "../shared/DataTable";
import { formatDate, formatDuration, formatTime, formatTimeRange } from "../../lib/format-date";
import { cn } from "../../lib/utils";
import { ReservationRowActions } from "./ReservationRowActions";
import { ReservationStatusBadge } from "./ReservationStatusBadge";

interface ReservationTableProps {
  reservations: ReservationDto[];
  /** Server time used to decide which rows can still be cancelled. */
  now: number;
  /** Hide the "Booked by" column (e.g. on the user's own bookings page). */
  showBookedBy?: boolean;
}

const isCancellable = (reservation: ReservationDto, now: number) =>
  reservation.status === "CONFIRMED" && new Date(reservation.endTime).getTime() > now;

function buildColumns(now: number, showBookedBy: boolean): DataTableColumn<ReservationDto>[] {
  const columns: DataTableColumn<ReservationDto>[] = [
    {
      key: "resource",
      header: "Resource",
      cell: (r) => (
        <div className="max-w-56">
          <Link href={`/reservations/${r.id}`} className="font-medium hover:underline">
            {r.resource.name}
          </Link>
          <p className="text-xs text-muted-foreground">{r.resource.category.name}</p>
        </div>
      ),
    },
    {
      key: "when",
      header: "When",
      cell: (r) => (
        <div className={cn(r.status === "CANCELLED" && "text-muted-foreground line-through decoration-muted-foreground/50")}>
          <p className="whitespace-nowrap">{formatDate(r.startTime)}</p>
          <p className="text-xs whitespace-nowrap text-muted-foreground">
            {formatTime(r.startTime)}–{formatTime(r.endTime)} · {formatDuration(r.startTime, r.endTime)}
          </p>
        </div>
      ),
    },
    { key: "bookedBy", header: "Booked by", cell: (r) => r.bookedBy },
    {
      key: "purpose",
      header: "Purpose",
      cell: (r) =>
        r.purpose ? (
          <p className="max-w-56 truncate" title={r.purpose}>
            {r.purpose}
          </p>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    { key: "status", header: "Status", cell: (r) => <ReservationStatusBadge status={r.status} /> },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      className: "w-12 text-right",
      cell: (r) => <ReservationRowActions reservation={r} cancellable={isCancellable(r, now)} />,
    },
  ];
  return showBookedBy ? columns : columns.filter((column) => column.key !== "bookedBy");
}

/** Table on medium+ screens, cards on phones. */
export function ReservationTable({ reservations, now, showBookedBy = true }: ReservationTableProps) {
  return (
    <>
      <DataTable
        className="hidden md:block"
        caption="Reservations"
        columns={buildColumns(now, showBookedBy)}
        rows={reservations}
        getRowKey={(r) => r.id}
      />
      <ul className="grid gap-3 md:hidden">
        {reservations.map((r) => (
          <li key={r.id} className="rounded-lg border bg-background p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <Link href={`/reservations/${r.id}`} className="font-medium wrap-break-word hover:underline">
                  {r.resource.name}
                </Link>
                <p className="text-sm text-muted-foreground">{formatTimeRange(r.startTime, r.endTime)}</p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <ReservationStatusBadge status={r.status} />
                <ReservationRowActions reservation={r} cancellable={isCancellable(r, now)} />
              </div>
            </div>
            <p className="mt-2 text-sm">
              {r.bookedBy}
              {r.purpose && <span className="text-muted-foreground"> · {r.purpose}</span>}
            </p>
          </li>
        ))}
      </ul>
    </>
  );
}
