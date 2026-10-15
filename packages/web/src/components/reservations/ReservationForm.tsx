"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { FIELD_LIMITS, zonedLocalToUtcIso, type ResourceDto } from "@rrms/shared";
import { CalendarSearch, Clock, Loader2, MapPin, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { ErrorMessage } from "../shared/ErrorMessage";
import { Button } from "../ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "../ui/field";
import { Input } from "../ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "../ui/select";
import { Textarea } from "../ui/textarea";
import { reservationsApi } from "../../features/reservations/api";
import {
  createReservationFormSchema,
  toReservationRequest,
  type ReservationFormValues,
} from "../../features/reservations/reservation-form-schema";
import { ApiClientError, getErrorMessage } from "../../lib/api-client";
import { APP_TIME_ZONE, formatDuration } from "../../lib/format-date";

interface ReservationFormProps {
  /** Active resources that can be booked. */
  resources: ResourceDto[];
  defaultValues: Pick<ReservationFormValues, "resourceId" | "start" | "end" | "bookedBy">;
  /**
   * true (admin website): "Booked for" can be changed to book on someone's behalf.
   * false (user website): bookings are always made under the logged-in user's name.
   */
  bookedByEditable?: boolean;
  /** Where "Cancel" goes. */
  cancelHref?: string;
  /** Earliest selectable value for the datetime inputs. */
  minDateTime: string;
}

const API_TO_FORM_FIELD: Record<string, keyof ReservationFormValues> = {
  resourceId: "resourceId",
  bookedBy: "bookedBy",
  purpose: "purpose",
  startTime: "start",
  endTime: "end",
};

interface ConflictState {
  message: string;
  availabilityHref: string;
}

export function ReservationForm({
  resources,
  defaultValues,
  minDateTime,
  bookedByEditable = true,
  cancelHref = "/reservations",
}: ReservationFormProps) {
  const router = useRouter();
  const schema = useMemo(() => createReservationFormSchema(), []);
  const [formError, setFormError] = useState<string | null>(null);
  const [conflict, setConflict] = useState<ConflictState | null>(null);

  const form = useForm<ReservationFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { purpose: "", ...defaultValues },
    mode: "onTouched",
  });
  const { register, control, handleSubmit, setError, formState } = form;
  const { errors, isSubmitting } = formState;

  const [resourceId, start, end] = useWatch({ control, name: ["resourceId", "start", "end"] });
  const selectedResource = resources.find((resource) => resource.id === resourceId);
  const startIso = zonedLocalToUtcIso(start, APP_TIME_ZONE);
  const endIso = zonedLocalToUtcIso(end, APP_TIME_ZONE);
  const duration = startIso && endIso && endIso > startIso ? formatDuration(startIso, endIso) : null;

  // Group the resource dropdown by category for easier scanning.
  const groups = useMemo(() => {
    const map = new Map<string, ResourceDto[]>();
    for (const resource of resources) {
      const list = map.get(resource.category.name) ?? [];
      list.push(resource);
      map.set(resource.category.name, list);
    }
    return [...map.entries()];
  }, [resources]);

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    setConflict(null);
    try {
      const { data } = await reservationsApi.create(toReservationRequest(values));
      toast.success("Reservation confirmed", { description: `${data.resource.name} is booked for you.` });
      router.push(`/reservations/${data.id}?created=1`);
      router.refresh();
    } catch (error) {
      if (error instanceof ApiClientError) {
        if (error.code === "RESERVATION_CONFLICT") {
          const query = new URLSearchParams({ start: values.start, end: values.end });
          if (selectedResource) query.set("categoryId", selectedResource.category.id);
          setConflict({ message: error.message, availabilityHref: `/availability?${query}` });
          return;
        }
        if (error.code === "RESOURCE_INACTIVE" || error.code === "RESOURCE_NOT_FOUND") {
          setError("resourceId", { message: error.message }, { shouldFocus: true });
          return;
        }
        let mapped = false;
        for (const detail of error.details) {
          const field = API_TO_FORM_FIELD[detail.path];
          if (field) {
            setError(field, { message: detail.message });
            mapped = true;
          }
        }
        if (mapped) return;
      }
      setFormError(getErrorMessage(error));
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="max-w-2xl space-y-6 rounded-lg border bg-background p-4 sm:p-6">
      {conflict && (
        <ErrorMessage
          title="Time slot unavailable"
          message={conflict.message}
          action={
            <Button variant="outline" size="sm" asChild>
              <Link href={conflict.availabilityHref}>
                <CalendarSearch aria-hidden /> See what is available at this time
              </Link>
            </Button>
          }
        />
      )}
      {formError && <ErrorMessage title="Could not create the reservation" message={formError} />}

      <FieldGroup>
        <Field data-invalid={Boolean(errors.resourceId)}>
          <FieldLabel htmlFor="resourceId">Resource</FieldLabel>
          <Controller
            control={control}
            name="resourceId"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="resourceId" className="w-full" aria-invalid={Boolean(errors.resourceId)} onBlur={field.onBlur} ref={field.ref}>
                  <SelectValue placeholder="Choose what to reserve" />
                </SelectTrigger>
                <SelectContent>
                  {groups.map(([category, items]) => (
                    <SelectGroup key={category}>
                      <SelectLabel>{category}</SelectLabel>
                      {items.map((resource) => (
                        <SelectItem key={resource.id} value={resource.id}>
                          {resource.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {selectedResource && (
            <FieldDescription className="flex flex-wrap gap-x-4 gap-y-1">
              <span>{selectedResource.category.name}</span>
              {selectedResource.location && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="size-3.5" aria-hidden /> {selectedResource.location}
                </span>
              )}
              {selectedResource.capacity !== null && (
                <span className="inline-flex items-center gap-1">
                  <Users className="size-3.5" aria-hidden /> {selectedResource.capacity}
                </span>
              )}
            </FieldDescription>
          )}
          <FieldError errors={[errors.resourceId]} />
        </Field>

        <div className="grid gap-6 sm:grid-cols-2">
          <Field data-invalid={Boolean(errors.start)}>
            <FieldLabel htmlFor="start">Start</FieldLabel>
            <Input id="start" type="datetime-local" min={minDateTime} step={300} aria-invalid={Boolean(errors.start)} {...register("start", { deps: ["end"] })} />
            <FieldError errors={[errors.start]} />
          </Field>
          <Field data-invalid={Boolean(errors.end)}>
            <FieldLabel htmlFor="end">End</FieldLabel>
            <Input id="end" type="datetime-local" min={start || minDateTime} step={300} aria-invalid={Boolean(errors.end)} {...register("end", { deps: ["start"] })} />
            <FieldError errors={[errors.end]} />
          </Field>
        </div>
        <p className="-mt-3 flex items-center gap-1.5 text-sm text-muted-foreground">
          <Clock className="size-3.5" aria-hidden />
          {duration ? `Duration: ${duration}` : "Pick a start and end time"} · Times are in {APP_TIME_ZONE}. The end time is
          exclusive, so back-to-back bookings are fine.
        </p>

        {bookedByEditable ? (
          <Field data-invalid={Boolean(errors.bookedBy)}>
            <FieldLabel htmlFor="bookedBy">Booked for</FieldLabel>
            <Input
              id="bookedBy"
              autoComplete="name"
              placeholder="Full name of the person using the resource"
              maxLength={FIELD_LIMITS.bookedBy.max}
              aria-invalid={Boolean(errors.bookedBy)}
              {...register("bookedBy")}
            />
            <FieldDescription>Defaults to you. Change it to book on someone else&apos;s behalf.</FieldDescription>
            <FieldError errors={[errors.bookedBy]} />
          </Field>
        ) : (
          <p className="text-sm text-muted-foreground">
            Booking as <span className="font-medium text-foreground">{defaultValues.bookedBy}</span>
          </p>
        )}

        <Field data-invalid={Boolean(errors.purpose)}>
          <FieldLabel htmlFor="purpose">
            Purpose <span className="font-normal text-muted-foreground">(optional)</span>
          </FieldLabel>
          <Textarea id="purpose" rows={3} placeholder="e.g. Quarterly planning with the design team" maxLength={FIELD_LIMITS.purpose.max} aria-invalid={Boolean(errors.purpose)} {...register("purpose")} />
          <FieldError errors={[errors.purpose]} />
        </Field>
      </FieldGroup>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" asChild>
          <Link href={cancelHref}>Cancel</Link>
        </Button>
        <Button type="submit" disabled={isSubmitting || resources.length === 0}>
          {isSubmitting && <Loader2 className="animate-spin" aria-hidden />}
          Confirm reservation
        </Button>
      </div>
    </form>
  );
}
