import { z } from 'zod';

export const identifierSchema = z.string().refine(val => {
  return /^\+?\d{10,15}$/.test(val) || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
}, "Must be a valid email or E.164 phone number (e.g. +919876543210 or 9876543210)");

export const registerSchema = z.object({
  identifier: identifierSchema,
  password: z.string()
    .min(8, "Password is too weak. Please use at least 8 characters.")
    .regex(/^[a-zA-Z0-9]+$/, "Password can only contain letters and numbers (no special characters or spaces)"),
  displayName: z.string().min(2),
  username: z.string()
    .min(3, "Username must be at least 3 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores")
    .optional(),
  agreedToPrivacyPolicy: z.boolean().optional() // Found this in E2E tests
});

export const loginSchema = z.object({
  identifier: identifierSchema,
  password: z.string(),
});

export type RegisterRequest = z.infer<typeof registerSchema>;
export type LoginRequest = z.infer<typeof loginSchema>;
