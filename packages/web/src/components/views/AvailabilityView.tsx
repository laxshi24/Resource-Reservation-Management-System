import { zonedLocalToUtcIso, type AvailabilityDto } from "@rrms/shared";
import { CalendarSearch } from "lucide-react";
import Link from "next/link";
import { AvailabilityResultCard } from "../availability/AvailabilityResultCard";
import { AvailabilitySearchForm } from "../availability/AvailabilitySearchForm";
import { PageHeader } from "../layout/PageHeader";
import { EmptyState } from "../shared/EmptyState";
import { ErrorMessage } from "../shared/ErrorMessage";
import { defaultSlot, validLocalDateTime } from "../../features/reservations/default-times";
import { reservationsApi } from "../../features/reservations/api";
import { resourcesApi } from "../../features/resources/api";
import { ApiClientError } from "../../lib/api-client";
import { APP_TIME_ZONE, formatTimeRange } from "../../lib/format-date";
import { getEnumParam, getParam, getUuidParam, type RawSearchParams } from "../../lib/search-params";
import { cn } from "../../lib/utils";

const SHOW_OPTIONS = ["all", "AVAILABLE", "OCCUPIED", "INACTIVE"] as const;
type Show = (typeof SHOW_OPTIONS)[number];

/** Availability search shared by both websites (inactive resources are only shown to admins). */
export async function AvailabilityView({ searchParams: params, variant }: { searchParams: RawSearchParams; variant: "admin" | "user" }) {
  const fallback = defaultSlot();
  const start = validLocalDateTime(getParam(params, "start")) ?? fallback.start;
  const end = validLocalDateTime(getParam(params, "end")) ?? fallback.end;
  const categoryId = getUuidParam(params, "categoryId");
  const show = getEnumParam(params, "show", SHOW_OPTIONS, "all");

  const { data: categories } = await resourcesApi.listCategories();

  // Validation problems (e.g. end before start, window too long) are shown inline, not as a crash.
  let availability: AvailabilityDto | null = null;
  let problem: string | null = null;
  try {
    availability = (
      await reservationsApi.availability({
        startTime: zonedLocalToUtcIso(start, APP_TIME_ZONE)!,
        endTime: zonedLocalToUtcIso(end, APP_TIME_ZONE)!,
        categoryId,
      })
    ).data;
  } catch (error) {
    if (!(error instanceof ApiClientError) || error.status !== 400) throw error;
    problem = error.details[0]?.message ?? error.message;
  }

  const showHref = (value: Show) => {
    const query = new URLSearchParams({ start, end });
    if (categoryId) query.set("categoryId", categoryId);
    if (value !== "all") query.set("show", value);
    return `/availability?${query}`;
  };
  const visible = availability?.items.filter((item) => show === "all" || item.state === show) ?? [];
  const allTabs: Array<{ value: Show; label: string; count: number }> = availability
    ? [
        { value: "all", label: "All", count: availability.summary.total },
        { value: "AVAILABLE", label: "Available", count: availability.summary.available },
        { value: "OCCUPIED", label: "Occupied", count: availability.summary.occupied },
        { value: "INACTIVE", label: "Inactive", count: availability.summary.inactive },
      ]
    : [];
  const tabs = allTabs.filter((tab) => variant === "admin" || tab.value !== "INACTIVE");

  return (
    <>
      <PageHeader
        title="Availability"
        description={`Find a free resource for a time window (${APP_TIME_ZONE}). Results come live from the database.`}
      />
      <AvailabilitySearchForm categories={categories} initial={{ start, end, categoryId }} />

      {problem && <ErrorMessage title="Check the time window" message={problem} />}

      {availability && (
        <section aria-labelledby="results-heading">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 id="results-heading" className="text-sm text-muted-foreground">
              Results for <span className="font-medium text-foreground">{formatTimeRange(availability.startTime, availability.endTime)}</span>
            </h2>
            <nav aria-label="Filter by availability" className="flex flex-wrap gap-1 rounded-lg border bg-background p-1">
              {tabs.map((tab) => (
                <Link
                  key={tab.value}
                  href={showHref(tab.value)}
                  scroll={false}
                  aria-current={show === tab.value ? "page" : undefined}
                  className={cn(
                    "rounded-md px-3 py-1 text-sm transition-colors",
                    show === tab.value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  {tab.label} <span className="tabular-nums opacity-80">{tab.count}</span>
                </Link>
              ))}
            </nav>
          </div>

          {visible.length === 0 ? (
            <EmptyState
              icon={CalendarSearch}
              title={availability.summary.total === 0 ? "No resources in this category" : "Nothing to show for this filter"}
              description="Try another time window, category or availability filter."
            />
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {visible.map((item) => (
                <li key={item.resource.id}>
                  <AvailabilityResultCard item={item} window={{ start, end }} canOpenAllBookings={variant === "admin"} />
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </>
  );
}
