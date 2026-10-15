"use client";

import type { ResourceDto } from "@rrms/shared";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { getErrorMessage } from "../../lib/api-client";
import { resourcesApi } from "./api";

/** Activate/deactivate a resource and refresh the server-rendered data. */
export function useToggleResourceActive() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function toggle(resource: Pick<ResourceDto, "id" | "name" | "isActive">): Promise<boolean> {
    setPending(true);
    try {
      await resourcesApi.update(resource.id, { isActive: !resource.isActive });
      toast.success(resource.isActive ? `"${resource.name}" deactivated` : `"${resource.name}" activated`, {
        description: resource.isActive
          ? "It can no longer be booked. Existing reservations are kept."
          : "It is available for new bookings again.",
      });
      router.refresh();
      return true;
    } catch (error) {
      toast.error("Could not update the resource", { description: getErrorMessage(error) });
      return false;
    } finally {
      setPending(false);
    }
  }

  return { toggle, pending };
}
