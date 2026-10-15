import { AuthCard } from "@rrms/web/components/auth/AuthCard";
import { LoginForm } from "@rrms/web/components/auth/LoginForm";
import { redirectIfLoggedIn } from "@rrms/web/features/auth/session";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Admin login" };

/** The admin website has login only - the administrator account is configured on the server. */
export default async function AdminLoginPage() {
  await redirectIfLoggedIn();
  return (
    <AuthCard
      tone="admin"
      eyebrow="Admin console"
      title="Administrator login"
      description="Manage resources, reservations and users."
      footer="Restricted area. Only the configured administrator account can log in."
    >
      <LoginForm submitLabel="Log in to admin console" />
    </AuthCard>
  );
}
