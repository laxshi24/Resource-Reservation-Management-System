"use client";

import type { UserDto } from "@rrms/shared";
import { UserMenu } from "@rrms/web/components/auth/UserMenu";
import { CalendarRange } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@rrms/web/lib/utils";
import { APP_TIME_ZONE } from "@rrms/web/lib/format-date";
import { NAV_ITEMS, isNavItemActive } from "./nav-items";

export function Brand() {
  return (
    <Link href="/" className="flex items-center gap-2.5 rounded-md px-2 py-1 font-semibold tracking-tight">
      <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <CalendarRange className="size-4" aria-hidden />
      </span>
      <span className="leading-tight">
        RRMS
        <span className="block text-xs font-normal text-muted-foreground">Admin console</span>
      </span>
    </Link>
  );
}

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Main navigation" className="flex flex-col gap-1">
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const active = isNavItemActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
            )}
          >
            <Icon className="size-4" aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export function AppSidebar({ user }: { user: UserDto }) {
  return (
    <aside className="sticky top-0 hidden h-svh w-64 shrink-0 flex-col gap-6 border-r bg-sidebar px-3 py-5 lg:flex">
      <Brand />
      <SidebarNav />
      <div className="mt-auto space-y-3">
        <p className="px-3 text-xs text-muted-foreground">
          Times shown in <span className="font-medium text-foreground">{APP_TIME_ZONE}</span>
        </p>
        <UserMenu user={user} showName className="w-full justify-start" />
      </div>
    </aside>
  );
}
