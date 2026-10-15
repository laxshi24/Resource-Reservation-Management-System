import { NextResponse } from "next/server";

/**
 * GET / - this app is an API only (no web pages). Opening the base URL in a
 * browser shows where the endpoints are instead of a bare 404.
 */
export function GET() {
  return NextResponse.json({
    success: true,
    data: {
      name: "Resource Reservation Management System API",
      websites: (process.env.FRONTEND_ORIGIN ?? "http://localhost:3000,http://localhost:3001").split(","),
      documentation: "docs/api-documentation.md",
      endpoints: [
        "GET    /api/health",
        "POST   /api/auth/signup",
        "POST   /api/auth/login",
        "POST   /api/auth/logout",
        "GET    /api/auth/me",
        "GET    /api/me/dashboard",
        "GET    /api/users",
        "GET    /api/dashboard",
        "GET    /api/resource-categories",
        "GET    /api/resources",
        "POST   /api/resources",
        "GET    /api/resources/:id",
        "PATCH  /api/resources/:id",
        "DELETE /api/resources/:id",
        "GET    /api/reservations",
        "POST   /api/reservations",
        "GET    /api/reservations/:id",
        "PATCH  /api/reservations/:id",
        "POST   /api/reservations/:id/cancel",
        "GET    /api/reservations/availability",
      ],
    },
  });
}
