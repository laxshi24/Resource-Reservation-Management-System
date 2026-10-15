"use client";

import { utcToZonedLocalInput, type ReservationDto } from "@rrms/shared";
import { CalendarPlus, Pencil, XCircle } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "../ui/button";
import { APP_TIME_ZONE } from "../../lib/format-date";
import { CancelReservationDialog } from "./CancelReservationDialog";
import { EditReservationDialog } from "./EditReservationDialog";

interface Props {
  reservation: ReservationDto;
  /** Whether the reservation can still be changed (confirmed and not yet ended), computed on the server. */
  modifiable: boolean;
  /** Whether a rebooking at the same time is still possible (it has not started yet). */
  canRebook: boolean;
  /** Admin website: may change who the booking is for. */
  canEditBookedBy?: boolean;
}

export function ReservationDetailActions({ reservation, modifiable, canRebook, canEditBookedBy = true }: Props) {
  const [cancelOpen, setCancelOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  if (reservation.status === "CANCELLED") {
    // Deliberate rebooking flow: a NEW reservation with the same details, checked for conflicts again.
    if (!canRebook || !reservation.resource.isActive) return null;
    const query = new URLSearchParams({
      resourceId: reservation.resourceId,
      start: utcToZonedLocalInput(reservation.startTime, APP_TIME_ZONE),
      end: utcToZonedLocalInput(reservation.endTime, APP_TIME_ZONE),
    });
    return (
      <Button variant="outline" asChild>
        <Link href={`/reservations/new?${query}`}>
          <CalendarPlus aria-hidden /> Book again
        </Link>
      </Button>
    );
  }

  if (!modifiable) return null;

  return (
    <>
      <Button variant="outline" onClick={() => setEditOpen(true)}>
        <Pencil aria-hidden /> Edit details
      </Button>
      <Button variant="destructive" onClick={() => setCancelOpen(true)}>
        <XCircle aria-hidden /> Cancel reservation
      </Button>
      <EditReservationDialog
        reservation={reservation}
        open={editOpen}
        onOpenChange={setEditOpen}
        canEditBookedBy={canEditBookedBy}
      />
      <CancelReservationDialog reservation={reservation} open={cancelOpen} onOpenChange={setCancelOpen} />
    </>
  );
}
