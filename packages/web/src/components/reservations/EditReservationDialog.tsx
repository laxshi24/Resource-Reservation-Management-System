"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { FIELD_LIMITS, type ReservationDto } from "@rrms/shared";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "../ui/field";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { reservationsApi } from "../../features/reservations/api";
import { getErrorMessage } from "../../lib/api-client";

const schema = z.object({
  bookedBy: z
    .string()
    .trim()
    .min(FIELD_LIMITS.bookedBy.min, `Name must be at least ${FIELD_LIMITS.bookedBy.min} characters`)
    .max(FIELD_LIMITS.bookedBy.max, `Name must be at most ${FIELD_LIMITS.bookedBy.max} characters`),
  purpose: z.string().trim().max(FIELD_LIMITS.purpose.max, `Purpose must be at most ${FIELD_LIMITS.purpose.max} characters`),
});
type Values = z.infer<typeof schema>;

interface Props {
  reservation: ReservationDto;
  /** Only administrators may change who a reservation is for. */
  canEditBookedBy?: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Edits the descriptive details of a confirmed reservation. The time and
 * resource are intentionally not editable: to change them, cancel and rebook,
 * so the double-booking checks always run on a fresh reservation.
 */
export function EditReservationDialog({ reservation, open, onOpenChange, canEditBookedBy = true }: Props) {
  const router = useRouter();
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { bookedBy: reservation.bookedBy, purpose: reservation.purpose ?? "" },
  });
  const { register, handleSubmit, formState, reset } = form;

  const onSubmit = handleSubmit(async (values) => {
    try {
      await reservationsApi.update(reservation.id, {
        ...(canEditBookedBy ? { bookedBy: values.bookedBy } : {}),
        purpose: values.purpose || null,
      });
      toast.success("Reservation updated");
      onOpenChange(false);
      router.refresh();
    } catch (error) {
      toast.error("Could not update the reservation", { description: getErrorMessage(error) });
    }
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (formState.isSubmitting) return;
        if (!next) reset({ bookedBy: reservation.bookedBy, purpose: reservation.purpose ?? "" });
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <form onSubmit={onSubmit} noValidate className="space-y-5">
          <DialogHeader>
            <DialogTitle>{canEditBookedBy ? "Edit reservation details" : "Edit purpose"}</DialogTitle>
            <DialogDescription>
              To change the time or resource, cancel this reservation and make a new one.
            </DialogDescription>
          </DialogHeader>
          <FieldGroup>
            {canEditBookedBy && (
            <Field data-invalid={Boolean(formState.errors.bookedBy)}>
              <FieldLabel htmlFor="edit-bookedBy">Booked for</FieldLabel>
              <Input id="edit-bookedBy" maxLength={FIELD_LIMITS.bookedBy.max} aria-invalid={Boolean(formState.errors.bookedBy)} {...register("bookedBy")} />
              <FieldError errors={[formState.errors.bookedBy]} />
            </Field>
            )}
            <Field data-invalid={Boolean(formState.errors.purpose)}>
              <FieldLabel htmlFor="edit-purpose">Purpose</FieldLabel>
              <Textarea id="edit-purpose" rows={3} maxLength={FIELD_LIMITS.purpose.max} aria-invalid={Boolean(formState.errors.purpose)} {...register("purpose")} />
              <FieldError errors={[formState.errors.purpose]} />
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={formState.isSubmitting}>
              Discard
            </Button>
            <Button type="submit" disabled={formState.isSubmitting}>
              {formState.isSubmitting && <Loader2 className="animate-spin" aria-hidden />}
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
