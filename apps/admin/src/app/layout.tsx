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
  title: { default: "RRMS Admin", template: "%s · RRMS Admin" },
  description: "Administer shared resources and reservations.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={cn("font-sans", geist.variable)}>
      <body className="min-h-svh bg-muted/40 antialiased">
        <TooltipProvider>
          {children}
          <Toaster theme="light" richColors closeButton position="top-right" />
        </TooltipProvider>
      </body>
    </html>
  );
}
