"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@rrms/web/components/ui/button";
import { Input } from "@rrms/web/components/ui/input";
import { Label } from "@rrms/web/components/ui/label";

/** Picks the day the dashboard summarises (stored in the URL as ?date=YYYY-MM-DD). */
export function DashboardDatePicker({ date, today }: { date: string; today: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const go = (value: string) =>
    startTransition(() => router.replace(value && value !== today ? `/?date=${value}` : "/", { scroll: false }));

  return (
    <div className="flex items-end gap-2">
      <div className="space-y-1.5">
        <Label htmlFor="dashboard-date">Selected day</Label>
        <Input id="dashboard-date" type="date" value={date} onChange={(event) => go(event.target.value)} className="w-40" />
      </div>
      {date !== today && (
        <Button variant="outline" onClick={() => go(today)}>
          Today
        </Button>
      )}
      {isPending && <Loader2 className="mb-2 size-4 animate-spin text-muted-foreground" aria-label="Loading" />}
    </div>
  );
}
