"use client";

import type { UserDto } from "@rrms/shared";
import { UserMenu } from "@rrms/web/components/auth/UserMenu";
import { Button } from "@rrms/web/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@rrms/web/components/ui/sheet";
import { cn } from "@rrms/web/lib/utils";
import { CalendarPlus, CalendarRange, Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/resources", label: "Resources" },
  { href: "/availability", label: "Availability" },
  { href: "/reservations", label: "My bookings" },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  if (href === "/reservations") return pathname === "/reservations" || /^\/reservations\/(?!new)/.test(pathname);
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Top navigation for the user website (desktop links, mobile drawer). */
export function SiteHeader({ user }: { user: UserDto }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const links = (onNavigate?: () => void, vertical = false) =>
    NAV.map(({ href, label }) => {
      const active = isActive(pathname, href);
      return (
        <Link
          key={href}
          href={href}
          onClick={onNavigate}
          aria-current={active ? "page" : undefined}
          className={cn(
            "rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
            active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
            vertical && "block",
          )}
        >
          {label}
        </Link>
      );
    });

  return (
    <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <CalendarRange className="size-4" aria-hidden />
          </span>
          RRMS
        </Link>
        <nav aria-label="Main navigation" className="hidden items-center gap-1 md:flex">
          {links()}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Button asChild className="hidden sm:inline-flex">
            <Link href="/reservations/new">
              <CalendarPlus aria-hidden /> Book now
            </Link>
          </Button>
          <UserMenu user={user} />
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open navigation menu">
                <Menu />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72 p-4">
              <SheetHeader className="p-0">
                <SheetTitle>Menu</SheetTitle>
                <SheetDescription className="sr-only">Go to another section</SheetDescription>
              </SheetHeader>
              <nav aria-label="Mobile navigation" className="mt-2 flex flex-col gap-1">
                {links(() => setOpen(false), true)}
              </nav>
              <Button asChild className="mt-4 w-full">
                <Link href="/reservations/new" onClick={() => setOpen(false)}>
                  <CalendarPlus aria-hidden /> Book now
                </Link>
              </Button>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
