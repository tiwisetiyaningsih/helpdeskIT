import { z } from "zod";

const strongPasswordSchema = z
  .string()
  .min(12, "Password minimal 12 karakter")
  .regex(/[a-z]/, "Password harus mengandung huruf kecil")
  .regex(/[A-Z]/, "Password harus mengandung huruf besar")
  .regex(/[0-9]/, "Password harus mengandung angka");

export const loginSchema = z.object({
  email: z.string().email("Email tidak valid"),
  password: z.string().min(1, "Password wajib diisi"),
});

export const registerSchema = z
  .object({
    nik: z
      .string()
      .min(1, "NIK wajib diisi")
      .trim(),

    registrationToken: z
      .string()
      .min(1, "Kode undangan wajib diisi")
      .trim(),

    email: z
      .string()
      .email("Email tidak valid")
      .trim()
      .toLowerCase(),

    password: strongPasswordSchema,

    confirmPassword: z
      .string()
      .min(1, "Konfirmasi password wajib diisi"),
  })
  .refine(
    (data) => data.password === data.confirmPassword,
    {
      message: "Konfirmasi password tidak sama",
      path: ["confirmPassword"],
    },
  );

export const updateProfileSchema = z.object({
  nama: z.string().min(1, "Nama lengkap wajib diisi").trim(),
  email: z.string().email("Email tidak valid").trim().toLowerCase(),
  jobTitle: z.string().trim().nullable().optional(),
  unitKerja: z.string().min(1, "Unit kerja wajib dipilih").trim(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;