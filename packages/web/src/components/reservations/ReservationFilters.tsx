"use client";

import type { ResourceDto } from "@rrms/shared";
import { Loader2, Search, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";

const ALL = "all";
const FILTER_KEYS = ["search", "resourceId", "status", "timeframe", "fromDate", "toDate"];

interface ReservationFiltersProps {
  resources: Pick<ResourceDto, "id" | "name" | "isActive">[];
  /** Effective timeframe after defaults are applied on the server. */
  timeframe: "upcoming" | "past" | "all";
}

export function ReservationFilters({ resources, timeframe }: ReservationFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState(searchParams.get("search") ?? "");

  const updateParams = (changes: Record<string, string | undefined>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (!value || (value === ALL && key !== "timeframe")) params.delete(key);
      else params.set(key, value);
    }
    params.delete("page");
    const query = params.toString();
    startTransition(() => router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false }));
  };

  useEffect(() => {
    if (search.trim() === (searchParams.get("search") ?? "")) return;
    const timer = setTimeout(() => updateParams({ search: search.trim() }), 350);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const hasFilters = FILTER_KEYS.some((key) => searchParams.get(key));

  return (
    <div className="mb-4 grid gap-3 rounded-lg border bg-background p-3 sm:grid-cols-2 lg:grid-cols-[minmax(12rem,1fr)_repeat(3,minmax(9rem,11rem))] xl:grid-cols-[minmax(12rem,1fr)_repeat(5,minmax(8rem,10rem))_auto]">
      <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
        <Label htmlFor="reservation-search">Search</Label>
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            id="reservation-search"
            type="search"
            placeholder="Booker, purpose or resource"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="pl-8"
            maxLength={100}
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="reservation-resource">Resource</Label>
        <Select value={searchParams.get("resourceId") ?? ALL} onValueChange={(value) => updateParams({ resourceId: value })}>
          <SelectTrigger id="reservation-resource" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All resources</SelectItem>
            {resources.map((resource) => (
              <SelectItem key={resource.id} value={resource.id}>
                {resource.name}
                {!resource.isActive && " (inactive)"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="reservation-status">Status</Label>
        <Select value={searchParams.get("status") ?? ALL} onValueChange={(value) => updateParams({ status: value })}>
          <SelectTrigger id="reservation-status" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All statuses</SelectItem>
            <SelectItem value="CONFIRMED">Confirmed</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="reservation-timeframe">Timeframe</Label>
        <Select value={timeframe} onValueChange={(value) => updateParams({ timeframe: value })}>
          <SelectTrigger id="reservation-timeframe" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="upcoming">Upcoming</SelectItem>
            <SelectItem value="past">Past</SelectItem>
            <SelectItem value="all">Any time</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="reservation-from">From date</Label>
        <Input
          id="reservation-from"
          type="date"
          value={searchParams.get("fromDate") ?? ""}
          max={searchParams.get("toDate") ?? undefined}
          onChange={(event) => updateParams({ fromDate: event.target.value })}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="reservation-to">To date</Label>
        <Input
          id="reservation-to"
          type="date"
          value={searchParams.get("toDate") ?? ""}
          min={searchParams.get("fromDate") ?? undefined}
          onChange={(event) => updateParams({ toDate: event.target.value })}
        />
      </div>
      {(hasFilters || isPending) && (
      <div className="flex h-8 items-center gap-2 self-end">
        {hasFilters && (
          <Button
            variant="ghost"
            onClick={() => {
              setSearch("");
              updateParams(Object.fromEntries(FILTER_KEYS.map((key) => [key, undefined])));
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
