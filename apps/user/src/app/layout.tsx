import { Toaster } from "@rrms/web/components/ui/sonner";
import { TooltipProvider } from "@rrms/web/components/ui/tooltip";
import { cn } from "@rrms/web/lib/utils";
import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

// Every page shows live data from the backend, so never prerender at build time.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { default: "RRMS · Book shared resources", template: "%s · RRMS" },
  description: "Find and book meeting rooms, projectors, workstations and vehicles without double bookings.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={cn("font-sans", geist.variable)}>
      <body className="min-h-svh bg-slate-50 antialiased">
        <TooltipProvider>
          {children}
          <Toaster theme="light" richColors closeButton position="top-right" />
        </TooltipProvider>
      </body>
    </html>
  );
}
