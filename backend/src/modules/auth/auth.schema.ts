import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Email tidak valid"),
  password: z.string().min(6, "Password minimal 6 karakter"),
});

export const registerSchema = z
  .object({
    nik: z
      .string()
      .min(1, "NIK wajib diisi")
      .trim(),

    email: z
      .string()
      .email("Email tidak valid")
      .trim()
      .toLowerCase(),

    password: z
      .string()
      .min(6, "Password minimal 6 karakter"),

    confirmPassword: z
      .string()
      .min(6, "Konfirmasi password wajib diisi"),
  })
  .refine(
    (data) => data.password === data.confirmPassword,
    {
      message: "Konfirmasi password tidak sama",
      path: ["confirmPassword"],
    },
  );

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;