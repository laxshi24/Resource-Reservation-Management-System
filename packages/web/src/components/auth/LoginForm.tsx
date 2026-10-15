"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { authApi } from "../../features/auth/api";
import { loginFormSchema, type LoginFormValues } from "../../features/auth/auth-form-schemas";
import { getErrorMessage } from "../../lib/api-client";
import { ErrorMessage } from "../shared/ErrorMessage";
import { Button } from "../ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "../ui/field";
import { Input } from "../ui/input";

export function LoginForm({ submitLabel = "Log in" }: { submitLabel?: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: { email: "", password: "" },
  });
  const { register, handleSubmit, formState } = form;
  const { errors, isSubmitting } = formState;

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    try {
      const { data } = await authApi.login(values);
      toast.success(`Welcome back, ${data.user.name}`);
      router.replace("/");
      router.refresh();
    } catch (caught) {
      setError(getErrorMessage(caught));
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      {error && <ErrorMessage title="Could not log in" message={error} />}
      <FieldGroup>
        <Field data-invalid={Boolean(errors.email)}>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input id="email" type="email" autoComplete="email" aria-invalid={Boolean(errors.email)} {...register("email")} />
          <FieldError errors={[errors.email]} />
        </Field>
        <Field data-invalid={Boolean(errors.password)}>
          <FieldLabel htmlFor="password">Password</FieldLabel>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            aria-invalid={Boolean(errors.password)}
            {...register("password")}
          />
          <FieldError errors={[errors.password]} />
        </Field>
      </FieldGroup>
      <Button type="submit" className="h-9 w-full" disabled={isSubmitting}>
        {isSubmitting && <Loader2 className="animate-spin" aria-hidden />}
        {submitLabel}
      </Button>
    </form>
  );
}
