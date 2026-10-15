import { PageHeader } from "@rrms/web/components/layout/PageHeader";
import { ResourceCard } from "@rrms/web/components/resources/ResourceCard";
import { ResourceFilters } from "@rrms/web/components/resources/ResourceFilters";
import { EmptyState } from "@rrms/web/components/shared/EmptyState";
import { Pagination } from "@rrms/web/components/shared/Pagination";
import { Button } from "@rrms/web/components/ui/button";
import { resourcesApi } from "@rrms/web/features/resources/api";
import { getPageParam, getParam, getUuidParam, type RawSearchParams } from "@rrms/web/lib/search-params";
import { Boxes, CalendarPlus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Resources" };

export default async function ResourcesPage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  const params = await searchParams;
  const query = {
    search: getParam(params, "search")?.slice(0, 100),
    categoryId: getUuidParam(params, "categoryId"),
    page: getPageParam(params),
    pageSize: 12,
  };
  const [{ data: categories }, { data: resources }] = await Promise.all([
    resourcesApi.listCategories(),
    resourcesApi.list(query), // the API only returns active resources to users
  ]);

  return (
    <>
      <PageHeader title="Resources" description="Everything you can book. Pick one to see details or book it straight away." />
      <ResourceFilters categories={categories} showStatus={false} />
      {resources.items.length === 0 ? (
        <EmptyState
          icon={Boxes}
          title={query.search || query.categoryId ? "No resources match your search" : "No resources yet"}
          description="Try a different search term or category."
        />
      ) : (
        <>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {resources.items.map((resource) => (
              <li key={resource.id}>
                <ResourceCard
                  resource={resource}
                  showStatus={false}
                  footer={
                    <div className="flex items-center justify-between gap-2 border-t pt-3">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/resources/${resource.id}`}>Details</Link>
                      </Button>
                      <Button size="sm" asChild>
                        <Link href={`/reservations/new?resourceId=${resource.id}`} aria-label={`Book ${resource.name}`}>
                          <CalendarPlus aria-hidden /> Book
                        </Link>
                      </Button>
                    </div>
                  }
                />
              </li>
            ))}
          </ul>
          <Pagination pagination={resources.pagination} itemLabel="resources" />
        </>
      )}
    </>
  );
}
