import { prisma } from "../../config/prisma";
import type {
  CreateEmployeeInput,
  UpdateEmployeeInput,
} from "./employee.schema";

export const employeeRepository = {
  findAll() {
    return prisma.employee.findMany({
      orderBy: {
        createdAt: "desc",
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            isActive: true,
            role: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });
  },


  async findById(id: number) {
    return prisma.employee.findUnique({
      where: {
        id,
      },
      include: {
        user: true,
      },
    });
  },

  findByNik(nik: string) {
    return prisma.employee.findUnique({
      where: {
        nik,
      },
    });
  },

  create(data: CreateEmployeeInput) {
    return prisma.employee.create({
      data: {
        nik: data.nik,
        nama: data.nama,
        jabatan: data.jabatan,
        unitKerja: data.unitKerja,
        jobTitle: data.jobTitle || null,
        isActive: data.isActive ?? true,
      },
    });
  },

  update(id: number, data: UpdateEmployeeInput) {
    return prisma.employee.update({
      where: {
        id,
      },
      data: {
        ...(data.nik !== undefined && { nik: data.nik }),
        ...(data.nama !== undefined && { nama: data.nama }),
        ...(data.jabatan !== undefined && { jabatan: data.jabatan }),
        ...(data.unitKerja !== undefined && {
          unitKerja: data.unitKerja,
        }),
        ...(data.jobTitle !== undefined && {
          jobTitle: data.jobTitle || null,
        }),
        ...(data.isActive !== undefined && {
          isActive: data.isActive,
        }),
      },
    });
  },

  delete(id: number) {
    return prisma.employee.delete({
      where: {
        id,
      },
    });
  },

  async setRegistrationToken(
    employeeId: number,
    data: { tokenHash: string; expiresAt: Date }
  ) {
    return prisma.employee.update({
      where: { id: employeeId },
      data: {
        registrationTokenHash: data.tokenHash,
        registrationTokenExpiresAt: data.expiresAt,
      },
    });
  },
};