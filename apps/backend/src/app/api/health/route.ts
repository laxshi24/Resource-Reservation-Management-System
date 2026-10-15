import type { HealthDto } from "@rrms/shared";
import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** Liveness + database connectivity check. Returns 503 when PostgreSQL is unreachable. */
export async function GET() {
  let database: HealthDto["database"] = "up";
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (error) {
    database = "down";
    logger.error("Health check: database unreachable", {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  const data: HealthDto = {
    status: database === "up" ? "ok" : "degraded",
    database,
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.round(process.uptime()),
  };
  return NextResponse.json({ success: database === "up", data }, { status: database === "up" ? 200 : 503 });
}
