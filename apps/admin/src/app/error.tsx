"use client";

import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { startTransition, useEffect } from "react";
import { ErrorMessage } from "@rrms/web/components/shared/ErrorMessage";
import { Button } from "@rrms/web/components/ui/button";

/** Error boundary for every page: shows a friendly message and a retry button. */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const router = useRouter();

  useEffect(() => {
    console.error(error);
  }, [error]);

  const retry = () =>
    startTransition(() => {
      router.refresh(); // re-run the Server Component data fetch
      reset();
    });

  return (
    <div className="mx-auto max-w-xl py-10">
      <ErrorMessage
        title="We couldn't load this page"
        message="The server could not be reached or returned an unexpected error. Check that the backend is running, then try again."
        action={
          <Button variant="outline" size="sm" onClick={retry}>
            <RefreshCw aria-hidden /> Try again
          </Button>
        }
      />
    </div>
  );
}
