import { StatTile } from "@rrms/web/components/dashboard/StatTile";
import { ReservationList } from "@rrms/web/components/reservations/ReservationList";
import { Button } from "@rrms/web/components/ui/button";
import { requireSession } from "@rrms/web/features/auth/session";
import { dashboardApi } from "@rrms/web/features/dashboard/api";
import { APP_TIME_ZONE, todayInAppZone } from "@rrms/web/lib/format-date";
import { Boxes, CalendarCheck, CalendarClock, CalendarPlus, CalendarSearch, CircleCheck } from "lucide-react";
import Link from "next/link";

function Panel({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border bg-background p-4 sm:p-5" aria-label={title}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export default async function HomePage() {
  const [{ user }, { data }] = await Promise.all([
    requireSession(),
    dashboardApi.mine({ date: todayInAppZone(), timeZone: APP_TIME_ZONE }),
  ]);
  const { totals } = data;
  const firstName = user.name.split(/\s+/)[0];

  return (
    <>
      <section className="mb-8 overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 p-6 text-white sm:p-8">
        <p className="text-sm text-indigo-100">Welcome back</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Hi {firstName}, what do you need today?</h1>
        <p className="mt-2 max-w-xl text-sm text-indigo-100">
          {totals.availableNow} of {totals.activeResources} resources are free right now. Bookings are checked instantly,
          so you never clash with a colleague.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button asChild className="bg-white text-indigo-700 hover:bg-indigo-50">
            <Link href="/reservations/new">
              <CalendarPlus aria-hidden /> Book a resource
            </Link>
          </Button>
          <Button asChild variant="outline" className="border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white">
            <Link href="/availability">
              <CalendarSearch aria-hidden /> Check availability
            </Link>
          </Button>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatTile label="Total resources" value={totals.activeResources} icon={Boxes} hint="Rooms, equipment and vehicles" href="/resources" />
        <StatTile label="Available now" value={totals.availableNow} icon={CircleCheck} hint="Free to book right now" href="/availability" />
        <StatTile label="My bookings today" value={totals.myReservationsOnDate} icon={CalendarCheck} hint="Confirmed for today" href="/reservations" />
        <StatTile label="My upcoming bookings" value={totals.myUpcoming} icon={CalendarClock} hint="Starting after now" href="/reservations" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel title="Today">
          <ReservationList reservations={data.myReservationsOnDate} emptyText="You have no bookings today." />
        </Panel>
        <Panel
          title="Coming up"
          action={
            <Button variant="link" size="sm" asChild className="px-0">
              <Link href="/reservations">All my bookings</Link>
            </Button>
          }
        >
          <ReservationList reservations={data.myUpcoming} emptyText="Nothing booked yet - find a free resource to get started." />
        </Panel>
      </div>
    </>
  );
}
