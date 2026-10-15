import { AuthCard } from "@rrms/web/components/auth/AuthCard";
import { LoginForm } from "@rrms/web/components/auth/LoginForm";
import { redirectIfLoggedIn } from "@rrms/web/features/auth/session";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage() {
  await redirectIfLoggedIn();
  return (
    <AuthCard
      eyebrow="Resource reservations"
      title="Welcome back"
      description="Log in to book rooms, equipment and vehicles."
      footer={
        <>
          New here?{" "}
          <Link href="/signup" className="font-medium text-primary hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <LoginForm />
    </AuthCard>
  );
}
