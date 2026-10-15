"use client";

import type { ReservationDto } from "@rrms/shared";
import { Eye, MoreHorizontal, XCircle } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { CancelReservationDialog } from "./CancelReservationDialog";

export function ReservationRowActions({ reservation, cancellable }: { reservation: ReservationDto; cancellable: boolean }) {
  const [cancelOpen, setCancelOpen] = useState(false);
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label={`Actions for reservation of ${reservation.resource.name}`}>
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem asChild>
            <Link href={`/reservations/${reservation.id}`}>
              <Eye aria-hidden /> View details
            </Link>
          </DropdownMenuItem>
          {cancellable && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={() => setCancelOpen(true)}>
                <XCircle aria-hidden /> Cancel reservation
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      {cancellable && <CancelReservationDialog reservation={reservation} open={cancelOpen} onOpenChange={setCancelOpen} />}
    </>
  );
}
