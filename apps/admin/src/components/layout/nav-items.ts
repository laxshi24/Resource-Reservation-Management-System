import { Boxes, CalendarCheck, CalendarSearch, LayoutDashboard, Users, type LucideIcon } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/resources", label: "Resources", icon: Boxes },
  { href: "/reservations", label: "Reservations", icon: CalendarCheck },
  { href: "/availability", label: "Availability", icon: CalendarSearch },
  { href: "/users", label: "Users", icon: Users },
];

export function isNavItemActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}
