"use client";

import { FIELD_LIMITS, type ReservationDto } from "@rrms/shared";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "../shared/ConfirmDialog";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { reservationsApi } from "../../features/reservations/api";
import { getErrorMessage } from "../../lib/api-client";
import { formatTimeRange } from "../../lib/format-date";

interface Props {
  reservation: Pick<ReservationDto, "id" | "startTime" | "endTime"> & { resource: { name: string } };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Confirms cancellation (CONFIRMED -> CANCELLED) with an optional reason. */
export function CancelReservationDialog({ reservation, open, onOpenChange }: Props) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);

  async function handleConfirm() {
    setPending(true);
    try {
      await reservationsApi.cancel(reservation.id, { reason: reason.trim() || null });
      toast.success("Reservation cancelled", { description: `${reservation.resource.name} is free again for that time.` });
      onOpenChange(false);
      setReason("");
      router.refresh();
    } catch (error) {
      toast.error("Could not cancel the reservation", { description: getErrorMessage(error) });
      router.refresh(); // show the latest state, e.g. if it was cancelled elsewhere
    } finally {
      setPending(false);
    }
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      pending={pending}
      destructive
      title="Cancel this reservation?"
      description={
        <>
          <strong className="font-medium text-foreground">{reservation.resource.name}</strong>,{" "}
          {formatTimeRange(reservation.startTime, reservation.endTime)}. Cancellation is final - the time slot is
          released immediately and the booking cannot be reactivated.
        </>
      }
      confirmLabel="Cancel reservation"
      onConfirm={handleConfirm}
    >
      <div className="space-y-1.5">
        <Label htmlFor={`cancel-reason-${reservation.id}`}>
          Reason <span className="font-normal text-muted-foreground">(optional)</span>
        </Label>
        <Textarea
          id={`cancel-reason-${reservation.id}`}
          rows={3}
          value={reason}
          maxLength={FIELD_LIMITS.cancellationReason.max}
          onChange={(event) => setReason(event.target.value)}
          placeholder="e.g. Meeting moved online"
          disabled={pending}
        />
      </div>
    </ConfirmDialog>
  );
}
