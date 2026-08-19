import { z } from "zod";

export const createEmployeeSchema = z.object({
  nik: z.string().min(1, "NIK wajib diisi"),
  nama: z.string().min(1, "Nama wajib diisi"),
  jabatan: z.string().min(1, "Jabatan wajib diisi"),
  unitKerja: z.string().min(1, "Unit kerja wajib diisi"),
  jobTitle: z.string().optional(),
  isActive: z.boolean().optional(),
});

export const updateEmployeeSchema = createEmployeeSchema.partial();

export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;