import { isValidDateString, zonedDayRange } from "@rrms/shared";
import { CalendarCheck, Plus } from "lucide-react";
import Link from "next/link";
import { reservationsApi } from "../../features/reservations/api";
import { resourcesApi } from "../../features/resources/api";
import { APP_TIME_ZONE } from "../../lib/format-date";
import { requestTime } from "../../lib/request-time";
import { getEnumParam, getPageParam, getParam, getUuidParam, type RawSearchParams } from "../../lib/search-params";
import { PageHeader } from "../layout/PageHeader";
import { ReservationFilters } from "../reservations/ReservationFilters";
import { ReservationTable } from "../reservations/ReservationTable";
import { EmptyState } from "../shared/EmptyState";
import { Pagination } from "../shared/Pagination";
import { Button } from "../ui/button";

function dateParam(params: RawSearchParams, key: string): string | undefined {
  const value = getParam(params, key);
  return value && isValidDateString(value) ? value : undefined;
}

interface Props {
  searchParams: RawSearchParams;
  /** admin: every reservation; user: the API only returns the user's own. */
  variant: "admin" | "user";
}

/** Reservation list with filters, shared by both websites. */
export async function ReservationsListView({ searchParams: params, variant }: Props) {
  let fromDate = dateParam(params, "fromDate");
  let toDate = dateParam(params, "toDate");
  if (fromDate && toDate && toDate < fromDate) [fromDate, toDate] = [toDate, fromDate];

  // Default view: upcoming reservations; when a date range is chosen, show any time within it.
  const timeframe = getEnumParam(params, "timeframe", ["upcoming", "past", "all"] as const, fromDate || toDate ? "all" : "upcoming");
  const status = getEnumParam(params, "status", ["CONFIRMED", "CANCELLED", "all"] as const, "all");

  const query = {
    search: getParam(params, "search")?.slice(0, 100),
    resourceId: getUuidParam(params, "resourceId"),
    status,
    timeframe,
    // Calendar dates are interpreted in the app timezone: [start of fromDate, end of toDate).
    from: fromDate ? zonedDayRange(fromDate, APP_TIME_ZONE).start.toISOString() : undefined,
    to: toDate ? zonedDayRange(toDate, APP_TIME_ZONE).end.toISOString() : undefined,
    sortOrder: timeframe === "past" ? ("desc" as const) : ("asc" as const),
    page: getPageParam(params),
    pageSize: 15,
  };

  const [{ data: reservations }, { data: resources }] = await Promise.all([
    reservationsApi.list(query),
    resourcesApi.list({ pageSize: 100, sortBy: "name" }),
  ]);
  const now = requestTime();
  const filtered = Boolean(query.search || query.resourceId || status !== "all" || fromDate || toDate || timeframe !== "upcoming");
  const isAdmin = variant === "admin";

  return (
    <>
      <PageHeader
        title={isAdmin ? "Reservations" : "My bookings"}
        description={
          isAdmin
            ? `All bookings, shown in ${APP_TIME_ZONE}. Cancelled bookings stay visible for history.`
            : `Your reservations, shown in ${APP_TIME_ZONE}. Cancelled bookings stay visible for your records.`
        }
        actions={
          <Button asChild>
            <Link href="/reservations/new">
              <Plus aria-hidden /> {isAdmin ? "New reservation" : "Book a resource"}
            </Link>
          </Button>
        }
      />
      <ReservationFilters resources={resources.items} timeframe={timeframe} />
      {reservations.items.length === 0 ? (
        <EmptyState
          icon={CalendarCheck}
          title={filtered ? "No reservations match your filters" : isAdmin ? "No upcoming reservations" : "You have no upcoming bookings"}
          description={
            filtered
              ? "Try another timeframe, status or date range."
              : isAdmin
                ? "When someone books a resource it will appear here."
                : "Find a free room, projector, workstation or vehicle and book it in seconds."
          }
          action={
            <Button asChild variant={filtered ? "outline" : "default"}>
              <Link href="/reservations/new">
                <Plus aria-hidden /> {isAdmin ? "New reservation" : "Book a resource"}
              </Link>
            </Button>
          }
        />
      ) : (
        <>
          <ReservationTable reservations={reservations.items} now={now} showBookedBy={isAdmin} />
          <Pagination pagination={reservations.pagination} itemLabel="reservations" />
        </>
      )}
    </>
  );
}
