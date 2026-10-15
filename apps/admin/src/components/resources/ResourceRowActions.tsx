"use client";

import type { ResourceDto } from "@rrms/shared";
import { CalendarPlus, Eye, MoreHorizontal, Pencil, Power } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@rrms/web/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@rrms/web/components/ui/dropdown-menu";
import { ToggleResourceActiveDialog } from "./ToggleResourceActiveDialog";

export function ResourceRowActions({ resource }: { resource: ResourceDto }) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${resource.name}`}>
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem asChild>
            <Link href={`/resources/${resource.id}`}>
              <Eye aria-hidden /> View details
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={`/resources/${resource.id}/edit`}>
              <Pencil aria-hidden /> Edit
            </Link>
          </DropdownMenuItem>
          {resource.isActive && (
            <DropdownMenuItem asChild>
              <Link href={`/reservations/new?resourceId=${resource.id}`}>
                <CalendarPlus aria-hidden /> Book
              </Link>
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant={resource.isActive ? "destructive" : "default"}
            onSelect={() => setConfirmOpen(true)}
          >
            <Power aria-hidden /> {resource.isActive ? "Deactivate" : "Activate"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ToggleResourceActiveDialog resource={resource} open={confirmOpen} onOpenChange={setConfirmOpen} />
    </>
  );
}
