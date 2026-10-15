import { Boxes, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@rrms/web/components/layout/PageHeader";
import { ResourceFilters } from "@rrms/web/components/resources/ResourceFilters";
import { ResourceTable } from "@/components/resources/ResourceTable";
import { EmptyState } from "@rrms/web/components/shared/EmptyState";
import { Pagination } from "@rrms/web/components/shared/Pagination";
import { Button } from "@rrms/web/components/ui/button";
import { resourcesApi } from "@rrms/web/features/resources/api";
import { getEnumParam, getPageParam, getParam, getUuidParam, type RawSearchParams } from "@rrms/web/lib/search-params";

export const metadata: Metadata = { title: "Resources" };

export default async function ResourcesPage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  const params = await searchParams;
  const query = {
    search: getParam(params, "search")?.slice(0, 100),
    categoryId: getUuidParam(params, "categoryId"),
    status: getEnumParam(params, "status", ["active", "inactive", "all"] as const, "all"),
    page: getPageParam(params),
    pageSize: 10,
  };

  const [{ data: categories }, { data: resources }] = await Promise.all([
    resourcesApi.listCategories(),
    resourcesApi.list(query),
  ]);
  const filtered = Boolean(query.search || query.categoryId || query.status !== "all");

  return (
    <>
      <PageHeader
        title="Resources"
        description="Rooms, equipment and vehicles that can be reserved."
        actions={
          <Button asChild>
            <Link href="/resources/new">
              <Plus aria-hidden /> New resource
            </Link>
          </Button>
        }
      />
      <ResourceFilters categories={categories} />
      {resources.items.length === 0 ? (
        <EmptyState
          icon={Boxes}
          title={filtered ? "No resources match your filters" : "No resources yet"}
          description={
            filtered
              ? "Try a different search term or clear the filters."
              : "Add your first meeting room, projector, workstation or vehicle."
          }
          action={
            !filtered && (
              <Button asChild>
                <Link href="/resources/new">
                  <Plus aria-hidden /> New resource
                </Link>
              </Button>
            )
          }
        />
      ) : (
        <>
          <ResourceTable resources={resources.items} />
          <Pagination pagination={resources.pagination} itemLabel="resources" />
        </>
      )}
    </>
  );
}
