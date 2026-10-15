import { CalendarRange } from "lucide-react";

interface AuthCardProps {
  title: string;
  description: string;
  /** Small label above the title, e.g. "Admin console". */
  eyebrow: string;
  children: React.ReactNode;
  footer: React.ReactNode;
  tone?: "user" | "admin";
}

/** Centered card layout shared by the login and signup pages of both websites. */
export function AuthCard({ title, description, eyebrow, children, footer, tone = "user" }: AuthCardProps) {
  return (
    <div className="flex min-h-svh items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-2.5">
          <span
            className={
              tone === "admin"
                ? "flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground"
                : "flex size-9 items-center justify-center rounded-lg bg-indigo-600 text-white"
            }
          >
            <CalendarRange className="size-5" aria-hidden />
          </span>
          <span className="leading-tight font-semibold">
            RRMS
            <span className="block text-xs font-normal text-muted-foreground">{eyebrow}</span>
          </span>
        </div>
        <div className="rounded-xl border bg-background p-6 shadow-sm sm:p-8">
          <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-1 mb-6 text-sm text-muted-foreground">{description}</p>
          {children}
        </div>
        <p className="mt-6 text-center text-sm text-muted-foreground">{footer}</p>
      </div>
    </div>
  );
}
