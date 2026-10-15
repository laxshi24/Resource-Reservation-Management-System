import type { DashboardDto } from "@rrms/shared";
import Link from "next/link";

/**
 * Active resources per category as a single-series horizontal bar list.
 * One hue (magnitude), values in text ink, rounded data ends, native hover
 * title per bar; the numbers are always printed so nothing relies on colour.
 */
export function CategoryBreakdown({ categories }: { categories: DashboardDto["categoryBreakdown"] }) {
  const max = Math.max(1, ...categories.map((category) => category.activeResources));

  if (categories.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">No categories yet.</p>;
  }

  return (
    <ul className="space-y-3">
      {categories.map((category) => {
        const width = (category.activeResources / max) * 100;
        return (
          <li key={category.categoryId}>
            <Link
              href={`/resources?categoryId=${category.categoryId}&status=active`}
              className="group block rounded-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              title={`${category.name}: ${category.activeResources} active resource${category.activeResources === 1 ? "" : "s"}`}
            >
              <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
                <span className="group-hover:underline">{category.name}</span>
                <span className="font-medium">{category.activeResources}</span>
              </div>
              <div className="h-2 rounded-full bg-muted" aria-hidden>
                <div
                  className="h-2 rounded-full bg-[oklch(0.55_0.15_255)] transition-[width]"
                  style={{ width: `${width}%`, minWidth: category.activeResources > 0 ? "0.5rem" : 0 }}
                />
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
