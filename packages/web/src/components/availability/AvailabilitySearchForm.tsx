"use client";

import { dateInZone, utcToZonedLocalInput, zonedLocalToUtcIso, type ResourceCategoryDto } from "@rrms/shared";
import { Loader2, Search } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { APP_TIME_ZONE } from "../../lib/format-date";

const ALL = "all";

interface Props {
  categories: ResourceCategoryDto[];
  initial: { start: string; end: string; categoryId?: string };
}

/** Adds whole days to a "YYYY-MM-DD" calendar date. */
function addDays(date: string, days: number) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function presets() {
  const now = new Date();
  const hourLocal = `${utcToZonedLocalInput(now, APP_TIME_ZONE).slice(0, 13)}:00`;
  const nextHour = new Date(new Date(zonedLocalToUtcIso(hourLocal, APP_TIME_ZONE)!).getTime() + 3_600_000);
  const tomorrow = addDays(dateInZone(now, APP_TIME_ZONE), 1);
  return [
    { label: "Next hour", start: utcToZonedLocalInput(nextHour, APP_TIME_ZONE), end: utcToZonedLocalInput(new Date(nextHour.getTime() + 3_600_000), APP_TIME_ZONE) },
    { label: "Tomorrow morning", start: `${tomorrow}T09:00`, end: `${tomorrow}T12:00` },
    { label: "Tomorrow afternoon", start: `${tomorrow}T13:00`, end: `${tomorrow}T17:00` },
    { label: "All day tomorrow", start: `${tomorrow}T00:00`, end: `${addDays(tomorrow, 1)}T00:00` },
  ];
}

export function AvailabilitySearchForm({ categories, initial }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [start, setStart] = useState(initial.start);
  const [end, setEnd] = useState(initial.end);
  const [categoryId, setCategoryId] = useState(initial.categoryId ?? ALL);
  const [error, setError] = useState<string | null>(null);

  function search(next: { start: string; end: string; categoryId: string }) {
    const startIso = zonedLocalToUtcIso(next.start, APP_TIME_ZONE);
    const endIso = zonedLocalToUtcIso(next.end, APP_TIME_ZONE);
    if (!startIso || !endIso) return setError("Enter a valid start and end date and time.");
    if (endIso <= startIso) return setError("End time must be later than start time.");
    setError(null);
    const params = new URLSearchParams({ start: next.start, end: next.end });
    if (next.categoryId !== ALL) params.set("categoryId", next.categoryId);
    startTransition(() => router.push(`${pathname}?${params}`, { scroll: false }));
  }

  return (
    <form
      className="mb-6 space-y-3 rounded-lg border bg-background p-4"
      onSubmit={(event) => {
        event.preventDefault();
        search({ start, end, categoryId });
      }}
      noValidate
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_14rem_auto] lg:items-end">
        <div className="space-y-1.5">
          <Label htmlFor="availability-start">From</Label>
          <Input id="availability-start" type="datetime-local" step={300} value={start} onChange={(e) => setStart(e.target.value)} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="availability-end">To</Label>
          <Input id="availability-end" type="datetime-local" step={300} min={start} value={end} onChange={(e) => setEnd(e.target.value)} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="availability-category">Category</Label>
          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger id="availability-category" className="w-full">
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
        <Button type="submit" disabled={isPending} className="sm:col-span-2 lg:col-span-1">
          {isPending ? <Loader2 className="animate-spin" aria-hidden /> : <Search aria-hidden />}
          Check availability
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted-foreground">Quick picks:</span>
        {presets().map((preset) => (
          <Button
            key={preset.label}
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setStart(preset.start);
              setEnd(preset.end);
              search({ start: preset.start, end: preset.end, categoryId });
            }}
          >
            {preset.label}
          </Button>
        ))}
      </div>
    </form>
  );
}
