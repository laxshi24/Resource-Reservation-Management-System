import { FIELD_LIMITS } from "@rrms/shared";
import { z } from "zod";

const { userName, email, password } = FIELD_LIMITS;

const emailField = z
  .string()
  .trim()
  .min(1, "Enter your email address")
  .max(email.max)
  .pipe(z.email({ error: "Enter a valid email address" }));

export const loginFormSchema = z.object({
  email: emailField,
  password: z.string().min(1, "Enter your password"),
});

/** Mirrors the backend rules (the API validates again). */
export const signupFormSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(userName.min, `Name must be at least ${userName.min} characters`)
      .max(userName.max, `Name must be at most ${userName.max} characters`),
    email: emailField,
    password: z
      .string()
      .min(password.min, `Use at least ${password.min} characters`)
      .max(password.max, `Use at most ${password.max} characters`)
      .regex(/[A-Za-z]/, "Include at least one letter")
      .regex(/\d/, "Include at least one number"),
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

export type LoginFormValues = z.infer<typeof loginFormSchema>;
export type SignupFormValues = z.infer<typeof signupFormSchema>;
