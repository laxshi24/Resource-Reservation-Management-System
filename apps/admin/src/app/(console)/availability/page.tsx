import { AvailabilityView } from "@rrms/web/components/views/AvailabilityView";
import type { RawSearchParams } from "@rrms/web/lib/search-params";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Availability" };

export default async function AvailabilityPage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  return <AvailabilityView searchParams={await searchParams} variant="admin" />;
}
