import { PageHeader } from "@rrms/web/components/layout/PageHeader";
import { ReservationList } from "@rrms/web/components/reservations/ReservationList";
import { Button } from "@rrms/web/components/ui/button";
import { loadResourceOrNotFound } from "@rrms/web/features/resources/load-resource";
import { CalendarPlus, CalendarSearch, MapPin, Tag, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Resource details" };

export default async function ResourceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // For users the API returns 404 for inactive resources and only their own bookings.
  const resource = await loadResourceOrNotFound(id);

  return (
    <>
      <PageHeader
        title={resource.name}
        description={resource.category.name}
        back={{ href: "/resources", label: "Resources" }}
        actions={
          <>
            <Button variant="outline" asChild>
              <Link href={`/availability?categoryId=${resource.category.id}`}>
                <CalendarSearch aria-hidden /> Check availability
              </Link>
            </Button>
            <Button asChild>
              <Link href={`/reservations/new?resourceId=${resource.id}`}>
                <CalendarPlus aria-hidden /> Book this resource
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <section aria-labelledby="about-heading" className="rounded-xl border bg-background p-5 lg:col-span-2">
          <h2 id="about-heading" className="mb-3 font-semibold">
            About this resource
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">{resource.description ?? "No description provided."}</p>
          <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-3">
            <div className="flex items-center gap-2">
              <Tag className="size-4 text-muted-foreground" aria-hidden />
              <dt className="sr-only">Category</dt>
              <dd>{resource.category.name}</dd>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="size-4 text-muted-foreground" aria-hidden />
              <dt className="sr-only">Location</dt>
              <dd>{resource.location ?? "Location not specified"}</dd>
            </div>
            <div className="flex items-center gap-2">
              <Users className="size-4 text-muted-foreground" aria-hidden />
              <dt className="sr-only">Capacity</dt>
              <dd>{resource.capacity === null ? "Capacity not applicable" : `Up to ${resource.capacity} people`}</dd>
            </div>
          </dl>
        </section>

        <section aria-labelledby="mine-heading" className="rounded-xl border bg-background p-5">
          <h2 id="mine-heading" className="font-semibold">
            Your upcoming bookings
          </h2>
          <ReservationList
            reservations={resource.upcomingReservations}
            showResource={false}
            emptyText="You have not booked this resource yet."
          />
        </section>
      </div>
    </>
  );
}
