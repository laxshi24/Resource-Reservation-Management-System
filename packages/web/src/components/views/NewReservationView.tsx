import type { UserDto } from "@rrms/shared";
import { Boxes } from "lucide-react";
import Link from "next/link";
import { defaultSlot, nowLocalInput, validLocalDateTime } from "../../features/reservations/default-times";
import { resourcesApi } from "../../features/resources/api";
import { getParam, getUuidParam, type RawSearchParams } from "../../lib/search-params";
import { PageHeader } from "../layout/PageHeader";
import { ReservationForm } from "../reservations/ReservationForm";
import { EmptyState } from "../shared/EmptyState";
import { Button } from "../ui/button";

interface Props {
  searchParams: RawSearchParams;
  variant: "admin" | "user";
  user: UserDto;
}

/** Booking page shared by both websites (admins can book on someone's behalf). */
export async function NewReservationView({ searchParams: params, variant, user }: Props) {
  const { data } = await resourcesApi.list({ status: "active", pageSize: 100, sortBy: "name" });
  const resources = data.items;
  const isAdmin = variant === "admin";

  // Pre-fill from links such as "Book" on a resource or a free slot on the availability page.
  const requestedId = getUuidParam(params, "resourceId");
  const fallback = defaultSlot();
  const start = validLocalDateTime(getParam(params, "start")) ?? fallback.start;
  const end = validLocalDateTime(getParam(params, "end")) ?? fallback.end;

  return (
    <>
      <PageHeader
        title={isAdmin ? "New reservation" : "Book a resource"}
        description="Choose a resource and a time. Overlapping bookings are rejected automatically."
        back={{ href: "/reservations", label: isAdmin ? "Reservations" : "My bookings" }}
      />
      {resources.length === 0 ? (
        <EmptyState
          icon={Boxes}
          title="No resources are available to book"
          description={isAdmin ? "Create a resource or activate an existing one first." : "Please check back later."}
          action={
            isAdmin && (
              <Button asChild>
                <Link href="/resources">Manage resources</Link>
              </Button>
            )
          }
        />
      ) : (
        <ReservationForm
          resources={resources}
          minDateTime={nowLocalInput()}
          bookedByEditable={isAdmin}
          defaultValues={{
            resourceId: resources.some((resource) => resource.id === requestedId) ? requestedId! : "",
            start,
            end,
            bookedBy: user.name,
          }}
        />
      )}
    </>
  );
}
