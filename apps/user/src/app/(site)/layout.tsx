import { requireSession } from "@rrms/web/features/auth/session";
import { APP_TIME_ZONE } from "@rrms/web/lib/format-date";
import { SiteHeader } from "@/components/layout/SiteHeader";

/** All user-website pages require a logged-in account. */
export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requireSession();
  return (
    <div className="flex min-h-svh flex-col">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-background focus:px-3 focus:py-2 focus:shadow"
      >
        Skip to main content
      </a>
      <SiteHeader user={user} />
      <main id="main-content" className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 lg:py-10">
        {children}
      </main>
      <footer className="border-t bg-background">
        <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-4 text-xs text-muted-foreground sm:flex-row sm:justify-between sm:px-6">
          <span>Resource Reservation Management System</span>
          <span>All times are shown in {APP_TIME_ZONE}</span>
        </div>
      </footer>
    </div>
  );
}
