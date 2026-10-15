"use client";

import type { ResourceDetailDto } from "@rrms/shared";
import { CalendarPlus, Pencil, Power, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@rrms/web/components/shared/ConfirmDialog";
import { Button } from "@rrms/web/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@rrms/web/components/ui/tooltip";
import { resourcesApi } from "@rrms/web/features/resources/api";
import { getErrorMessage } from "@rrms/web/lib/api-client";
import { ToggleResourceActiveDialog } from "./ToggleResourceActiveDialog";

export function ResourceDetailActions({ resource }: { resource: ResourceDetailDto }) {
  const router = useRouter();
  const [toggleOpen, setToggleOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const canDelete = resource.stats.totalReservations === 0;

  async function handleDelete() {
    setDeleting(true);
    try {
      await resourcesApi.remove(resource.id);
      toast.success(`"${resource.name}" deleted`);
      setDeleteOpen(false);
      router.push("/resources");
      router.refresh();
    } catch (error) {
      toast.error("Could not delete the resource", { description: getErrorMessage(error) });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      {resource.isActive && (
        <Button asChild>
          <Link href={`/reservations/new?resourceId=${resource.id}`}>
            <CalendarPlus aria-hidden /> Book
          </Link>
        </Button>
      )}
      <Button variant="outline" asChild>
        <Link href={`/resources/${resource.id}/edit`}>
          <Pencil aria-hidden /> Edit
        </Link>
      </Button>
      <Button variant={resource.isActive ? "destructive" : "outline"} onClick={() => setToggleOpen(true)}>
        <Power aria-hidden /> {resource.isActive ? "Deactivate" : "Activate"}
      </Button>
      {canDelete ? (
        <Button variant="ghost" onClick={() => setDeleteOpen(true)}>
          <Trash2 aria-hidden /> Delete
        </Button>
      ) : (
        <Tooltip>
          <TooltipTrigger asChild>
            {/* span keeps the tooltip working on a disabled button */}
            <span tabIndex={0} className="rounded-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
              <Button variant="ghost" disabled aria-describedby="delete-disabled-reason">
                <Trash2 aria-hidden /> Delete
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent id="delete-disabled-reason">
            Resources with reservation history cannot be deleted. Deactivate it instead.
          </TooltipContent>
        </Tooltip>
      )}

      <ToggleResourceActiveDialog resource={resource} open={toggleOpen} onOpenChange={setToggleOpen} />
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        pending={deleting}
        destructive
        title={`Delete "${resource.name}"?`}
        description="This resource has never been reserved, so it can be permanently deleted. This cannot be undone."
        confirmLabel="Delete permanently"
        onConfirm={handleDelete}
      />
    </>
  );
}
