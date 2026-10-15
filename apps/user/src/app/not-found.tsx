import { SearchX } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@rrms/web/components/shared/EmptyState";
import { Button } from "@rrms/web/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl py-10">
      <EmptyState
        icon={SearchX}
        title="Page not found"
        description="The page or record you are looking for does not exist or may have been removed."
        action={
          <Button asChild variant="outline">
            <Link href="/">Back to dashboard</Link>
          </Button>
        }
      />
    </div>
  );
}
