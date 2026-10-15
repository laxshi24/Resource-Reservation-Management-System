"use client";

import type { ResourceDto } from "@rrms/shared";
import { ConfirmDialog } from "@rrms/web/components/shared/ConfirmDialog";
import { useToggleResourceActive } from "@rrms/web/features/resources/useToggleResourceActive";

interface Props {
  resource: Pick<ResourceDto, "id" | "name" | "isActive">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ToggleResourceActiveDialog({ resource, open, onOpenChange }: Props) {
  const { toggle, pending } = useToggleResourceActive();
  const deactivating = resource.isActive;

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      pending={pending}
      destructive={deactivating}
      title={deactivating ? `Deactivate "${resource.name}"?` : `Activate "${resource.name}"?`}
      description={
        deactivating
          ? "Deactivated resources cannot receive new reservations. Existing reservations and history are kept, and you can reactivate it at any time."
          : "The resource will become available for new reservations."
      }
      confirmLabel={deactivating ? "Deactivate" : "Activate"}
      onConfirm={async () => {
        if (await toggle(resource)) onOpenChange(false);
      }}
    />
  );
}
