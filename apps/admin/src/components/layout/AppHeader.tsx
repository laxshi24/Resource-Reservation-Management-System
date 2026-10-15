"use client";

import type { UserDto } from "@rrms/shared";
import { UserMenu } from "@rrms/web/components/auth/UserMenu";
import { Menu } from "lucide-react";
import { useState } from "react";
import { Button } from "@rrms/web/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@rrms/web/components/ui/sheet";
import { APP_TIME_ZONE } from "@rrms/web/lib/format-date";
import { Brand, SidebarNav } from "./AppSidebar";

/** Top bar on small screens: brand + a slide-out navigation drawer. */
export function AppHeader({ user }: { user: UserDto }) {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur lg:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Open navigation menu">
            <Menu />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-4">
          <SheetHeader className="p-0">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <SheetDescription className="sr-only">Go to another section of the application</SheetDescription>
          </SheetHeader>
          <div className="flex flex-col gap-6">
            <Brand />
            <SidebarNav onNavigate={() => setOpen(false)} />
            <p className="px-3 text-xs text-muted-foreground">Times shown in {APP_TIME_ZONE}</p>
          </div>
        </SheetContent>
      </Sheet>
      <Brand />
      <UserMenu user={user} className="ml-auto" />
    </header>
  );
}
