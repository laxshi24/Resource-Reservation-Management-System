import type { ResourceDto } from "@rrms/shared";
import Link from "next/link";
import { DataTable, type DataTableColumn } from "@rrms/web/components/shared/DataTable";
import { ResourceCard } from "@rrms/web/components/resources/ResourceCard";
import { ResourceRowActions } from "./ResourceRowActions";
import { ResourceStatusBadge } from "@rrms/web/components/resources/ResourceStatusBadge";

const columns: DataTableColumn<ResourceDto>[] = [
  {
    key: "name",
    header: "Name",
    cell: (resource) => (
      <div className="max-w-xs">
        <Link href={`/resources/${resource.id}`} className="font-medium hover:underline">
          {resource.name}
        </Link>
        {resource.description && (
          <p className="truncate text-xs text-muted-foreground" title={resource.description}>
            {resource.description}
          </p>
        )}
      </div>
    ),
  },
  { key: "category", header: "Category", cell: (resource) => resource.category.name },
  {
    key: "location",
    header: "Location",
    cell: (resource) => resource.location ?? <span className="text-muted-foreground">—</span>,
  },
  {
    key: "capacity",
    header: "Capacity",
    className: "text-right",
    cell: (resource) => resource.capacity ?? <span className="text-muted-foreground">—</span>,
  },
  { key: "status", header: "Status", cell: (resource) => <ResourceStatusBadge isActive={resource.isActive} /> },
  {
    key: "actions",
    header: <span className="sr-only">Actions</span>,
    className: "w-12 text-right",
    cell: (resource) => <ResourceRowActions resource={resource} />,
  },
];

/** Table on medium+ screens, stacked cards on phones. */
export function ResourceTable({ resources }: { resources: ResourceDto[] }) {
  return (
    <>
      <DataTable
        className="hidden md:block"
        caption="Resources"
        columns={columns}
        rows={resources}
        getRowKey={(resource) => resource.id}
      />
      <ul className="grid gap-3 md:hidden">
        {resources.map((resource) => (
          <li key={resource.id}>
            <ResourceCard resource={resource} actions={<ResourceRowActions resource={resource} />} />
          </li>
        ))}
      </ul>
    </>
  );
}
