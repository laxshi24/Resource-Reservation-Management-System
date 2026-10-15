"use client";

import type { PaginationMeta } from "@rrms/shared";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Button } from "../ui/button";

/** Previous/next pagination that keeps every other filter in the URL. */
export function Pagination({ pagination, itemLabel = "items" }: { pagination: PaginationMeta; itemLabel?: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { page, pageSize, totalItems, totalPages } = pagination;

  if (totalItems === 0) return null;

  const hrefFor = (target: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (target <= 1) params.delete("page");
    else params.set("page", String(target));
    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  };

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalItems);

  return (
    <nav aria-label="Pagination" className="mt-4 flex flex-col items-center justify-between gap-3 text-sm sm:flex-row">
      <p className="text-muted-foreground">
        Showing <span className="font-medium text-foreground">{from}</span>–
        <span className="font-medium text-foreground">{to}</span> of{" "}
        <span className="font-medium text-foreground">{totalItems}</span> {itemLabel}
      </p>
      <div className="flex items-center gap-2">
        {page > 1 ? (
          <Button variant="outline" size="sm" asChild>
            <Link href={hrefFor(page - 1)}>
              <ChevronLeft aria-hidden /> Previous
            </Link>
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled>
            <ChevronLeft aria-hidden /> Previous
          </Button>
        )}
        <span className="px-1 text-muted-foreground">
          Page {page} of {totalPages}
        </span>
        {page < totalPages ? (
          <Button variant="outline" size="sm" asChild>
            <Link href={hrefFor(page + 1)}>
              Next <ChevronRight aria-hidden />
            </Link>
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled>
            Next <ChevronRight aria-hidden />
          </Button>
        )}
      </div>
    </nav>
  );
}
