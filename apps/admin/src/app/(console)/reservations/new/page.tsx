import { NewReservationView } from "@rrms/web/components/views/NewReservationView";
import { requireSession } from "@rrms/web/features/auth/session";
import type { RawSearchParams } from "@rrms/web/lib/search-params";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "New reservation" };

export default async function NewReservationPage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  const [{ user }, params] = await Promise.all([requireSession(), searchParams]);
  return <NewReservationView searchParams={params} variant="admin" user={user} />;
}
