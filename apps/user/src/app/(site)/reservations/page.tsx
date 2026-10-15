import { ReservationsListView } from "@rrms/web/components/views/ReservationsListView";
import type { RawSearchParams } from "@rrms/web/lib/search-params";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "My bookings" };

export default async function MyBookingsPage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  return <ReservationsListView searchParams={await searchParams} variant="user" />;
}
