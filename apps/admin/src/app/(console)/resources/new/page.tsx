import type { Metadata } from "next";
import { PageHeader } from "@rrms/web/components/layout/PageHeader";
import { ResourceForm } from "@/components/resources/ResourceForm";
import { resourcesApi } from "@rrms/web/features/resources/api";

export const metadata: Metadata = { title: "New resource" };

export default async function NewResourcePage() {
  const { data: categories } = await resourcesApi.listCategories();
  return (
    <>
      <PageHeader
        title="New resource"
        description="Add a room, piece of equipment or vehicle that people can reserve."
        back={{ href: "/resources", label: "Resources" }}
      />
      <ResourceForm categories={categories} />
    </>
  );
}
