import type { Metadata } from "next";
import { PageHeader } from "@rrms/web/components/layout/PageHeader";
import { ResourceForm } from "@/components/resources/ResourceForm";
import { resourcesApi } from "@rrms/web/features/resources/api";
import { loadResourceOrNotFound } from "@rrms/web/features/resources/load-resource";

export const metadata: Metadata = { title: "Edit resource" };

export default async function EditResourcePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [resource, { data: categories }] = await Promise.all([
    loadResourceOrNotFound(id),
    resourcesApi.listCategories(),
  ]);

  return (
    <>
      <PageHeader
        title={`Edit ${resource.name}`}
        description="Update the details of this resource."
        back={{ href: `/resources/${resource.id}`, label: resource.name }}
      />
      <ResourceForm categories={categories} resource={resource} />
    </>
  );
}
