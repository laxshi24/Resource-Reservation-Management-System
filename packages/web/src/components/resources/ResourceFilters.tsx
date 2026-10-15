"use client";

import type { ResourceCategoryDto } from "@rrms/shared";
import { Loader2, Search, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";

const ALL = "all";

/** Search + filters stored in the URL, so results are shareable and survive refresh. */
export function ResourceFilters({
  categories,
  showStatus = true,
}: {
  categories: ResourceCategoryDto[];
  /** The status filter only makes sense for administrators (users only see active resources). */
  showStatus?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState(searchParams.get("search") ?? "");

  const updateParams = (changes: Record<string, string | undefined>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (!value || value === ALL) params.delete(key);
      else params.set(key, value);
    }
    params.delete("page"); // any filter change starts from the first page
    const query = params.toString();
    startTransition(() => router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false }));
  };

  // Debounce typing so we do not hit the API on every keystroke.
  useEffect(() => {
    const current = searchParams.get("search") ?? "";
    if (search.trim() === current) return;
    const timer = setTimeout(() => updateParams({ search: search.trim() }), 350);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const hasFilters = Boolean(searchParams.get("search") || searchParams.get("categoryId") || searchParams.get("status"));

  return (
    <div className="mb-4 flex flex-col gap-3 rounded-lg border bg-background p-3 sm:flex-row sm:flex-wrap sm:items-end">
      <div className="flex-1 space-y-1.5 sm:min-w-56">
        <Label htmlFor="resource-search">Search</Label>
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            id="resource-search"
            type="search"
            placeholder="Name, location or description"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="pl-8"
            maxLength={100}
          />
        </div>
      </div>
      <div className="space-y-1.5 sm:w-48">
        <Label htmlFor="resource-category">Category</Label>
        <Select value={searchParams.get("categoryId") ?? ALL} onValueChange={(value) => updateParams({ categoryId: value })}>
          <SelectTrigger id="resource-category" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All categories</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {showStatus && (
      <div className="space-y-1.5 sm:w-40">
        <Label htmlFor="resource-status">Status</Label>
        <Select value={searchParams.get("status") ?? ALL} onValueChange={(value) => updateParams({ status: value })}>
          <SelectTrigger id="resource-status" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>
      )}
      {(hasFilters || isPending) && (
      <div className="flex h-8 items-center gap-2">
        {hasFilters && (
          <Button
            variant="ghost"
            onClick={() => {
              setSearch("");
              updateParams({ search: undefined, categoryId: undefined, status: undefined });
            }}
          >
            <X aria-hidden /> Clear
          </Button>
        )}
        {isPending && <Loader2 className="size-4 animate-spin text-muted-foreground" aria-label="Updating results" />}
      </div>
      )}
    </div>
  );
}
