"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { FIELD_LIMITS } from "@rrms/shared";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { authApi } from "../../features/auth/api";
import { signupFormSchema, type SignupFormValues } from "../../features/auth/auth-form-schemas";
import { ApiClientError, getErrorMessage } from "../../lib/api-client";
import { ErrorMessage } from "../shared/ErrorMessage";
import { Button } from "../ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "../ui/field";
import { Input } from "../ui/input";

const SERVER_FIELDS = new Set<keyof SignupFormValues>(["name", "email", "password"]);

/** Signup form for the user website (the admin website has no signup). */
export function SignupForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupFormSchema),
    defaultValues: { name: "", email: "", password: "", confirmPassword: "" },
    mode: "onSubmit",
  });
  const { register, handleSubmit, formState, setError: setFieldError } = form;
  const { errors, isSubmitting } = formState;

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    try {
      const { data } = await authApi.signup({ name: values.name, email: values.email, password: values.password });
      toast.success(`Welcome, ${data.user.name}! Your account is ready.`);
      router.replace("/");
      router.refresh();
    } catch (caught) {
      if (caught instanceof ApiClientError) {
        if (caught.code === "EMAIL_TAKEN") return setFieldError("email", { message: caught.message }, { shouldFocus: true });
        const fieldErrors = caught.details.filter((d) => SERVER_FIELDS.has(d.path as keyof SignupFormValues));
        for (const detail of fieldErrors) setFieldError(detail.path as keyof SignupFormValues, { message: detail.message });
        if (fieldErrors.length) return;
      }
      setError(getErrorMessage(caught));
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      {error && <ErrorMessage title="Could not create your account" message={error} />}
      <FieldGroup>
        <Field data-invalid={Boolean(errors.name)}>
          <FieldLabel htmlFor="name">Full name</FieldLabel>
          <Input id="name" autoComplete="name" maxLength={FIELD_LIMITS.userName.max} aria-invalid={Boolean(errors.name)} {...register("name")} />
          <FieldError errors={[errors.name]} />
        </Field>
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
            autoComplete="new-password"
            aria-invalid={Boolean(errors.password)}
            aria-describedby="password-help"
            {...register("password", { deps: ["confirmPassword"] })}
          />
          <FieldDescription id="password-help">
            At least {FIELD_LIMITS.password.min} characters, with a letter and a number.
          </FieldDescription>
          <FieldError errors={[errors.password]} />
        </Field>
        <Field data-invalid={Boolean(errors.confirmPassword)}>
          <FieldLabel htmlFor="confirmPassword">Confirm password</FieldLabel>
          <Input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            aria-invalid={Boolean(errors.confirmPassword)}
            {...register("confirmPassword")}
          />
          <FieldError errors={[errors.confirmPassword]} />
        </Field>
      </FieldGroup>
      <Button type="submit" className="h-9 w-full" disabled={isSubmitting}>
        {isSubmitting && <Loader2 className="animate-spin" aria-hidden />}
        Create account
      </Button>
    </form>
  );
}
