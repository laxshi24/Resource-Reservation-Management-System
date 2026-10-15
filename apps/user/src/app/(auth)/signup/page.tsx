import { AuthCard } from "@rrms/web/components/auth/AuthCard";
import { SignupForm } from "@rrms/web/components/auth/SignupForm";
import { redirectIfLoggedIn } from "@rrms/web/features/auth/session";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Create account" };

export default async function SignupPage() {
  await redirectIfLoggedIn();
  return (
    <AuthCard
      eyebrow="Resource reservations"
      title="Create your account"
      description="Book shared resources in seconds - no more double bookings."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Log in
          </Link>
        </>
      }
    >
      <SignupForm />
    </AuthCard>
  );
}
