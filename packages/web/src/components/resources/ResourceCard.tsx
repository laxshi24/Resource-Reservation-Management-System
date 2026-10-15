import type { ResourceDto } from "@rrms/shared";
import { MapPin, Users } from "lucide-react";
import Link from "next/link";
import { ResourceStatusBadge } from "./ResourceStatusBadge";

interface ResourceCardProps {
  resource: ResourceDto;
  actions?: React.ReactNode;
  footer?: React.ReactNode;
  /** Hide the active/inactive badge when the context shows a more specific status. */
  showStatus?: boolean;
}

export function ResourceCard({ resource, actions, footer, showStatus = true }: ResourceCardProps) {
  return (
    <article className="flex h-full flex-col gap-3 rounded-lg border bg-background p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link href={`/resources/${resource.id}`} className="font-medium wrap-break-word hover:underline">
            {resource.name}
          </Link>
          <p className="text-xs text-muted-foreground">{resource.category.name}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {showStatus && <ResourceStatusBadge isActive={resource.isActive} />}
          {actions}
        </div>
      </div>
      <dl className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
        {resource.location && (
          <div className="flex items-center gap-1.5">
            <dt className="sr-only">Location</dt>
            <MapPin className="size-3.5" aria-hidden />
            <dd>{resource.location}</dd>
          </div>
        )}
        {resource.capacity !== null && (
          <div className="flex items-center gap-1.5">
            <dt className="sr-only">Capacity</dt>
            <Users className="size-3.5" aria-hidden />
            <dd>{resource.capacity}</dd>
          </div>
        )}
      </dl>
      {footer && <div className="mt-auto">{footer}</div>}
    </article>
  );
}
