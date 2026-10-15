import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@rrms/web/components/layout/PageHeader";
import { ReservationList } from "@rrms/web/components/reservations/ReservationList";
import { ResourceDetailActions } from "@/components/resources/ResourceDetailActions";
import { ResourceStatusBadge } from "@rrms/web/components/resources/ResourceStatusBadge";
import { Button } from "@rrms/web/components/ui/button";
import { loadResourceOrNotFound } from "@rrms/web/features/resources/load-resource";
import { formatDateTime } from "@rrms/web/lib/format-date";

export const metadata: Metadata = { title: "Resource details" };

function DetailItem({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</dt>
      <dd className="text-sm wrap-break-word">{children}</dd>
    </div>
  );
}

export default async function ResourceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const resource = await loadResourceOrNotFound(id);

  return (
    <>
      <PageHeader
        title={resource.name}
        description={resource.category.name}
        back={{ href: "/resources", label: "Resources" }}
        actions={<ResourceDetailActions resource={resource} />}
      />

      <section aria-labelledby="details-heading" className="rounded-lg border bg-background p-4 sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 id="details-heading" className="font-semibold">
            Details
          </h2>
          <ResourceStatusBadge isActive={resource.isActive} />
        </div>
        <dl className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <DetailItem label="Category">{resource.category.name}</DetailItem>
          <DetailItem label="Location">{resource.location ?? "—"}</DetailItem>
          <DetailItem label="Capacity">{resource.capacity ?? "Not applicable"}</DetailItem>
          <DetailItem label="Created">{formatDateTime(resource.createdAt)}</DetailItem>
          <DetailItem label="Last updated">{formatDateTime(resource.updatedAt)}</DetailItem>
          <DetailItem label="Total reservations">{resource.stats.totalReservations}</DetailItem>
          <div className="sm:col-span-2 lg:col-span-3">
            <DetailItem label="Description">{resource.description ?? "No description provided."}</DetailItem>
          </div>
        </dl>
      </section>

      <section aria-labelledby="upcoming-heading" className="mt-6 rounded-lg border bg-background p-4 sm:p-6">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h2 id="upcoming-heading" className="font-semibold">
            Upcoming reservations{" "}
            <span className="font-normal text-muted-foreground">({resource.stats.upcomingConfirmed})</span>
          </h2>
          <Button variant="link" size="sm" asChild className="px-0">
            <Link href={`/reservations?resourceId=${resource.id}`}>View all reservations</Link>
          </Button>
        </div>
        <ReservationList
          reservations={resource.upcomingReservations}
          showResource={false}
          emptyText={resource.isActive ? "No upcoming reservations. It is free to book." : "No upcoming reservations."}
        />
      </section>
    </>
  );
}
