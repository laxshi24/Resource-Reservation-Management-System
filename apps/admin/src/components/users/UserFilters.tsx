"use client";

import { Input } from "@rrms/web/components/ui/input";
import { Label } from "@rrms/web/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@rrms/web/components/ui/select";
import { Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export function UserFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") ?? "");

  const update = (key: string, value: string | undefined) => {
    const params = new URLSearchParams(searchParams.toString());
    if (!value || value === "all") params.delete(key);
    else params.set(key, value);
    params.delete("page");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  useEffect(() => {
    if (search.trim() === (searchParams.get("search") ?? "")) return;
    const timer = setTimeout(() => update("search", search.trim()), 350);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  return (
    <div className="mb-4 flex flex-col gap-3 rounded-lg border bg-background p-3 sm:flex-row sm:items-end">
      <div className="flex-1 space-y-1.5">
        <Label htmlFor="user-search">Search</Label>
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input id="user-search" type="search" placeholder="Name or email" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
        </div>
      </div>
      <div className="space-y-1.5 sm:w-40">
        <Label htmlFor="user-role">Role</Label>
        <Select value={searchParams.get("role") ?? "all"} onValueChange={(value) => update("role", value)}>
          <SelectTrigger id="user-role" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            <SelectItem value="USER">Users</SelectItem>
            <SelectItem value="ADMIN">Admins</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
