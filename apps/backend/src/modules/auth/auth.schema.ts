import { FIELD_LIMITS } from "@rrms/shared";
import { z } from "zod";

const { userName, email, password } = FIELD_LIMITS;

const emailSchema = z
  .string({ error: "Email is required" })
  .trim()
  .toLowerCase()
  .max(email.max, `Email must be at most ${email.max} characters`)
  .pipe(z.email({ error: "Enter a valid email address" }));

export const signupSchema = z.strictObject({
  name: z
    .string({ error: "Name is required" })
    .trim()
    .min(userName.min, `Name must be at least ${userName.min} characters`)
    .max(userName.max, `Name must be at most ${userName.max} characters`),
  email: emailSchema,
  password: z
    .string({ error: "Password is required" })
    .min(password.min, `Password must be at least ${password.min} characters`)
    .max(password.max, `Password must be at most ${password.max} characters`)
    .regex(/[A-Za-z]/, "Password must contain a letter")
    .regex(/\d/, "Password must contain a number"),});

export const loginSchema = z.strictObject({
  email: emailSchema,
  password: z.string({ error: "Password is required" }).min(1, "Password is required").max(password.max),
});

export type SignupInput = z.output<typeof signupSchema>;
export type LoginInput = z.output<typeof loginSchema>;
