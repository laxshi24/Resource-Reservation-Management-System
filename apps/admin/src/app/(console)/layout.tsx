import { requireSession } from "@rrms/web/features/auth/session";
import { AppHeader } from "@/components/layout/AppHeader";
import { AppSidebar } from "@/components/layout/AppSidebar";

/** Everything in the admin console requires an administrator session. */
export default async function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requireSession();
  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-background focus:px-3 focus:py-2 focus:shadow"
      >
        Skip to main content
      </a>
      <div className="flex min-h-svh">
        <AppSidebar user={user} />
        <div className="flex min-w-0 flex-1 flex-col">
          <AppHeader user={user} />
          <main id="main-content" className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            {children}
          </main>
        </div>
      </div>
    </>
  );
}
