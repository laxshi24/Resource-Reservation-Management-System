import { CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { loadReservationOrNotFound } from "../../features/reservations/load-reservation";
import { formatDateTime, formatDuration, formatTimeRange } from "../../lib/format-date";
import { requestTime } from "../../lib/request-time";
import { getParam, type RawSearchParams } from "../../lib/search-params";
import { PageHeader } from "../layout/PageHeader";
import { ReservationDetailActions } from "../reservations/ReservationDetailActions";
import { ReservationStatusBadge } from "../reservations/ReservationStatusBadge";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";

function DetailItem({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</dt>
      <dd className="text-sm wrap-break-word">{children}</dd>
    </div>
  );
}

interface Props {
  id: string;
  searchParams: RawSearchParams;
  variant: "admin" | "user";
}

/** Reservation details + actions. Users can only open their own (others are 404 from the API). */
export async function ReservationDetailView({ id, searchParams, variant }: Props) {
  const reservation = await loadReservationOrNotFound(id);
  const justCreated = getParam(searchParams, "created") === "1" && reservation.status === "CONFIRMED";
  const now = requestTime();
  const modifiable = reservation.status === "CONFIRMED" && new Date(reservation.endTime).getTime() > now;
  const canRebook = new Date(reservation.startTime).getTime() > now;
  const isAdmin = variant === "admin";

  return (
    <>
      <PageHeader
        title={reservation.resource.name}
        description={formatTimeRange(reservation.startTime, reservation.endTime)}
        back={{ href: "/reservations", label: isAdmin ? "Reservations" : "My bookings" }}
        actions={
          <ReservationDetailActions
            reservation={reservation}
            modifiable={modifiable}
            canRebook={canRebook}
            canEditBookedBy={isAdmin}
          />
        }
      />

      {justCreated && (
        <Alert className="mb-6 border-emerald-200 bg-emerald-50 text-emerald-900">
          <CheckCircle2 aria-hidden />
          <AlertTitle>Reservation confirmed</AlertTitle>
          <AlertDescription className="text-emerald-800">
            {reservation.resource.name} is reserved for {reservation.bookedBy}. Keep the reference{" "}
            <code className="rounded bg-emerald-100 px-1 font-mono text-xs">{reservation.id.slice(0, 8)}</code> for your
            records.
          </AlertDescription>
        </Alert>
      )}

      <section aria-labelledby="reservation-heading" className="rounded-lg border bg-background p-4 sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 id="reservation-heading" className="font-semibold">
            Booking details
          </h2>
          <ReservationStatusBadge status={reservation.status} />
        </div>
        <dl className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <DetailItem label="Resource">
            <Link href={`/resources/${reservation.resource.id}`} className="font-medium hover:underline">
              {reservation.resource.name}
            </Link>
            <span className="block text-muted-foreground">{reservation.resource.category.name}</span>
          </DetailItem>
          <DetailItem label="Location">{reservation.resource.location ?? "—"}</DetailItem>
          <DetailItem label="Booked for">{reservation.bookedBy}</DetailItem>
          <DetailItem label="Starts">{formatDateTime(reservation.startTime)}</DetailItem>
          <DetailItem label="Ends">{formatDateTime(reservation.endTime)}</DetailItem>
          <DetailItem label="Duration">{formatDuration(reservation.startTime, reservation.endTime)}</DetailItem>
          <DetailItem label="Reference">
            <code className="font-mono text-xs">{reservation.id}</code>
          </DetailItem>
          <DetailItem label="Created">{formatDateTime(reservation.createdAt)}</DetailItem>
          {reservation.cancelledAt && <DetailItem label="Cancelled">{formatDateTime(reservation.cancelledAt)}</DetailItem>}
          <div className="sm:col-span-2 lg:col-span-3">
            <DetailItem label="Purpose">{reservation.purpose ?? "No purpose provided."}</DetailItem>
          </div>
          {reservation.cancellationReason && (
            <div className="sm:col-span-2 lg:col-span-3">
              <DetailItem label="Cancellation reason">{reservation.cancellationReason}</DetailItem>
            </div>
          )}
        </dl>
      </section>
    </>
  );
}
