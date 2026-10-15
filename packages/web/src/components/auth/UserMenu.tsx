"use client";

import type { UserDto } from "@rrms/shared";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { authApi } from "../../features/auth/api";
import { getErrorMessage } from "../../lib/api-client";
import { cn } from "../../lib/utils";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");
}

/** Avatar button with the user's name/email and a logout action. */
export function UserMenu({ user, className, showName = false }: { user: UserDto; className?: string; showName?: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function logout() {
    setPending(true);
    try {
      await authApi.logout();
      toast.success("You have been logged out");
      router.replace("/login");
      router.refresh();
    } catch (error) {
      toast.error("Could not log out", { description: getErrorMessage(error) });
    } finally {
      setPending(false);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className={cn("h-9 gap-2 px-1.5", className)} aria-label={`Account menu for ${user.name}`}>
          <span className="flex size-7 items-center justify-center rounded-full bg-muted text-xs font-semibold">
            {initials(user.name)}
          </span>
          {showName && <span className="max-w-32 truncate text-sm font-medium">{user.name}</span>}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <p className="truncate text-sm font-medium">{user.name}</p>
          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          {user.role === "ADMIN" && <p className="mt-1 text-xs text-muted-foreground">Administrator</p>}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void logout()} disabled={pending}>
          <LogOut aria-hidden /> Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
