import { isValidDateString } from "@rrms/shared";
import { Boxes, CalendarCheck, CalendarClock, CalendarPlus, CalendarSearch, CircleCheck, Plus } from "lucide-react";
import Link from "next/link";
import { CategoryBreakdown } from "@/components/dashboard/CategoryBreakdown";
import { DashboardDatePicker } from "@/components/dashboard/DashboardDatePicker";
import { StatTile } from "@rrms/web/components/dashboard/StatTile";
import { PageHeader } from "@rrms/web/components/layout/PageHeader";
import { ReservationList } from "@rrms/web/components/reservations/ReservationList";
import { Button } from "@rrms/web/components/ui/button";
import { dashboardApi } from "@rrms/web/features/dashboard/api";
import { APP_TIME_ZONE, formatDate, todayInAppZone } from "@rrms/web/lib/format-date";
import { getParam, type RawSearchParams } from "@rrms/web/lib/search-params";

function Panel({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border bg-background p-4" aria-label={title}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export default async function DashboardPage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  const params = await searchParams;
  const today = todayInAppZone();
  const requested = getParam(params, "date");
  const date = requested && isValidDateString(requested) ? requested : today;

  const { data } = await dashboardApi.get({ date, timeZone: APP_TIME_ZONE });
  const dayLabel = date === today ? "today" : formatDate(`${date}T12:00:00Z`);
  const { totals } = data;

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Live overview of resources and reservations."
        actions={
          <>
            <Button variant="outline" asChild>
              <Link href="/resources/new">
                <Plus aria-hidden /> New resource
              </Link>
            </Button>
            <Button asChild>
              <Link href="/reservations/new">
                <CalendarPlus aria-hidden /> New reservation
              </Link>
            </Button>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <DashboardDatePicker date={date} today={today} />
        <Button variant="link" asChild className="px-0">
          <Link href="/availability">
            <CalendarSearch aria-hidden /> Check availability
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Active resources"
          value={totals.activeResources}
          icon={Boxes}
          hint={`${totals.inactiveResources} inactive`}
          href="/resources?status=active"
        />
        <StatTile
          label={`Bookings ${date === today ? "today" : "on selected day"}`}
          value={totals.reservationsOnDate}
          icon={CalendarCheck}
          hint="Confirmed reservations"
          href={`/reservations?fromDate=${date}&toDate=${date}&status=CONFIRMED`}
        />
        <StatTile
          label="Upcoming confirmed"
          value={totals.upcomingConfirmed}
          icon={CalendarClock}
          hint={`${totals.cancelledTotal} cancelled all time · ${totals.totalUsers} users`}
          href="/reservations?status=CONFIRMED"
        />
        <StatTile
          label="Available now"
          value={totals.availableNow}
          icon={CircleCheck}
          hint={`of ${totals.activeResources} active resources`}
          href="/availability"
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Panel
            title={`Schedule for ${dayLabel}`}
            action={
              <Button variant="link" size="sm" asChild className="px-0">
                <Link href={`/reservations?fromDate=${date}&toDate=${date}`}>View all</Link>
              </Button>
            }
          >
            <ReservationList reservations={data.todaysReservations} emptyText={`No confirmed bookings for ${dayLabel}.`} />
          </Panel>
          <Panel
            title="Upcoming reservations"
            action={
              <Button variant="link" size="sm" asChild className="px-0">
                <Link href="/reservations">View all</Link>
              </Button>
            }
          >
            <ReservationList reservations={data.upcomingReservations} emptyText="No upcoming reservations." />
          </Panel>
        </div>
        <div className="space-y-6">
          <Panel title="Active resources by category">
            <CategoryBreakdown categories={data.categoryBreakdown} />
          </Panel>
          <Panel title="Recently booked">
            <ReservationList reservations={data.recentReservations} emptyText="No reservations yet." />
          </Panel>
        </div>
      </div>
    </>
  );
}
