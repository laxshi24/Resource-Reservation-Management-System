import { ReservationDetailView } from "@rrms/web/components/views/ReservationDetailView";
import type { RawSearchParams } from "@rrms/web/lib/search-params";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Reservation details" };

export default async function ReservationDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<RawSearchParams>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  return <ReservationDetailView id={id} searchParams={query} variant="admin" />;
}
